'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Stage, Layer, Group, Line, Rect } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useClipboard } from '@/hooks/useClipboard'
import { EntityNode } from './EntityNode'
import { ConnectionPath } from './ConnectionPath'
import { InlineEntityEditor } from './InlineEntityEditor'
import { CanvasGrid, snapToGrid } from './CanvasGrid'
import { ReconciliationState } from '@prisma/client'
import { EntityWithRelations } from '@/lib/types'

// Simple debounce function outside component to prevent recreating on every render
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

interface LayerCanvasProps {
  width: number
  height: number
  layer: number
  onCreateConnection?: (fromEntityId: string, toEntityId: string) => void
  onNavigateToEntity?: (entityId: string) => void
}

export function LayerCanvas({ width, height, layer, onCreateConnection, onNavigateToEntity }: LayerCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const [stageScale, setStageScale] = useState(1)
  const [editingEntity, setEditingEntity] = useState<EntityWithRelations | null>(null)
  const [editingPosition, setEditingPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [connectionPreview, setConnectionPreview] = useState<{
    from: { x: number, y: number }
    to: { x: number, y: number }
  } | null>(null)
  const [hoveredConnectionPoint, setHoveredConnectionPoint] = useState<{
    entityId: string
    point: string
  } | null>(null)
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null)
  const [isDuplicatingDrag, setIsDuplicatingDrag] = useState(false)
  const [originalEntityPosition, setOriginalEntityPosition] = useState<{ x: number, y: number } | null>(null)
  const [groupDragOffsets, setGroupDragOffsets] = useState<Map<string, { x: number, y: number }>>(new Map())
  
  const {
    viewport,
    dragState,
    selectionState,
    connectionMode,
    rectangleSelection,
    snappingState,
    gridSettings,
    currentTool,
    isPanMode,
    setViewport,
    setDragState,
    setSelectionState,
    setConnectionMode,
    setRectangleSelection,
    setSnappingState,
    setCurrentTool,
    setIsPanMode,
    selectEntity,
    selectConnection,
    clearSelection,
    zoomToFit
  } = useCanvasStore()

  const {
    entities,
    connections,
    reconciliationStates,
    removeEntities,
    removeConnections
  } = useEntityStore()

  // Clipboard functionality
  const { copy, paste, duplicate, canPaste } = useClipboard()
  
  // Create a stable debounced position save function
  const saveEntityPosition = useCallback(
    debounce(async (entityId: string, position: { x: number, y: number }) => {
      // Don't try to save temporary entities
      if (entityId.includes('-copy-') || entityId.includes('paste-')) {
        return
      }

      try {
        const response = await fetch(`/api/entities/${entityId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionX: position.x,
            positionY: position.y
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update entity position')
        }
      } catch (error) {
        console.error('Failed to save entity position:', error)
      }
    }, 500),
    []
  )

  // Memoize filtered entities and connections for better performance
  const currentLayerEntities = useMemo(() =>
    Array.from(entities.values()).filter(entity => entity.layer === layer),
    [entities, layer]
  )
  const belowLayerEntities = useMemo(() =>
    Array.from(entities.values()).filter(entity => entity.layer === layer - 1),
    [entities, layer]
  )
  const aboveLayerEntities = useMemo(() =>
    Array.from(entities.values()).filter(entity => entity.layer === layer + 1),
    [entities, layer]
  )

  const currentLayerConnections = useMemo(() =>
    Array.from(connections.values()).filter(
      connection => connection.fromLayer === layer || connection.toLayer === layer
    ), [connections, layer]
  )
  const belowLayerConnections = useMemo(() =>
    Array.from(connections.values()).filter(
      connection => (connection.fromLayer === layer - 1 || connection.toLayer === layer - 1) &&
      !(connection.fromLayer === layer || connection.toLayer === layer)
    ), [connections, layer]
  )
  const aboveLayerConnections = useMemo(() =>
    Array.from(connections.values()).filter(
      connection => (connection.fromLayer === layer + 1 || connection.toLayer === layer + 1) &&
      !(connection.fromLayer === layer || connection.toLayer === layer)
    ), [connections, layer]
  )

  // Keyboard shortcut handlers
  const handleDelete = useCallback(async () => {
    const selectedEntityIds = Array.from(selectionState.selectedEntities)
    const selectedConnectionIds = Array.from(selectionState.selectedConnections)

    if (selectedEntityIds.length === 0 && selectedConnectionIds.length === 0) {
      return
    }

    // Delete entities via API
    if (selectedEntityIds.length > 0) {
      try {
        await Promise.all(
          selectedEntityIds.map(entityId =>
            fetch(`/api/entities/${entityId}`, { method: 'DELETE' })
          )
        )
        removeEntities(selectedEntityIds)
      } catch (error) {
        console.error('Failed to delete entities:', error)
      }
    }

    // Delete connections via API
    if (selectedConnectionIds.length > 0) {
      try {
        await Promise.all(
          selectedConnectionIds.map(connectionId =>
            fetch(`/api/connections/${connectionId}`, { method: 'DELETE' })
          )
        )
        removeConnections(selectedConnectionIds)
      } catch (error) {
        console.error('Failed to delete connections:', error)
      }
    }

    clearSelection()
  }, [selectionState, removeEntities, removeConnections, clearSelection])

  const handleCopy = useCallback(() => {
    return copy()
  }, [copy])

  const handlePaste = useCallback(() => {
    // Paste at center of current viewport
    const pastePosition = {
      x: (-viewport.x + width / 2) / stageScale - 100,
      y: (-viewport.y + height / 2) / stageScale - 60
    }
    return paste(pastePosition)
  }, [paste, viewport, width, height, stageScale])

  const handleDuplicate = useCallback(() => {
    return duplicate()
  }, [duplicate])

  const handleSelectAll = useCallback(() => {
    const layerEntityIds = currentLayerEntities.map(entity => entity.id)
    const layerConnectionIds = currentLayerConnections.map(connection => connection.id)

    setSelectionState({
      selectedEntities: new Set(layerEntityIds),
      selectedConnections: new Set(layerConnectionIds)
    })
  }, [currentLayerEntities, currentLayerConnections, setSelectionState])

  const handleZoomIn = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const currentScale = stage.scaleX()
    const newScale = Math.min(currentScale * 1.2, 3)

    // Center zoom on viewport center
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2

    const mousePointTo = {
      x: (centerX - stage.x()) / currentScale,
      y: (centerY - stage.y()) / currentScale,
    }

    const newPos = {
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
    }

    const tween = new Konva.Tween({
      node: stage,
      duration: 0.2,
      easing: Konva.Easings.EaseOut,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      onUpdate: () => setStageScale(stage.scaleX()),
      onFinish: () => setViewport({ x: stage.x(), y: stage.y(), zoom: stage.scaleX() })
    })

    tween.play()
  }, [setViewport])

  const handleZoomOut = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const currentScale = stage.scaleX()
    const newScale = Math.max(currentScale / 1.2, 0.1)

    // Center zoom on viewport center
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2

    const mousePointTo = {
      x: (centerX - stage.x()) / currentScale,
      y: (centerY - stage.y()) / currentScale,
    }

    const newPos = {
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
    }

    const tween = new Konva.Tween({
      node: stage,
      duration: 0.2,
      easing: Konva.Easings.EaseOut,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      onUpdate: () => setStageScale(stage.scaleX()),
      onFinish: () => setViewport({ x: stage.x(), y: stage.y(), zoom: stage.scaleX() })
    })

    tween.play()
  }, [setViewport])

  const handleZoomToFit = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    const allEntities = Array.from(entities.values())
    if (allEntities.length === 0) return

    // Calculate bounding box of all entities
    const minX = Math.min(...allEntities.map(e => e.positionX))
    const maxX = Math.max(...allEntities.map(e => e.positionX))
    const minY = Math.min(...allEntities.map(e => e.positionY))
    const maxY = Math.max(...allEntities.map(e => e.positionY))

    const contentWidth = maxX - minX + 400 // padding
    const contentHeight = maxY - minY + 400 // padding

    const scaleX = width / contentWidth
    const scaleY = height / contentHeight
    const newScale = Math.min(scaleX, scaleY, 1) // don't zoom in beyond 1x

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    const newPos = {
      x: -centerX * newScale + width / 2,
      y: -centerY * newScale + height / 2
    }

    const tween = new Konva.Tween({
      node: stage,
      duration: 0.5,
      easing: Konva.Easings.EaseInOut,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      onUpdate: () => setStageScale(stage.scaleX()),
      onFinish: () => setViewport({ x: stage.x(), y: stage.y(), zoom: stage.scaleX() })
    })

    tween.play()
  }, [entities, width, height, setViewport])

  const handleCreateEntity = useCallback(() => {
    // This would trigger entity creation dialog
    console.log('Create new entity shortcut - implement entity creation dialog')
  }, [])

  // Handle spacebar pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !editingEntity && !e.repeat) {
        e.preventDefault()
        setIsPanMode(true)
        document.body.style.cursor = 'grab'
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !editingEntity) {
        e.preventDefault()
        setIsPanMode(false)
        document.body.style.cursor = 'default'
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      document.body.style.cursor = 'default'
    }
  }, [editingEntity, setIsPanMode])

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onDelete: handleDelete,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDuplicate: handleDuplicate,
    onSelectAll: handleSelectAll,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onZoomToFit: handleZoomToFit,
    onCreateEntity: handleCreateEntity,
    isEnabled: !editingEntity // Disable shortcuts when editing
  })

  // Synchronize stage with persisted viewport state on component mount
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    // Set initial scale and position from persisted viewport state
    stage.scale({ x: viewport.zoom, y: viewport.zoom })
    stage.position({ x: viewport.x, y: viewport.y })
    setStageScale(viewport.zoom)
  }, []) // Only run on mount

  // Update stage when viewport changes (from other sources)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    // Only update if stage values differ significantly from viewport state
    const currentScale = stage.scaleX()
    const currentPos = stage.position()

    if (Math.abs(currentScale - viewport.zoom) > 0.01 ||
        Math.abs(currentPos.x - viewport.x) > 1 ||
        Math.abs(currentPos.y - viewport.y) > 1) {
      stage.scale({ x: viewport.zoom, y: viewport.zoom })
      stage.position({ x: viewport.x, y: viewport.y })
      setStageScale(viewport.zoom)
    }
  }, [viewport])

  // Handle wheel zoom with smooth animations
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()

      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()

      if (!pointer) return

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      // Smooth zoom factor - less aggressive for better UX
      const scaleBy = 1.08
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
      const clampedScale = Math.max(0.1, Math.min(3, newScale))

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      }

      // Use Konva's tween for smooth animation
      const tween = new Konva.Tween({
        node: stage,
        duration: 0.1, // Short duration for responsive feel
        easing: Konva.Easings.EaseOut,
        scaleX: clampedScale,
        scaleY: clampedScale,
        x: newPos.x,
        y: newPos.y,
        onUpdate: () => {
          // Update our state during animation
          setStageScale(stage.scaleX())
        },
        onFinish: () => {
          // Update viewport state when animation completes
          setViewport({
            x: stage.x(),
            y: stage.y(),
            zoom: stage.scaleX()
          })
        }
      })

      tween.play()
    }

    stage.on('wheel', handleWheel)
    return () => stage.off('wheel', handleWheel)
  }, [setViewport])

  // Handle stage drag
  const handleStageDragEnd = () => {
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.position()
    setViewport({ x: pos.x, y: pos.y })
  }

  // Handle entity selection
  const handleEntityClick = (entityId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    const multiSelect = e.evt.ctrlKey || e.evt.metaKey
    
    if (connectionMode.isActive) {
      if (connectionMode.fromEntityId && connectionMode.fromEntityId !== entityId) {
        // Create connection
        handleCreateConnection(connectionMode.fromEntityId, entityId)
        setConnectionMode({ isActive: false, fromEntityId: undefined })
        setConnectionPreview(null)
      } else {
        setConnectionMode({ fromEntityId: entityId })
      }
    } else {
      // Regular selection
      const newSelectedEntities = multiSelect 
        ? new Set(selectionState.selectedEntities)
        : new Set<string>()
      
      if (newSelectedEntities.has(entityId)) {
        newSelectedEntities.delete(entityId)
      } else {
        newSelectedEntities.add(entityId)
      }
      
      setSelectionState({
        selectedEntities: newSelectedEntities,
        selectedConnections: multiSelect ? selectionState.selectedConnections : new Set()
      })
    }
  }

  // Handle entity double-click for editing
  const handleEntityDoubleClick = (entityId: string) => {
    // Don't allow editing while in connection mode
    if (connectionMode.isActive) {
      return
    }
    
    const entity = entities.get(entityId)
    const stage = stageRef.current
    if (entity && stage) {
      // Calculate screen position for the inline editor
      const entityCenterX = entity.positionX + 100 // ENTITY_WIDTH / 2
      const entityCenterY = entity.positionY + 60  // ENTITY_HEIGHT / 2
      
      // Convert entity position to screen coordinates
      const screenX = entityCenterX * stage.scaleX() + stage.x()
      const screenY = entityCenterY * stage.scaleY() + stage.y()
      
      setEditingEntity(entity)
      setEditingPosition({ x: screenX, y: screenY })
    }
  }

  // Handle entity drag
  const handleEntityDragStart = (entityId: string) => {
    // Prevent dragging if entity is being edited or in connection mode
    if (editingEntity?.id === entityId || connectionMode.isActive) {
      return false
    }

    // If the entity being dragged is not selected, select it first
    if (!selectionState.selectedEntities.has(entityId)) {
      setSelectionState({
        selectedEntities: new Set([entityId]),
        selectedConnections: new Set()
      })
    }

    setDragState({
      isDragging: true,
      entityId,
      startPosition: { x: 0, y: 0 } // Will be updated by the EntityNode
    })

    // Track which entity is being dragged
    setDraggedEntityId(entityId)

    // Store original position for potential Alt+drag duplication
    const draggedEntity = entities.get(entityId)
    if (draggedEntity) {
      setOriginalEntityPosition({ x: draggedEntity.positionX, y: draggedEntity.positionY })

      // Calculate offsets for all selected entities relative to the dragged entity
      const offsets = new Map<string, { x: number, y: number }>()
      selectionState.selectedEntities.forEach(selectedId => {
        const selectedEntity = entities.get(selectedId)
        if (selectedEntity && selectedId !== entityId) {
          offsets.set(selectedId, {
            x: selectedEntity.positionX - draggedEntity.positionX,
            y: selectedEntity.positionY - draggedEntity.positionY
          })
        }
      })
      setGroupDragOffsets(offsets)
    }

    return true
  }

  const handleEntityDrag = (entityId: string, position: { x: number, y: number }, event?: any) => {
    // Check if Alt key is pressed during drag
    const isAltPressed = event?.evt?.altKey || false

    if (isAltPressed && !isDuplicatingDrag && originalEntityPosition) {
      // Start duplication mode - create duplicate at original position
      setIsDuplicatingDrag(true)
      // Don't await this - let it happen in background
      duplicate([entityId], { x: 0, y: 0 }).then(() => {
        console.log('Alt+drag duplication completed')
        // Force a small delay to ensure the new entity is rendered
        setTimeout(() => {
          console.log('Entities after duplication:', Array.from(entities.values()).map(e => e.id))
        }, 100)
      }).catch(console.error)
    }

    // Apply snapping if enabled
    let finalPosition = position
    let guides: Array<{ type: 'horizontal' | 'vertical', position: number, entities: string[], id: string }> = []

    // Apply grid snapping first if enabled
    if (gridSettings.snapToGrid && gridSettings.isVisible) {
      finalPosition = snapToGrid(position, gridSettings.gridSize)
    }

    // Then apply entity alignment snapping
    if (snappingState.isEnabled) {
      const snapResult = calculateSnapping(entityId, finalPosition)
      finalPosition = snapResult.snappedPosition
      guides = snapResult.guides
    }

    // Update snapping state with active guides
    setSnappingState({
      activeGuides: guides,
      snapPosition: finalPosition
    })

    // Update the dragged entity and all selected entities
    const draggedEntity = entities.get(entityId)
    if (draggedEntity && !entityId.includes('-copy-') && !entityId.includes('paste-')) {
      // Update the dragged entity position
      useEntityStore.getState().updateEntity(entityId, {
        positionX: finalPosition.x,
        positionY: finalPosition.y
      })

      // Move all other selected entities by the same offset
      groupDragOffsets.forEach((offset, selectedId) => {
        const selectedEntity = entities.get(selectedId)
        if (selectedEntity && !selectedId.includes('-copy-') && !selectedId.includes('paste-')) {
          useEntityStore.getState().updateEntity(selectedId, {
            positionX: finalPosition.x + offset.x,
            positionY: finalPosition.y + offset.y
          })
        }
      })
    }
  }

  const handleEntityDragEnd = (entityId: string, newPosition: { x: number, y: number }) => {
    // Don't update position if entity is being edited
    if (editingEntity?.id === entityId) {
      setDragState({ isDragging: false, entityId: undefined })
      setDraggedEntityId(null)
      setIsDuplicatingDrag(false)
      setOriginalEntityPosition(null)
      setGroupDragOffsets(new Map())
      setSnappingState({ activeGuides: [], snapPosition: undefined })
      return
    }

    // Apply final snapping calculation
    let finalPosition = newPosition

    // Apply grid snapping first if enabled
    if (gridSettings.snapToGrid && gridSettings.isVisible) {
      finalPosition = snapToGrid(newPosition, gridSettings.gridSize)
    }

    // Then apply entity alignment snapping
    if (snappingState.isEnabled) {
      const snapResult = calculateSnapping(entityId, finalPosition)
      finalPosition = snapResult.snappedPosition
    }

    // Update the dragged entity and all selected entities
    if (!entityId.includes('-copy-') && !entityId.includes('paste-')) {
      // Update the dragged entity
      useEntityStore.getState().updateEntity(entityId, {
        positionX: finalPosition.x,
        positionY: finalPosition.y
      })

      // Save dragged entity to database
      saveEntityPosition(entityId, finalPosition)

      // Update and save all other selected entities
      groupDragOffsets.forEach((offset, selectedId) => {
        const selectedEntity = entities.get(selectedId)
        if (selectedEntity && !selectedId.includes('-copy-') && !selectedId.includes('paste-')) {
          const newSelectedPosition = {
            x: finalPosition.x + offset.x,
            y: finalPosition.y + offset.y
          }

          useEntityStore.getState().updateEntity(selectedId, {
            positionX: newSelectedPosition.x,
            positionY: newSelectedPosition.y
          })

          // Save each selected entity to database
          saveEntityPosition(selectedId, newSelectedPosition)
        }
      })
    }

    // Clear drag states
    setSnappingState({ activeGuides: [], snapPosition: undefined })
    setDragState({ isDragging: false, entityId: undefined })
    setDraggedEntityId(null)
    setIsDuplicatingDrag(false)
    setOriginalEntityPosition(null)
    setGroupDragOffsets(new Map())
  }

  // Handle connection creation
  const handleCreateConnection = async (fromEntityId: string, toEntityId: string) => {
    try {
      if (onCreateConnection) {
        await onCreateConnection(fromEntityId, toEntityId)
      }
    } catch (error) {
      console.error('Failed to create connection:', error)
      alert('Failed to create connection. Please try again.')
    }
  }

  // Handle entity updates
  const handleEntitySave = async (entityId: string, updates: any) => {
    try {
      const currentEntity = entities.get(entityId)
      if (!currentEntity) return
      
      const response = await fetch(`/api/entities/${entityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update entity')
      }
      
      const { entity } = await response.json()
      
      // Preserve the current position when updating
      useEntityStore.getState().updateEntity(entityId, {
        ...entity,
        positionX: currentEntity.positionX,
        positionY: currentEntity.positionY
      })
    } catch (error) {
      console.error('Failed to update entity:', error)
      alert('Failed to update entity. Please try again.')
    }
  }

  // Handle entity deletion
  const handleEntityDelete = async (entityId: string) => {
    try {
      const response = await fetch(`/api/entities/${entityId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete entity')
      }
      
      useEntityStore.getState().removeEntity(entityId)
    } catch (error) {
      console.error('Failed to delete entity:', error)
      alert('Failed to delete entity. Please try again.')
    }
  }

  // Handle rectangle selection
  const handleRectangleSelection = (startPos: { x: number, y: number }, endPos: { x: number, y: number }) => {
    const rect = {
      x: Math.min(startPos.x, endPos.x),
      y: Math.min(startPos.y, endPos.y),
      width: Math.abs(endPos.x - startPos.x),
      height: Math.abs(endPos.y - startPos.y)
    }

    // Find entities that intersect with the selection rectangle
    const selectedEntityIds = new Set<string>()
    currentLayerEntities.forEach(entity => {
      const entityBounds = {
        x: entity.positionX,
        y: entity.positionY,
        width: 200, // ENTITY_WIDTH
        height: 120 // ENTITY_HEIGHT
      }

      // Check if entity intersects with selection rectangle
      if (entityBounds.x < rect.x + rect.width &&
          entityBounds.x + entityBounds.width > rect.x &&
          entityBounds.y < rect.y + rect.height &&
          entityBounds.y + entityBounds.height > rect.y) {
        selectedEntityIds.add(entity.id)
      }
    })

    setSelectionState({
      selectedEntities: selectedEntityIds,
      selectedConnections: new Set()
    })
  }

  // Handle background click
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current) {
      if (connectionMode.isActive) {
        setConnectionMode({ isActive: false, fromEntityId: undefined })
        setConnectionPreview(null)
      } else if (!rectangleSelection.isActive) {
        setSelectionState({ selectedEntities: new Set(), selectedConnections: new Set() })
      }
    }
  }

  // Handle mouse move for connection preview and rectangle selection
  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const worldPos = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY()
    }

    if (connectionMode.isActive && connectionMode.fromEntityId) {
      const fromEntity = entities.get(connectionMode.fromEntityId)
      if (!fromEntity) return

      setConnectionPreview({
        from: {
          x: fromEntity.positionX + 100, // center of entity
          y: fromEntity.positionY + 60
        },
        to: worldPos
      })
    } else if (rectangleSelection.isActive && rectangleSelection.startPosition) {
      // Update rectangle selection
      setRectangleSelection({
        currentPosition: worldPos
      })
    }
  }

  // Handle mouse down for rectangle selection and panning
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const isMiddleClick = e.evt.button === 1
    const isPanActive = isPanMode || currentTool.type === 'pan' || isMiddleClick

    if (isPanActive) {
      // Pan mode - let stage handle dragging
      document.body.style.cursor = 'grabbing'
      return
    }

    // Only start rectangle selection if clicking on stage background and not in connection mode
    if (e.target === stageRef.current && !connectionMode.isActive && !dragState.isDragging && currentTool.type === 'select') {
      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const worldPos = {
        x: (pointer.x - stage.x()) / stage.scaleX(),
        y: (pointer.y - stage.y()) / stage.scaleY()
      }

      setRectangleSelection({
        isActive: true,
        startPosition: worldPos,
        currentPosition: worldPos
      })
    }
  }

  // Handle mouse up for rectangle selection and panning
  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Reset cursor after panning
    if (isPanMode) {
      document.body.style.cursor = 'grab'
    } else if (currentTool.type === 'pan') {
      document.body.style.cursor = 'grab'
    } else {
      document.body.style.cursor = 'default'
    }

    if (rectangleSelection.isActive && rectangleSelection.startPosition && rectangleSelection.currentPosition) {
      // Complete rectangle selection
      handleRectangleSelection(rectangleSelection.startPosition, rectangleSelection.currentPosition)
      setRectangleSelection({
        isActive: false,
        startPosition: undefined,
        currentPosition: undefined
      })
    }
  }

  // Handle context menu for creating entities
  const handleStageContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Convert screen coordinates to world coordinates
    const worldPos = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY()
    }

    // TODO: Show context menu for creating new entities
    console.log('Context menu at:', worldPos)
  }

  // Handle minimap navigation
  const handleMinimapNavigation = useCallback((x: number, y: number) => {
    setViewport({ x, y })
  }, [setViewport])

  // Handle connection point hover for magnetic behavior
  const handleConnectionPointHover = useCallback((entityId: string, point: string) => {
    if (connectionMode.isActive && connectionMode.fromEntityId !== entityId) {
      setHoveredConnectionPoint({ entityId, point })

      // Snap connection preview to the connection point
      const entity = entities.get(entityId)
      if (entity) {
        const pointPosition = getConnectionPointPosition(entity, point)
        if (connectionMode.fromEntityId) {
          const fromEntity = entities.get(connectionMode.fromEntityId)
          if (fromEntity) {
            setConnectionPreview({
              from: {
                x: fromEntity.positionX + 100,
                y: fromEntity.positionY + 60
              },
              to: pointPosition
            })
          }
        }
      }
    }
  }, [connectionMode, entities])

  const handleConnectionPointLeave = useCallback((entityId: string) => {
    setHoveredConnectionPoint(null)
  }, [])

  // Get connection point position
  const getConnectionPointPosition = (entity: EntityWithRelations, point: string): { x: number, y: number } => {
    const ENTITY_WIDTH = 200
    const ENTITY_HEIGHT = 120

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
        return { x: entity.positionX + ENTITY_WIDTH / 2, y: entity.positionY + ENTITY_HEIGHT / 2 }
    }
  }

  // Calculate snap guides and snapped position
  const calculateSnapping = useCallback((draggedEntityId: string, position: { x: number, y: number }) => {
    if (!snappingState.isEnabled) {
      return { snappedPosition: position, guides: [] }
    }

    const ENTITY_WIDTH = 200
    const ENTITY_HEIGHT = 120
    const snapDistance = snappingState.snapDistance

    // Get other entities to snap to (excluding the dragged entity)
    const otherEntities = currentLayerEntities.filter(entity => entity.id !== draggedEntityId)

    const guides: Array<{ type: 'horizontal' | 'vertical', position: number, entities: string[] }> = []
    let snappedX = position.x
    let snappedY = position.y

    // Calculate entity bounds
    const draggedLeft = position.x
    const draggedRight = position.x + ENTITY_WIDTH
    const draggedTop = position.y
    const draggedBottom = position.y + ENTITY_HEIGHT
    const draggedCenterX = position.x + ENTITY_WIDTH / 2
    const draggedCenterY = position.y + ENTITY_HEIGHT / 2

    // Find vertical alignment opportunities
    for (const entity of otherEntities) {
      const entityLeft = entity.positionX
      const entityRight = entity.positionX + ENTITY_WIDTH
      const entityCenterX = entity.positionX + ENTITY_WIDTH / 2

      // Snap to left edge
      if (Math.abs(draggedLeft - entityLeft) < snapDistance) {
        snappedX = entityLeft
        guides.push({ type: 'vertical', position: entityLeft, entities: [entity.id] })
      }
      // Snap to right edge
      else if (Math.abs(draggedRight - entityRight) < snapDistance) {
        snappedX = entityRight - ENTITY_WIDTH
        guides.push({ type: 'vertical', position: entityRight, entities: [entity.id] })
      }
      // Snap to center
      else if (Math.abs(draggedCenterX - entityCenterX) < snapDistance) {
        snappedX = entityCenterX - ENTITY_WIDTH / 2
        guides.push({ type: 'vertical', position: entityCenterX, entities: [entity.id] })
      }
      // Snap left to right edge
      else if (Math.abs(draggedLeft - entityRight) < snapDistance) {
        snappedX = entityRight
        guides.push({ type: 'vertical', position: entityRight, entities: [entity.id] })
      }
      // Snap right to left edge
      else if (Math.abs(draggedRight - entityLeft) < snapDistance) {
        snappedX = entityLeft - ENTITY_WIDTH
        guides.push({ type: 'vertical', position: entityLeft, entities: [entity.id] })
      }
    }

    // Find horizontal alignment opportunities
    for (const entity of otherEntities) {
      const entityTop = entity.positionY
      const entityBottom = entity.positionY + ENTITY_HEIGHT
      const entityCenterY = entity.positionY + ENTITY_HEIGHT / 2

      // Snap to top edge
      if (Math.abs(draggedTop - entityTop) < snapDistance) {
        snappedY = entityTop
        guides.push({ type: 'horizontal', position: entityTop, entities: [entity.id] })
      }
      // Snap to bottom edge
      else if (Math.abs(draggedBottom - entityBottom) < snapDistance) {
        snappedY = entityBottom - ENTITY_HEIGHT
        guides.push({ type: 'horizontal', position: entityBottom, entities: [entity.id] })
      }
      // Snap to center
      else if (Math.abs(draggedCenterY - entityCenterY) < snapDistance) {
        snappedY = entityCenterY - ENTITY_HEIGHT / 2
        guides.push({ type: 'horizontal', position: entityCenterY, entities: [entity.id] })
      }
      // Snap top to bottom edge
      else if (Math.abs(draggedTop - entityBottom) < snapDistance) {
        snappedY = entityBottom
        guides.push({ type: 'horizontal', position: entityBottom, entities: [entity.id] })
      }
      // Snap bottom to top edge
      else if (Math.abs(draggedBottom - entityTop) < snapDistance) {
        snappedY = entityTop - ENTITY_HEIGHT
        guides.push({ type: 'horizontal', position: entityTop, entities: [entity.id] })
      }
    }

    return {
      snappedPosition: { x: snappedX, y: snappedY },
      guides: guides.map((guide, index) => ({ ...guide, id: `guide-${index}` }))
    }
  }, [snappingState.isEnabled, snappingState.snapDistance, currentLayerEntities])

  // Get visual style based on reconciliation state and layer context
  const getEntityVisual = (entityId: string, layerContext: 'current' | 'below' | 'above' = 'current') => {
    const reconciliationState = reconciliationStates.get(entityId)
    const state = reconciliationState?.state || ReconciliationState.SYNCED
    const isSelected = selectionState.selectedEntities.has(entityId)
    const isFromConnection = connectionMode.isActive && connectionMode.fromEntityId === entityId

    let baseOpacity = 1.0
    let baseHighlight = false
    
    // Adjust opacity based on layer context
    if (layerContext === 'below') {
      baseOpacity = 0.25
      baseHighlight = false
    } else if (layerContext === 'above') {
      baseOpacity = 0.15
      baseHighlight = false
    }

    // Connection mode visual override (only for current layer)
    if (isFromConnection && layerContext === 'current') {
      return {
        borderColor: '#10b981', // green for "from" entity
        borderStyle: 'solid' as const,
        opacity: baseOpacity,
        highlight: true
      }
    }

    switch (state) {
      case ReconciliationState.NEEDS_ATTENTION:
        return {
          borderColor: '#ff6b6b',
          borderStyle: 'dashed' as const,
          opacity: layerContext === 'current' ? (isSelected ? 1.0 : 0.7) : baseOpacity,
          highlight: layerContext === 'current' ? true : baseHighlight
        }
      case ReconciliationState.DOWNSTREAM_IMPACT:
        return {
          borderColor: '#ffd93d',
          borderStyle: 'dotted' as const,
          opacity: layerContext === 'current' ? (isSelected ? 0.8 : 0.5) : baseOpacity,
          highlight: layerContext === 'current' ? false : baseHighlight
        }
      case ReconciliationState.SYNCED:
      default:
        return {
          borderColor: isSelected && layerContext === 'current' ? '#2563eb' : '#4ecdc4',
          borderStyle: 'solid' as const,
          opacity: layerContext === 'current' ? 1.0 : baseOpacity,
          highlight: layerContext === 'current' ? isSelected : baseHighlight
        }
    }
  }

  return (
    <div className="w-full h-full bg-gray-50 overflow-hidden relative">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={viewport.x}
        y={viewport.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable={isPanMode || currentTool.type === 'pan' || !rectangleSelection.isActive}
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onMouseUp={handleStageMouseUp}
        onMouseMove={handleStageMouseMove}
        onContextMenu={handleStageContextMenu}
        style={{ cursor: isPanMode ? 'grab' : currentTool.cursor }}
      >
        <Layer>
          {/* Grid background (furthest back) */}
          <CanvasGrid
            gridSettings={gridSettings}
            viewport={viewport}
            canvasWidth={width}
            canvasHeight={height}
          />

          {/* Render layer above first (furthest back) */}
          {aboveLayerEntities.length > 0 && (
            <Group opacity={0.15}>
              {/* Above layer connections */}
              {aboveLayerConnections.map(connection => (
                <ConnectionPath
                  key={`above-${connection.id}`}
                  connection={connection}
                  isSelected={false}
                  isDraggedConnection={false}
                  onClick={() => {}} // No interaction for background layers
                  currentLayer={layer}
                />
              ))}
              
              {/* Above layer entities */}
              {aboveLayerEntities.map(entity => (
                <EntityNode
                  key={`above-${entity.id}`}
                  entity={entity}
                  visual={getEntityVisual(entity.id, 'above')}
                  isSelected={false}
                  isDragging={false}
                  isEditing={false}
                  onClick={() => {}} // No interaction for background layers
                  onDoubleClick={() => {}} // No double click for background layers
                  onDragStart={() => false} // Disable dragging
                  onDragEnd={() => {}} // No drag end handler
                  isInteractable={false} // Disable all interactions
                />
              ))}
            </Group>
          )}
          
          {/* Render layer below (middle depth) */}
          {belowLayerEntities.length > 0 && (
            <Group opacity={0.25}>
              {/* Below layer connections */}
              {belowLayerConnections.map(connection => (
                <ConnectionPath
                  key={`below-${connection.id}`}
                  connection={connection}
                  isSelected={false}
                  isDraggedConnection={false}
                  onClick={() => {}} // No interaction for background layers
                  currentLayer={layer}
                />
              ))}
              
              {/* Below layer entities */}
              {belowLayerEntities.map(entity => (
                <EntityNode
                  key={`below-${entity.id}`}
                  entity={entity}
                  visual={getEntityVisual(entity.id, 'below')}
                  isSelected={false}
                  isDragging={false}
                  isEditing={false}
                  onClick={() => {}} // No interaction for background layers
                  onDoubleClick={() => {}} // No double click for background layers
                  onDragStart={() => false} // Disable dragging
                  onDragEnd={() => {}} // No drag end handler
                  isInteractable={false} // Disable all interactions
                />
              ))}
            </Group>
          )}
          
          {/* Render current layer connections first (behind current entities) */}
          {currentLayerConnections.map(connection => {
            // Check if this connection involves the dragged entity
            const isDraggedConnection = draggedEntityId && 
              (connection.fromEntityId === draggedEntityId || connection.toEntityId === draggedEntityId)
            
            return (
              <ConnectionPath
                key={connection.id}
                connection={connection}
                isSelected={selectionState.selectedConnections.has(connection.id)}
                isDraggedConnection={isDraggedConnection}
                onNavigateToEntity={onNavigateToEntity}
                currentLayer={layer}
                onClick={(connectionId, e) => {
                  const multiSelect = e.evt.ctrlKey || e.evt.metaKey
                  const newSelectedConnections = multiSelect 
                    ? new Set(selectionState.selectedConnections)
                    : new Set<string>()
                  
                  if (newSelectedConnections.has(connectionId)) {
                    newSelectedConnections.delete(connectionId)
                  } else {
                    newSelectedConnections.add(connectionId)
                  }
                  
                  setSelectionState({
                    selectedConnections: newSelectedConnections,
                    selectedEntities: multiSelect ? selectionState.selectedEntities : new Set()
                  })
                }}
              />
            )
          })}
          
          {/* Render current layer entities (foreground) */}
          {currentLayerEntities.map(entity => (
            <EntityNode
              key={entity.id}
              entity={entity}
              visual={getEntityVisual(entity.id, 'current')}
              isSelected={selectionState.selectedEntities.has(entity.id)}
              isDragging={dragState.isDragging && dragState.entityId === entity.id}
              isEditing={editingEntity?.id === entity.id}
              isInteractable={true} // Current layer entities are fully interactable
              isConnectionMode={connectionMode.isActive}
              isConnectionTarget={hoveredConnectionPoint?.entityId === entity.id}
              onConnectionPointHover={handleConnectionPointHover}
              onConnectionPointLeave={handleConnectionPointLeave}
              onClick={(entityId, e) => handleEntityClick(entityId, e)}
              onDoubleClick={(entityId) => handleEntityDoubleClick(entityId)}
              onDragStart={(entityId) => handleEntityDragStart(entityId)}
              onDrag={(entityId, pos) => handleEntityDrag(entityId, pos)}
              onDragEnd={(entityId, pos) => handleEntityDragEnd(entityId, pos)}
            />
          ))}
          
          {/* Connection preview line when in connection mode */}
          {connectionPreview && (
            <Line
              points={[
                connectionPreview.from.x,
                connectionPreview.from.y,
                connectionPreview.to.x,
                connectionPreview.to.y
              ]}
              stroke="#2563eb"
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.7}
            />
          )}

          {/* Rectangle selection overlay */}
          {rectangleSelection.isActive && rectangleSelection.startPosition && rectangleSelection.currentPosition && (
            <Rect
              x={Math.min(rectangleSelection.startPosition.x, rectangleSelection.currentPosition.x)}
              y={Math.min(rectangleSelection.startPosition.y, rectangleSelection.currentPosition.y)}
              width={Math.abs(rectangleSelection.currentPosition.x - rectangleSelection.startPosition.x)}
              height={Math.abs(rectangleSelection.currentPosition.y - rectangleSelection.startPosition.y)}
              fill="rgba(37, 99, 235, 0.1)"
              stroke="#2563eb"
              strokeWidth={1}
              dash={[5, 5]}
            />
          )}

          {/* Snap guides */}
          {snappingState.activeGuides.map(guide => (
            <Line
              key={guide.id}
              points={guide.type === 'vertical'
                ? [guide.position, -viewport.y / viewport.zoom, guide.position, (-viewport.y + height) / viewport.zoom]
                : [-viewport.x / viewport.zoom, guide.position, (-viewport.x + width) / viewport.zoom, guide.position]
              }
              stroke="#ff6b35"
              strokeWidth={1 / viewport.zoom} // Keep consistent thickness regardless of zoom
              dash={[8 / viewport.zoom, 4 / viewport.zoom]}
              opacity={0.8}
            />
          ))}
        </Layer>
      </Stage>
      
      {/* Inline Entity Editor */}
      <InlineEntityEditor
        entity={editingEntity}
        position={editingPosition}
        isOpen={editingEntity !== null}
        onClose={() => setEditingEntity(null)}
        onSave={handleEntitySave}
        onDelete={handleEntityDelete}
      />
    </div>
  )
}