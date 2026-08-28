import { useCallback, useRef, useState } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'
import { moveEntities, EntityMove } from '@/lib/commands'
import { calculateSnapping, Point } from '@/lib/canvas/geometry'
import { snapToGrid } from '../CanvasGrid'
import { EntityWithRelations } from '@/lib/types'

interface Options {
  currentEntities: EntityWithRelations[]
  editingEntityId?: string
  /** Called once when Alt is first held during a drag (Alt+drag duplicate). */
  onAltDragStart: (entityId: string) => void
}

/**
 * Drag handling for entity nodes: group drag of the whole selection, grid and
 * alignment snapping, and a single undoable move on drop.
 */
export function useEntityDrag({ currentEntities, editingEntityId, onAltDragStart }: Options) {
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null)
  const altDuplicated = useRef(false)
  // Offsets of every other selected entity relative to the dragged one
  const groupOffsets = useRef<Map<string, Point>>(new Map())
  // Start positions of every entity in the group, for undo
  const startPositions = useRef<Map<string, Point>>(new Map())

  const entities = useEntityStore(s => s.entities)
  const updateEntity = useEntityStore(s => s.updateEntity)
  const selectionState = useCanvasStore(s => s.selectionState)
  const connectionMode = useCanvasStore(s => s.connectionMode)
  const snappingState = useCanvasStore(s => s.snappingState)
  const gridSettings = useCanvasStore(s => s.gridSettings)
  const setSelectionState = useCanvasStore(s => s.setSelectionState)
  const setDragState = useCanvasStore(s => s.setDragState)
  const setSnappingState = useCanvasStore(s => s.setSnappingState)

  const snap = useCallback((entityId: string, position: Point) => {
    let p = position
    if (gridSettings.snapToGrid && gridSettings.isVisible) {
      p = snapToGrid(p, gridSettings.gridSize)
    }
    if (snappingState.isEnabled) {
      const others = currentEntities.filter(e => e.id !== entityId)
      return calculateSnapping(p, others, snappingState.snapDistance)
    }
    return { snappedPosition: p, guides: [] }
  }, [gridSettings, snappingState.isEnabled, snappingState.snapDistance, currentEntities])

  const reset = useCallback(() => {
    setDragState({ isDragging: false, entityId: undefined })
    setSnappingState({ activeGuides: [], snapPosition: undefined })
    setDraggedEntityId(null)
    altDuplicated.current = false
    groupOffsets.current = new Map()
    startPositions.current = new Map()
  }, [setDragState, setSnappingState])

  const handleDragStart = useCallback((entityId: string): boolean => {
    if (editingEntityId === entityId || connectionMode.isActive) return false

    const dragged = entities.get(entityId)
    if (!dragged) return false

    // Dragging an unselected entity selects only it
    const selected = selectionState.selectedEntities.has(entityId)
      ? selectionState.selectedEntities
      : new Set([entityId])
    if (!selectionState.selectedEntities.has(entityId)) {
      setSelectionState({ selectedEntities: selected, selectedConnections: new Set() })
    }

    const offsets = new Map<string, Point>()
    const starts = new Map<string, Point>()
    starts.set(entityId, { x: dragged.positionX, y: dragged.positionY })
    selected.forEach(id => {
      const e = entities.get(id)
      if (e && id !== entityId) {
        offsets.set(id, { x: e.positionX - dragged.positionX, y: e.positionY - dragged.positionY })
        starts.set(id, { x: e.positionX, y: e.positionY })
      }
    })
    groupOffsets.current = offsets
    startPositions.current = starts
    altDuplicated.current = false

    setDraggedEntityId(entityId)
    setDragState({ isDragging: true, entityId, startPosition: { x: 0, y: 0 } })
    return true
  }, [editingEntityId, connectionMode.isActive, entities, selectionState.selectedEntities, setSelectionState, setDragState])

  const handleDrag = useCallback((entityId: string, position: Point, altKey = false) => {
    if (altKey && !altDuplicated.current) {
      altDuplicated.current = true
      onAltDragStart(entityId)
    }

    const { snappedPosition, guides } = snap(entityId, position)
    setSnappingState({ activeGuides: guides, snapPosition: snappedPosition })

    updateEntity(entityId, { positionX: snappedPosition.x, positionY: snappedPosition.y })
    groupOffsets.current.forEach((offset, id) => {
      updateEntity(id, { positionX: snappedPosition.x + offset.x, positionY: snappedPosition.y + offset.y })
    })
  }, [snap, setSnappingState, updateEntity, onAltDragStart])

  const handleDragEnd = useCallback((entityId: string, position: Point) => {
    if (editingEntityId === entityId) {
      reset()
      return
    }

    const { snappedPosition } = snap(entityId, position)
    const moves: EntityMove[] = []
    const from = startPositions.current.get(entityId)
    if (from) moves.push({ id: entityId, from, to: snappedPosition })
    groupOffsets.current.forEach((offset, id) => {
      const start = startPositions.current.get(id)
      if (start && entities.has(id)) {
        moves.push({ id, from: start, to: { x: snappedPosition.x + offset.x, y: snappedPosition.y + offset.y } })
      }
    })
    moveEntities(moves).catch(error => console.error('Failed to save entity positions:', error))
    reset()
  }, [editingEntityId, snap, entities, reset])

  return { draggedEntityId, handleDragStart, handleDrag, handleDragEnd }
}
