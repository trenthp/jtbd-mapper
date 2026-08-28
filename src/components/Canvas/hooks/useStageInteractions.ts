import { RefObject, useCallback, useEffect, useState } from 'react'
import Konva from 'konva'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'
import {
  entitiesIntersectingRect,
  entityCenter,
  getConnectionPointPosition,
  stageToWorld,
  Point,
} from '@/lib/canvas/geometry'
import { EntityWithRelations } from '@/lib/types'

interface Options {
  stageRef: RefObject<Konva.Stage | null>
  currentEntities: EntityWithRelations[]
  isEditing: boolean
  onCreateConnection: (fromEntityId: string, toEntityId: string) => void
}

/**
 * Pointer interactions on the stage and entities that are not drags:
 * selection (click, ctrl-click, rubber-band), connection mode with a preview
 * line and magnetic connection points, hover state, and spacebar panning.
 */
export function useStageInteractions({ stageRef, currentEntities, isEditing, onCreateConnection }: Options) {
  const [connectionPreview, setConnectionPreview] = useState<{ from: Point; to: Point } | null>(null)
  const [hoveredConnectionPoint, setHoveredConnectionPoint] = useState<{ entityId: string; point: string } | null>(null)
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null)

  const entities = useEntityStore(s => s.entities)
  const selectionState = useCanvasStore(s => s.selectionState)
  const connectionMode = useCanvasStore(s => s.connectionMode)
  const rectangleSelection = useCanvasStore(s => s.rectangleSelection)
  const dragState = useCanvasStore(s => s.dragState)
  const currentTool = useCanvasStore(s => s.currentTool)
  const isPanMode = useCanvasStore(s => s.isPanMode)
  const setSelectionState = useCanvasStore(s => s.setSelectionState)
  const setConnectionMode = useCanvasStore(s => s.setConnectionMode)
  const setRectangleSelection = useCanvasStore(s => s.setRectangleSelection)
  const setIsPanMode = useCanvasStore(s => s.setIsPanMode)

  const pointerWorldPos = useCallback((): Point | null => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    return stage && pointer ? stageToWorld(stage, pointer) : null
  }, [stageRef])

  const exitConnectionMode = useCallback(() => {
    setConnectionMode({ isActive: false, fromEntityId: undefined })
    setConnectionPreview(null)
  }, [setConnectionMode])

  // ---- spacebar pan mode ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditing && !e.repeat) {
        e.preventDefault()
        setIsPanMode(true)
        document.body.style.cursor = 'grab'
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isEditing) {
        e.preventDefault()
        setIsPanMode(false)
        document.body.style.cursor = 'default'
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      document.body.style.cursor = 'default'
    }
  }, [isEditing, setIsPanMode])

  // ---- entity click / connection mode ----
  const handleEntityClick = useCallback((entityId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    const multiSelect = e.evt.ctrlKey || e.evt.metaKey

    if (connectionMode.isActive) {
      if (connectionMode.fromEntityId && connectionMode.fromEntityId !== entityId) {
        onCreateConnection(connectionMode.fromEntityId, entityId)
        exitConnectionMode()
      } else {
        setConnectionMode({ fromEntityId: entityId })
      }
      return
    }

    const selected = multiSelect ? new Set(selectionState.selectedEntities) : new Set<string>()
    if (selected.has(entityId)) selected.delete(entityId)
    else selected.add(entityId)
    setSelectionState({
      selectedEntities: selected,
      selectedConnections: multiSelect ? selectionState.selectedConnections : new Set(),
    })
  }, [connectionMode, selectionState, onCreateConnection, exitConnectionMode, setConnectionMode, setSelectionState])

  const handleConnectionClick = useCallback((connectionId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    const multiSelect = e.evt.ctrlKey || e.evt.metaKey
    const selected = multiSelect ? new Set(selectionState.selectedConnections) : new Set<string>()
    if (selected.has(connectionId)) selected.delete(connectionId)
    else selected.add(connectionId)
    setSelectionState({
      selectedConnections: selected,
      selectedEntities: multiSelect ? selectionState.selectedEntities : new Set(),
    })
  }, [selectionState, setSelectionState])

  // ---- connection points (magnetic preview) ----
  const handleConnectionPointHover = useCallback((entityId: string, point: string) => {
    if (!connectionMode.isActive || connectionMode.fromEntityId === entityId) return
    setHoveredConnectionPoint({ entityId, point })
    const target = entities.get(entityId)
    const from = connectionMode.fromEntityId ? entities.get(connectionMode.fromEntityId) : undefined
    if (target && from) {
      setConnectionPreview({ from: entityCenter(from), to: getConnectionPointPosition(target, point) })
    }
  }, [connectionMode, entities])

  const handleConnectionPointLeave = useCallback(() => setHoveredConnectionPoint(null), [])
  const handleEntityHover = useCallback((entityId: string) => setHoveredEntityId(entityId), [])
  const handleEntityHoverLeave = useCallback(() => setHoveredEntityId(null), [])

  // ---- stage background ----
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    if (connectionMode.isActive) exitConnectionMode()
    else if (!rectangleSelection.isActive) {
      setSelectionState({ selectedEntities: new Set(), selectedConnections: new Set() })
    }
  }, [stageRef, connectionMode.isActive, rectangleSelection.isActive, exitConnectionMode, setSelectionState])

  const handleStageMouseMove = useCallback(() => {
    const world = pointerWorldPos()
    if (!world) return
    if (connectionMode.isActive && connectionMode.fromEntityId) {
      const from = entities.get(connectionMode.fromEntityId)
      if (from) setConnectionPreview({ from: entityCenter(from), to: world })
    } else if (rectangleSelection.isActive && rectangleSelection.startPosition) {
      setRectangleSelection({ currentPosition: world })
    }
  }, [pointerWorldPos, connectionMode, entities, rectangleSelection, setRectangleSelection])

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const panning = isPanMode || currentTool.type === 'pan' || e.evt.button === 1
    if (panning) {
      document.body.style.cursor = 'grabbing'
      return
    }
    const onBackground = e.target === stageRef.current
    if (onBackground && !connectionMode.isActive && !dragState.isDragging && currentTool.type === 'select') {
      const world = pointerWorldPos()
      if (world) setRectangleSelection({ isActive: true, startPosition: world, currentPosition: world })
    }
  }, [isPanMode, currentTool.type, stageRef, connectionMode.isActive, dragState.isDragging, pointerWorldPos, setRectangleSelection])

  const handleStageMouseUp = useCallback(() => {
    document.body.style.cursor = isPanMode || currentTool.type === 'pan' ? 'grab' : 'default'
    const { isActive, startPosition, currentPosition } = rectangleSelection
    if (isActive && startPosition && currentPosition) {
      setSelectionState({
        selectedEntities: new Set(entitiesIntersectingRect(currentEntities, startPosition, currentPosition)),
        selectedConnections: new Set(),
      })
      setRectangleSelection({ isActive: false, startPosition: undefined, currentPosition: undefined })
    }
  }, [isPanMode, currentTool.type, rectangleSelection, currentEntities, setSelectionState, setRectangleSelection])

  const handleStageContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault()
    // TODO: context menu for creating entities at pointerWorldPos()
  }, [])

  return {
    connectionPreview,
    hoveredConnectionPoint,
    hoveredEntityId,
    handleEntityClick,
    handleConnectionClick,
    handleConnectionPointHover,
    handleConnectionPointLeave,
    handleEntityHover,
    handleEntityHoverLeave,
    handleStageClick,
    handleStageMouseMove,
    handleStageMouseDown,
    handleStageMouseUp,
    handleStageContextMenu,
  }
}
