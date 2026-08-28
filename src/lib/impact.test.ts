import { describe, it, expect } from 'vitest'
import type { Entity } from '@prisma/client'
import { diffTrackedFields, downstreamOf, neighboursOf, deletionImpact, Edge } from './impact'

// Helpers -------------------------------------------------------------

const layers: Record<string, number> = {}
function edge(from: string, to: string): Edge {
  return { fromEntityId: from, toEntityId: to, fromLayer: layers[from], toLayer: layers[to] }
}
function node(id: string, layer: number) {
  layers[id] = layer
  return id
}

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'e1',
    projectId: 'p1',
    type: 'user_job',
    layer: 1,
    title: 'Job',
    description: null,
    data: { a: 1 },
    positionX: 0,
    positionY: 0,
    tags: [],
    status: 'ACTIVE',
    version: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  }
}

// diffTrackedFields ----------------------------------------------------

describe('diffTrackedFields', () => {
  it('reports no change for identical entities', () => {
    const e = entity()
    expect(diffTrackedFields(e, { ...e }).changed).toEqual([])
  })

  it('ignores position, version and timestamps', () => {
    const before = entity()
    const after = entity({ positionX: 500, positionY: 20, version: 3, updatedAt: new Date(99) })
    expect(diffTrackedFields(before, after).changed).toEqual([])
  })

  it('reports each changed tracked field with old and new values', () => {
    const before = entity({ title: 'A', description: null })
    const after = entity({ title: 'B', description: 'now set' })
    const diff = diffTrackedFields(before, after)
    expect(diff.changed).toEqual(['title', 'description'])
    expect(diff.oldValues).toEqual({ title: 'A', description: null })
    expect(diff.newValues).toEqual({ title: 'B', description: 'now set' })
  })

  it('compares JSON columns structurally', () => {
    const before = entity({ data: { steps: ['a', 'b'] } })
    const same = entity({ data: { steps: ['a', 'b'] } })
    const different = entity({ data: { steps: ['a'] } })
    expect(diffTrackedFields(before, same).changed).toEqual([])
    expect(diffTrackedFields(before, different).changed).toEqual(['data'])
  })
})

// Graph walks ----------------------------------------------------------

describe('downstreamOf', () => {
  // L1: job            L2: spec, spec2       L3: flow        L4: screen
  const job = node('job', 1)
  const spec = node('spec', 2)
  const spec2 = node('spec2', 2)
  const flow = node('flow', 3)
  const screen = node('screen', 4)
  const other = node('other', 1)

  it('follows connections to higher layers transitively, nearest first', () => {
    const edges = [edge(job, spec), edge(spec, flow), edge(flow, screen)]
    expect(downstreamOf(job, edges)).toEqual([spec, flow, screen])
    expect(downstreamOf(flow, edges)).toEqual([screen])
    expect(downstreamOf(screen, edges)).toEqual([])
  })

  it('treats a connection drawn upward as a downward edge for the other end', () => {
    // User dragged from the spec to the job (DERIVES_FROM style)
    const edges = [edge(spec, job)]
    expect(downstreamOf(job, edges)).toEqual([spec])
    expect(downstreamOf(spec, edges)).toEqual([])
  })

  it('does not follow same-layer connections', () => {
    const edges = [edge(job, other), edge(spec, spec2)]
    expect(downstreamOf(job, edges)).toEqual([])
    expect(downstreamOf(spec, edges)).toEqual([])
  })

  it('does not walk upward', () => {
    const edges = [edge(job, spec), edge(spec, flow)]
    expect(downstreamOf(spec, edges)).toEqual([flow])
  })

  it('visits diamonds once and terminates on cycles', () => {
    // job -> spec -> flow, job -> spec2 -> flow, plus a nonsense upward edge flow -> job
    const edges = [edge(job, spec), edge(job, spec2), edge(spec, flow), edge(spec2, flow), edge(flow, job)]
    const result = downstreamOf(job, edges)
    expect(result.sort()).toEqual([flow, spec, spec2].sort())
    expect(new Set(result).size).toBe(result.length)
  })

  it('returns empty for an unknown or isolated id', () => {
    expect(downstreamOf('nope', [edge(job, spec)])).toEqual([])
  })
})

describe('neighboursOf', () => {
  const a = node('a', 1), b = node('b', 1), c = node('c', 2), d = node('d', 3)

  it('returns both ends regardless of direction and layer, without duplicates', () => {
    const edges = [edge(a, b), edge(c, a), edge(a, c), edge(c, d)]
    expect(neighboursOf(a, edges).sort()).toEqual([b, c])
    expect(neighboursOf(d, edges)).toEqual([c])
  })
})

describe('deletionImpact', () => {
  const job = node('job', 1), peer = node('peer', 1), spec = node('spec', 2), flow = node('flow', 3), up = node('up', 1)

  it('includes direct neighbours on any layer first, then the transitive downstream set', () => {
    // peer (same layer) — job — spec — flow, and a same-layer link from up to job
    const edges = [edge(job, peer), edge(job, spec), edge(spec, flow), edge(up, job)]
    const result = deletionImpact(job, edges)
    expect(result.slice(0, 3).sort()).toEqual([peer, spec, up].sort())
    expect(result[3]).toBe(flow)
    expect(new Set(result).size).toBe(4)
  })

  it('is empty for an isolated entity', () => {
    expect(deletionImpact(job, [edge(spec, flow)])).toEqual([])
  })
})
