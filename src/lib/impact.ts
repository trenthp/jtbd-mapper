// Pure impact-analysis helpers shared by the server (reconciliation.ts) and
// the client (ReviewPanel). No Prisma, no React.
import type { Entity } from '@prisma/client'

/** The subset of a connection needed for graph walks. */
export interface Edge {
  fromEntityId: string
  toEntityId: string
  fromLayer: number
  toLayer: number
}

/** Entity fields whose change counts as a content change (not layout). */
export const TRACKED_FIELDS = ['title', 'description', 'data', 'tags', 'status', 'type'] as const
export type TrackedField = (typeof TRACKED_FIELDS)[number]

export interface FieldDiff {
  changed: TrackedField[]
  oldValues: Record<string, unknown>
  newValues: Record<string, unknown>
}

export function diffTrackedFields(before: Entity, after: Entity): FieldDiff {
  const changed: TrackedField[] = []
  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}
  for (const field of TRACKED_FIELDS) {
    if (JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null)) {
      changed.push(field)
      oldValues[field] = before[field]
      newValues[field] = after[field]
    }
  }
  return { changed, oldValues, newValues }
}

/**
 * Adjacency of "downward" edges: from an entity to connected entities on a
 * strictly higher layer, regardless of which end the connection was drawn
 * from.
 */
function downwardAdjacency(edges: Edge[]): Map<string, string[]> {
  const next = new Map<string, string[]>()
  const add = (from: string, to: string) => next.set(from, [...(next.get(from) ?? []), to])
  for (const e of edges) {
    if (e.toLayer > e.fromLayer) add(e.fromEntityId, e.toEntityId)
    else if (e.fromLayer > e.toLayer) add(e.toEntityId, e.fromEntityId)
  }
  return next
}

/**
 * IDs reachable from `rootId` by following connections to higher layers,
 * transitively, in breadth-first order (nearest first). Excludes the root.
 * Safe on cycles.
 */
export function downstreamOf(rootId: string, edges: Edge[]): string[] {
  const next = downwardAdjacency(edges)
  const seen = new Set([rootId])
  const order: string[] = []
  const queue = [rootId]
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
  return order
}

/** IDs directly connected to `id` in either direction, on any layer. */
export function neighboursOf(id: string, edges: Edge[]): string[] {
  const out = new Set<string>()
  for (const e of edges) {
    if (e.fromEntityId === id) out.add(e.toEntityId)
    else if (e.toEntityId === id) out.add(e.fromEntityId)
  }
  out.delete(id)
  return Array.from(out)
}

/**
 * Everything that should be reviewed when `id` is deleted: its direct
 * neighbours (they lose a link, whichever way it pointed) plus everything
 * downstream of it. Direct neighbours come first.
 */
export function deletionImpact(id: string, edges: Edge[]): string[] {
  const direct = neighboursOf(id, edges)
  const seen = new Set(direct)
  const rest = downstreamOf(id, edges).filter(x => !seen.has(x))
  return [...direct, ...rest]
}
