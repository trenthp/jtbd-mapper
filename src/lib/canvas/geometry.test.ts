import { describe, it, expect } from 'vitest'
import type { EntityWithRelations } from '@/lib/types'
import {
  ENTITY_WIDTH,
  ENTITY_HEIGHT,
  entityHeight,
  entityCenter,
  getConnectionPointPosition,
  entitiesIntersectingRect,
  calculateSnapping,
  fitToEntities,
  stageToWorld,
  worldToStage,
} from './geometry'

function at(id: string, x: number, y: number): EntityWithRelations {
  // Only position and id are read by the geometry helpers
  return { id, positionX: x, positionY: y } as EntityWithRelations
}

describe('entityCenter / getConnectionPointPosition', () => {
  const e = at('e', 100, 200)

  it('centre is offset by half the entity size', () => {
    expect(entityCenter(e)).toEqual({ x: 100 + ENTITY_WIDTH / 2, y: 200 + ENTITY_HEIGHT / 2 })
  })

  it('anchors sit on the edge midpoints', () => {
    expect(getConnectionPointPosition(e, 'left')).toEqual({ x: 100, y: 260 })
    expect(getConnectionPointPosition(e, 'right')).toEqual({ x: 300, y: 260 })
    expect(getConnectionPointPosition(e, 'top')).toEqual({ x: 200, y: 200 })
    expect(getConnectionPointPosition(e, 'bottom')).toEqual({ x: 200, y: 320 })
  })

  it('unknown anchor falls back to the centre', () => {
    expect(getConnectionPointPosition(e, 'weird')).toEqual(entityCenter(e))
  })

  it('anchors follow the card height when the user has added fields', () => {
    const tall = { ...at('t', 100, 200), type: 'user_job', data: { jobStatement: 'x', priority: 'high', frequency: 'daily', userSegment: 's', successCriteria: ['a', 'b'] } }
    const h = entityHeight(tall)
    expect(h).toBeGreaterThan(ENTITY_HEIGHT)
    expect(getConnectionPointPosition(tall, 'bottom')).toEqual({ x: 200, y: 200 + h })
    expect(entityCenter(tall).y).toBe(200 + h / 2)
  })
})

describe('entitiesIntersectingRect', () => {
  const a = at('a', 0, 0)
  const b = at('b', 1000, 1000)
  const c = at('c', 150, 50) // overlaps a's right half

  it('selects entities whose box overlaps the rectangle, in either drag direction', () => {
    expect(entitiesIntersectingRect([a, b, c], { x: 10, y: 10 }, { x: 180, y: 60 }).sort()).toEqual(['a', 'c'])
    expect(entitiesIntersectingRect([a, b, c], { x: 180, y: 60 }, { x: 10, y: 10 }).sort()).toEqual(['a', 'c'])
  })

  it('does not select entities that merely touch the edge', () => {
    // rectangle ends exactly where a begins
    expect(entitiesIntersectingRect([a], { x: -50, y: -50 }, { x: 0, y: 0 })).toEqual([])
  })

  it('a zero-size rectangle selects nothing', () => {
    expect(entitiesIntersectingRect([a], { x: 10, y: 10 }, { x: 10, y: 10 })).toEqual([])
  })
})

describe('calculateSnapping', () => {
  const anchor = at('anchor', 400, 400)

  it('returns the input unchanged with no neighbours', () => {
    const r = calculateSnapping({ x: 13, y: 17 }, [], 10)
    expect(r.snappedPosition).toEqual({ x: 13, y: 17 })
    expect(r.guides).toEqual([])
  })

  it('snaps left edge to a neighbour left edge within the snap distance', () => {
    const r = calculateSnapping({ x: 406, y: 100 }, [anchor], 10)
    expect(r.snappedPosition.x).toBe(400)
    expect(r.snappedPosition.y).toBe(100)
    expect(r.guides).toEqual([{ id: 'guide-0', type: 'vertical', position: 400, entities: ['anchor'] }])
  })

  it('does not snap outside the snap distance', () => {
    const r = calculateSnapping({ x: 420, y: 100 }, [anchor], 10)
    expect(r.snappedPosition).toEqual({ x: 420, y: 100 })
    expect(r.guides).toEqual([])
  })

  it('snaps centres and edge-to-opposite-edge on both axes', () => {
    // centre-x aligned (400+100=500) and top-to-bottom (400+120=520)
    const r = calculateSnapping({ x: 500 - ENTITY_WIDTH / 2 + 3, y: 520 - 4 }, [anchor], 10)
    expect(r.snappedPosition).toEqual({ x: 400, y: 520 })
    expect(r.guides.map(g => g.type).sort()).toEqual(['horizontal', 'vertical'])
  })

  it('uses the dragged card\'s own height for bottom and centre snapping', () => {
    // anchor bottom is 520; a 200-high dragged card snaps its bottom there at y=320
    const r = calculateSnapping({ x: 100, y: 323 }, [anchor], 10, 200)
    expect(r.snappedPosition.y).toBe(320)
    expect(r.guides).toEqual([{ id: 'guide-0', type: 'horizontal', position: 520, entities: ['anchor'] }])
  })

  it('the nearest neighbour wins on each axis and only one guide per axis is emitted', () => {
    const other = at('other', 405, 800)
    // 402 is 2 from anchor (400) and 3 from other (405): anchor wins even though other is later
    const r = calculateSnapping({ x: 402, y: 100 }, [anchor, other], 10)
    expect(r.snappedPosition.x).toBe(400)
    expect(r.guides).toEqual([{ id: 'guide-0', type: 'vertical', position: 400, entities: ['anchor'] }])

    // 404 is 4 from anchor and 1 from other: other wins
    expect(calculateSnapping({ x: 404, y: 100 }, [anchor, other], 10).snappedPosition.x).toBe(405)
  })
})

describe('fitToEntities', () => {
  it('returns null for no entities', () => {
    expect(fitToEntities([], 800, 600)).toBeNull()
  })

  it('never zooms in beyond 1x and centres the content', () => {
    const fit = fitToEntities([at('a', 0, 0)], 800, 600)!
    expect(fit.scale).toBe(1)
    expect(fit.x).toBe(400)
    expect(fit.y).toBe(300)
  })

  it('zooms out to fit wide content', () => {
    const fit = fitToEntities([at('a', 0, 0), at('b', 4000, 0)], 800, 600)!
    expect(fit.scale).toBeLessThan(1)
    expect(fit.scale).toBeCloseTo(800 / 4400)
  })
})

describe('stageToWorld / worldToStage', () => {
  const stage = { x: () => 100, y: () => 50, scaleX: () => 2, scaleY: () => 2 } as unknown as import('konva').default.Stage

  it('are inverses', () => {
    const world = { x: 30, y: -10 }
    expect(stageToWorld(stage, worldToStage(stage, world))).toEqual(world)
    expect(stageToWorld(stage, { x: 100, y: 50 })).toEqual({ x: 0, y: 0 })
  })
})
