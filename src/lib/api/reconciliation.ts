// Change tracking and downstream impact analysis.
//
// When an entity's content changes we record a ChangeEvent, walk the
// connection graph to entities on higher (more concrete) layers, and flag
// each of them DOWNSTREAM_IMPACT until someone reviews them. Deleting an
// entity flags its direct neighbours and its downstream set. A
// ReconciliationStatus row exists only while an entity is flagged; no row
// means SYNCED.
import { prisma } from '@/lib/prisma'
import { Entity, Prisma, ReconciliationStatus } from '@prisma/client'
import { diffTrackedFields, downstreamOf, deletionImpact } from '@/lib/impact'

export type ReconciliationStatusWithEntities = ReconciliationStatus & {
  entity: Entity
  triggeredByEntity: Entity | null
}

const statusInclude = { entity: true, triggeredByEntity: true } as const

async function projectEdges(projectId: string) {
  return prisma.layerConnection.findMany({
    where: { projectId },
    select: { fromEntityId: true, toEntityId: true, fromLayer: true, toLayer: true },
  })
}

/** Entities in BFS order for a list of ids (ids not found are dropped). */
async function entitiesInOrder(ids: string[]): Promise<Entity[]> {
  if (ids.length === 0) return []
  const rows = await prisma.entity.findMany({ where: { id: { in: ids } } })
  const byId = new Map(rows.map(e => [e.id, e]))
  return ids.map(id => byId.get(id)).filter((e): e is Entity => !!e)
}

/** Entities reachable from `entityId` through connections to higher layers. */
export async function findDownstreamEntities(entityId: string): Promise<Entity[]> {
  const root = await prisma.entity.findUnique({ where: { id: entityId } })
  if (!root) return []
  return entitiesInOrder(downstreamOf(root.id, await projectEdges(root.projectId)))
}

async function flag(
  entityIds: string[],
  reason: string,
  triggeredBy: string | null
): Promise<ReconciliationStatusWithEntities[]> {
  const affected: ReconciliationStatusWithEntities[] = []
  for (const entityId of entityIds) {
    affected.push(await prisma.reconciliationStatus.upsert({
      where: { entityId },
      create: { entityId, state: 'DOWNSTREAM_IMPACT', triggeredBy, reason },
      update: {
        state: 'DOWNSTREAM_IMPACT',
        triggeredBy,
        triggeredAt: new Date(),
        reason,
        reviewedBy: null,
        reviewedAt: null,
      },
      include: statusInclude,
    }))
  }
  return affected
}

/**
 * Record a content change on `after` (compared with `before`) and flag every
 * downstream entity. Returns the statuses that were created or updated.
 * Editing an entity also clears its own flag: the author has looked at it.
 */
export async function recordEntityChange(
  before: Entity,
  after: Entity,
  userId: string
): Promise<{ affected: ReconciliationStatusWithEntities[]; cleared: boolean }> {
  const { changed, oldValues, newValues } = diffTrackedFields(before, after)

  // Layout-only updates (drags) are not changes
  if (changed.length === 0) return { affected: [], cleared: false }

  // Editing a flagged entity resolves its own flag: the author has looked at it
  const cleared = await clearStatus(after.id)

  const downstream = await findDownstreamEntities(after.id)
  const reason = `"${after.title}" changed (${changed.join(', ')})`

  await prisma.changeEvent.create({
    data: {
      entityId: after.id,
      entityType: after.type,
      changeType: 'UPDATE',
      changedFields: changed,
      oldValues: oldValues as Prisma.InputJsonValue,
      newValues: newValues as Prisma.InputJsonValue,
      userId,
      impactAnalysis: {
        create: {
          affectedEntities: downstream.map(e => ({ id: e.id, title: e.title, layer: e.layer })),
          processed: true,
        },
      },
    },
  })

  return { affected: await flag(downstream.map(e => e.id), reason, after.id), cleared }
}

/**
 * Work out what a deletion affects. Call BEFORE deleting (the connections
 * are needed), then pass the result to `flagDeletionImpact` afterwards.
 */
export async function planDeletionImpact(entity: Entity): Promise<{ entityIds: string[]; reason: string }> {
  const edges = await projectEdges(entity.projectId)
  return {
    entityIds: deletionImpact(entity.id, edges),
    reason: `"${entity.title}" was deleted`,
  }
}

/**
 * Flag the entities from `planDeletionImpact`. The deleted entity no longer
 * exists so nothing can point at it: triggeredBy is null and the reason text
 * carries the name. (ChangeEvent rows cascade with their entity, so the
 * deletion itself is not stored.)
 */
export async function flagDeletionImpact(plan: { entityIds: string[]; reason: string }) {
  const existing = await entitiesInOrder(plan.entityIds)
  return flag(existing.map(e => e.id), plan.reason, null)
}

/** Remove an entity's flag. Returns true if there was one. */
export async function clearStatus(entityId: string): Promise<boolean> {
  const result = await prisma.reconciliationStatus.deleteMany({ where: { entityId } })
  return result.count > 0
}

/** All flagged entities in a project, most recently triggered first. */
export async function getProjectStatuses(projectId: string): Promise<ReconciliationStatusWithEntities[]> {
  return prisma.reconciliationStatus.findMany({
    where: { entity: { projectId } },
    include: statusInclude,
    orderBy: { triggeredAt: 'desc' },
  })
}
