// Pure geometry helpers for the canvas. No React, no stores — easy to test.
import type Konva from 'konva'
import { EntityWithRelations, SnapGuide } from '@/lib/types'

export const ENTITY_WIDTH = 200
export const ENTITY_HEIGHT = 120

export interface Point {
  x: number
  y: number
}

/** Convert a pointer position in stage (screen) pixels to world coordinates. */
export function stageToWorld(stage: Konva.Stage, pointer: Point): Point {
  return {
    x: (pointer.x - stage.x()) / stage.scaleX(),
    y: (pointer.y - stage.y()) / stage.scaleY(),
  }
}

/** Convert a world coordinate to stage (screen) pixels. */
export function worldToStage(stage: Konva.Stage, world: Point): Point {
  return {
    x: world.x * stage.scaleX() + stage.x(),
    y: world.y * stage.scaleY() + stage.y(),
  }
}

export function entityCenter(entity: { positionX: number; positionY: number }): Point {
  return { x: entity.positionX + ENTITY_WIDTH / 2, y: entity.positionY + ENTITY_HEIGHT / 2 }
}

export type ConnectionPoint = 'left' | 'right' | 'top' | 'bottom' | string

export function getConnectionPointPosition(entity: EntityWithRelations, point: ConnectionPoint): Point {
  switch (point) {
    case 'left':
      return { x: entity.positionX, y: entity.positionY + ENTITY_HEIGHT / 2 }
    case 'right':
      return { x: entity.positionX + ENTITY_WIDTH, y: entity.positionY + ENTITY_HEIGHT / 2 }
    case 'top':
      return { x: entity.positionX + ENTITY_WIDTH / 2, y: entity.positionY }
    case 'bottom':
      return { x: entity.positionX + ENTITY_WIDTH / 2, y: entity.positionY + ENTITY_HEIGHT }
    default:
      return entityCenter(entity)
  }
}

/** IDs of entities whose bounding box intersects the rectangle spanned by a and b. */
export function entitiesIntersectingRect(
  entities: EntityWithRelations[],
  a: Point,
  b: Point
): string[] {
  const left = Math.min(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const right = Math.max(a.x, b.x)
  const bottom = Math.max(a.y, b.y)
  // A click without movement is not a rubber-band selection
  if (right === left || bottom === top) return []
  return entities
    .filter(e =>
      e.positionX < right &&
      e.positionX + ENTITY_WIDTH > left &&
      e.positionY < bottom &&
      e.positionY + ENTITY_HEIGHT > top
    )
    .map(e => e.id)
}

export interface SnapResult {
  snappedPosition: Point
  guides: SnapGuide[]
}

/**
 * Snap `position` (top-left of the dragged entity) to the edges and centres
 * of `others` when within `snapDistance`. On each axis the nearest
 * candidate wins; ties go to the earlier entity.
 */
export function calculateSnapping(
  position: Point,
  others: EntityWithRelations[],
  snapDistance: number
): SnapResult {
  let snappedX = position.x
  let snappedY = position.y
  let bestDx = snapDistance
  let bestDy = snapDistance
  let guideX: Omit<SnapGuide, 'id'> | null = null
  let guideY: Omit<SnapGuide, 'id'> | null = null

  const dragged = {
    left: position.x,
    right: position.x + ENTITY_WIDTH,
    top: position.y,
    bottom: position.y + ENTITY_HEIGHT,
    centerX: position.x + ENTITY_WIDTH / 2,
    centerY: position.y + ENTITY_HEIGHT / 2,
  }

  // Each candidate: [dragged edge, target edge, resulting x/y for the entity's top-left]
  for (const entity of others) {
    const left = entity.positionX
    const right = entity.positionX + ENTITY_WIDTH
    const centerX = entity.positionX + ENTITY_WIDTH / 2
    const candidates: Array<[number, number, number]> = [
      [dragged.left, left, left],
      [dragged.right, right, right - ENTITY_WIDTH],
      [dragged.centerX, centerX, centerX - ENTITY_WIDTH / 2],
      [dragged.left, right, right],
      [dragged.right, left, left - ENTITY_WIDTH],
    ]
    for (const [from, to, result] of candidates) {
      const d = Math.abs(from - to)
      if (d < bestDx) {
        bestDx = d
        snappedX = result
        guideX = { type: 'vertical', position: to, entities: [entity.id] }
      }
    }
  }

  for (const entity of others) {
    const top = entity.positionY
    const bottom = entity.positionY + ENTITY_HEIGHT
    const centerY = entity.positionY + ENTITY_HEIGHT / 2
    const candidates: Array<[number, number, number]> = [
      [dragged.top, top, top],
      [dragged.bottom, bottom, bottom - ENTITY_HEIGHT],
      [dragged.centerY, centerY, centerY - ENTITY_HEIGHT / 2],
      [dragged.top, bottom, bottom],
      [dragged.bottom, top, top - ENTITY_HEIGHT],
    ]
    for (const [from, to, result] of candidates) {
      const d = Math.abs(from - to)
      if (d < bestDy) {
        bestDy = d
        snappedY = result
        guideY = { type: 'horizontal', position: to, entities: [entity.id] }
      }
    }
  }

  const guides = [guideX, guideY]
    .filter((g): g is Omit<SnapGuide, 'id'> => g !== null)
    .map((g, i) => ({ ...g, id: `guide-${i}` }))
  return { snappedPosition: { x: snappedX, y: snappedY }, guides }
}

/** Bounding box + zoom/offset that fits all entities into a width×height view. */
export function fitToEntities(
  entities: Array<{ positionX: number; positionY: number }>,
  width: number,
  height: number,
  padding = 400
): { scale: number; x: number; y: number } | null {
  if (entities.length === 0) return null
  const xs = entities.map(e => e.positionX)
  const ys = entities.map(e => e.positionY)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const scale = Math.min(width / (maxX - minX + padding), height / (maxY - minY + padding), 1)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  return { scale, x: -centerX * scale + width / 2, y: -centerY * scale + height / 2 }
}
