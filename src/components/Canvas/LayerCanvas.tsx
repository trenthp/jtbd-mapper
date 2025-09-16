'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Group, Line } from 'react-konva'
import Konva from 'konva'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'
import { EntityNode } from './EntityNode'
import { ConnectionPath } from './ConnectionPath'
import { InlineEntityEditor } from './InlineEntityEditor'
import { ReconciliationState } from '@prisma/client'
import { EntityWithRelations } from '@/lib/types'

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
  const [draggedEntityId, setDraggedEntityId] = useState<string | null>(null)
  
  const {
    viewport,
    dragState,
    selectionState,
    connectionMode,
    setViewport,
    setDragState,
    setSelectionState,
    setConnectionMode
  } = useCanvasStore()
  
  const {
    entities,
    connections,
    reconciliationStates
  } = useEntityStore()
  
  // Debounced position save to prevent excessive API calls
  const saveEntityPosition = useCallback(
    debounce(async (entityId: string, position: { x: number, y: number }) => {
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
  
  // Simple debounce function
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout
    return ((...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }) as T
  }

  // Filter entities and connections for current layer and adjacent layers
  const currentLayerEntities = Array.from(entities.values()).filter(entity => entity.layer === layer)
  const belowLayerEntities = Array.from(entities.values()).filter(entity => entity.layer === layer - 1)
  const aboveLayerEntities = Array.from(entities.values()).filter(entity => entity.layer === layer + 1)
  
  const currentLayerConnections = Array.from(connections.values()).filter(
    connection => connection.fromLayer === layer || connection.toLayer === layer
  )
  const belowLayerConnections = Array.from(connections.values()).filter(
    connection => (connection.fromLayer === layer - 1 || connection.toLayer === layer - 1) &&
    !(connection.fromLayer === layer || connection.toLayer === layer) // Exclude cross-layer connections already in current
  )
  const aboveLayerConnections = Array.from(connections.values()).filter(
    connection => (connection.fromLayer === layer + 1 || connection.toLayer === layer + 1) &&
    !(connection.fromLayer === layer || connection.toLayer === layer) // Exclude cross-layer connections already in current
  )

  // Handle wheel zoom
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

      const scaleBy = 1.05
      const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy
      const clampedScale = Math.max(0.1, Math.min(3, newScale))

      setStageScale(clampedScale)
      stage.scale({ x: clampedScale, y: clampedScale })

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      }
      
      stage.position(newPos)
      setViewport({ x: newPos.x, y: newPos.y, zoom: clampedScale })
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
    
    setDragState({
      isDragging: true,
      entityId,
      startPosition: { x: 0, y: 0 } // Will be updated by the EntityNode
    })
    
    // Track which entity is being dragged
    setDraggedEntityId(entityId)
    
    return true
  }

  // No real-time position tracking needed anymore

  const handleEntityDragEnd = (entityId: string, newPosition: { x: number, y: number }) => {
    // Don't update position if entity is being edited
    if (editingEntity?.id === entityId) {
      setDragState({ isDragging: false, entityId: undefined })
      setDraggedEntityId(null)
      return
    }
    
    // Update entity position in store immediately for responsive UI
    useEntityStore.getState().updateEntity(entityId, {
      positionX: newPosition.x,
      positionY: newPosition.y
    })
    
    // Save to database with debouncing
    saveEntityPosition(entityId, newPosition)
    
    setDragState({ isDragging: false, entityId: undefined })
    setDraggedEntityId(null)
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

  // Handle background click
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current) {
      if (connectionMode.isActive) {
        setConnectionMode({ isActive: false, fromEntityId: undefined })
        setConnectionPreview(null)
      } else {
        setSelectionState({ selectedEntities: new Set(), selectedConnections: new Set() })
      }
    }
  }

  // Handle mouse move for connection preview
  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (connectionMode.isActive && connectionMode.fromEntityId) {
      const stage = stageRef.current
      if (!stage) return

      const pointer = stage.getPointerPosition()
      if (!pointer) return

      const fromEntity = entities.get(connectionMode.fromEntityId)
      if (!fromEntity) return

      const worldPos = {
        x: (pointer.x - stage.x()) / stage.scaleX(),
        y: (pointer.y - stage.y()) / stage.scaleY()
      }

      setConnectionPreview({
        from: { 
          x: fromEntity.positionX + 100, // center of entity
          y: fromEntity.positionY + 60 
        },
        to: worldPos
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
    <div className="w-full h-full bg-gray-50 overflow-hidden">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={viewport.x}
        y={viewport.y}
        scaleX={stageScale}
        scaleY={stageScale}
        draggable
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onContextMenu={handleStageContextMenu}
      >
        <Layer>
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
              onClick={(entityId, e) => handleEntityClick(entityId, e)}
              onDoubleClick={(entityId) => handleEntityDoubleClick(entityId)}
              onDragStart={(entityId) => handleEntityDragStart(entityId)}
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