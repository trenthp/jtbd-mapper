// Change tracking and downstream impact analysis.
//
// When an entity's content changes we record a ChangeEvent, walk the
// connection graph to entities on higher (more concrete) layers, and flag
// each of them DOWNSTREAM_IMPACT until someone reviews them. A
// ReconciliationStatus row exists only while an entity is flagged; no row
// means SYNCED.
import { prisma } from '@/lib/prisma'
import { Entity, Prisma, ReconciliationStatus } from '@prisma/client'

/** Entity fields whose change counts as a content change (not layout). */
export const TRACKED_FIELDS = ['title', 'description', 'data', 'tags', 'status', 'type'] as const
export type TrackedField = (typeof TRACKED_FIELDS)[number]

export function diffTrackedFields(
  before: Entity,
  after: Entity
): { changed: TrackedField[]; oldValues: Record<string, unknown>; newValues: Record<string, unknown> } {
  const changed: TrackedField[] = []
  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}
  for (const field of TRACKED_FIELDS) {
    const a = JSON.stringify(before[field] ?? null)
    const b = JSON.stringify(after[field] ?? null)
    if (a !== b) {
      changed.push(field)
      oldValues[field] = before[field]
      newValues[field] = after[field]
    }
  }
  return { changed, oldValues, newValues }
}

export type ReconciliationStatusWithEntities = ReconciliationStatus & {
  entity: Entity
  triggeredByEntity: Entity | null
}

const statusInclude = { entity: true, triggeredByEntity: true } as const

/**
 * Entities reachable from `entityId` by following connections to strictly
 * higher layers, transitively. Returns them in BFS order (nearest first).
 */
export async function findDownstreamEntities(entityId: string): Promise<Entity[]> {
  const root = await prisma.entity.findUnique({ where: { id: entityId } })
  if (!root) return []

  const connections = await prisma.layerConnection.findMany({
    where: { projectId: root.projectId },
    select: { fromEntityId: true, toEntityId: true, fromLayer: true, toLayer: true },
  })

  // Adjacency restricted to edges that go "down" (to a higher layer number)
  const next = new Map<string, string[]>()
  for (const c of connections) {
    if (c.toLayer > c.fromLayer) next.set(c.fromEntityId, [...(next.get(c.fromEntityId) ?? []), c.toEntityId])
    else if (c.fromLayer > c.toLayer) next.set(c.toEntityId, [...(next.get(c.toEntityId) ?? []), c.fromEntityId])
  }

  const seen = new Set<string>([root.id])
  const order: string[] = []
  const queue = [root.id]
  while (queue.length) {
    const id = queue.shift()!
    for (const n of next.get(id) ?? []) {
      if (!seen.has(n)) {
        seen.add(n)
        order.push(n)
        queue.push(n)
      }
    }
  }
  if (order.length === 0) return []

  const entities = await prisma.entity.findMany({ where: { id: { in: order } } })
  const byId = new Map(entities.map(e => [e.id, e]))
  return order.map(id => byId.get(id)).filter((e): e is Entity => !!e)
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
  const fieldList = changed.join(', ')
  const reason = `"${after.title}" changed (${fieldList})`

  const event = await prisma.changeEvent.create({
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
  void event

  const affected: ReconciliationStatusWithEntities[] = []
  for (const entity of downstream) {
    const status = await prisma.reconciliationStatus.upsert({
      where: { entityId: entity.id },
      create: {
        entityId: entity.id,
        state: 'DOWNSTREAM_IMPACT',
        triggeredBy: after.id,
        reason,
      },
      update: {
        state: 'DOWNSTREAM_IMPACT',
        triggeredBy: after.id,
        triggeredAt: new Date(),
        reason,
        reviewedBy: null,
        reviewedAt: null,
      },
      include: statusInclude,
    })
    affected.push(status)
  }

  return { affected, cleared }
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
