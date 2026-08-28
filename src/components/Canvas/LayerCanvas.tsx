'use client'

import { useCallback, useState } from 'react'
import { Stage, Layer, Line, Rect } from 'react-konva'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useClipboard } from '@/hooks/useClipboard'
import { deleteSelection, updateEntity as updateEntityCommand } from '@/lib/commands'
import { worldToStage, entityCenter } from '@/lib/canvas/geometry'
import { EntityWithRelations } from '@/lib/types'
import { EntityNode } from './EntityNode'
import { ConnectionPath } from './ConnectionPath'
import { InlineEntityEditor } from './InlineEntityEditor'
import { CanvasGrid } from './CanvasGrid'
import { AdjacentLayer } from './AdjacentLayer'
import { getEntityVisual, getLayerBackgroundColor } from './layerVisuals'
import { useLayerData } from './hooks/useLayerData'
import { useStageViewport } from './hooks/useStageViewport'
import { useEntityDrag } from './hooks/useEntityDrag'
import { useStageInteractions } from './hooks/useStageInteractions'

interface LayerCanvasProps {
  width: number
  height: number
  layer: number
  onCreateConnection?: (fromEntityId: string, toEntityId: string) => void
  onNavigateToEntity?: (entityId: string) => void
}

export function LayerCanvas({ width, height, layer, onCreateConnection, onNavigateToEntity }: LayerCanvasProps) {
  const [editingEntity, setEditingEntity] = useState<EntityWithRelations | null>(null)
  const [editingPosition, setEditingPosition] = useState({ x: 0, y: 0 })

  const entities = useEntityStore(s => s.entities)
  const reconciliationStates = useEntityStore(s => s.reconciliationStates)
  const selectionState = useCanvasStore(s => s.selectionState)
  const connectionMode = useCanvasStore(s => s.connectionMode)
  const rectangleSelection = useCanvasStore(s => s.rectangleSelection)
  const snappingState = useCanvasStore(s => s.snappingState)
  const gridSettings = useCanvasStore(s => s.gridSettings)
  const currentTool = useCanvasStore(s => s.currentTool)
  const isPanMode = useCanvasStore(s => s.isPanMode)
  const dragState = useCanvasStore(s => s.dragState)
  const setSelectionState = useCanvasStore(s => s.setSelectionState)
  const clearSelection = useCanvasStore(s => s.clearSelection)
  const { undo, redo } = useHistoryStore()

  const layers = useLayerData(layer)
  const { stageRef, stageScale, viewport, zoomIn, zoomOut, zoomToFit, handleStageDragEnd } =
    useStageViewport(width, height)
  const { copy, paste, duplicate } = useClipboard()

  const createConnection = useCallback(async (from: string, to: string) => {
    try {
      await onCreateConnection?.(from, to)
    } catch (error) {
      console.error('Failed to create connection:', error)
      alert('Failed to create connection. Please try again.')
    }
  }, [onCreateConnection])

  const interactions = useStageInteractions({
    stageRef,
    currentEntities: layers.currentEntities,
    isEditing: editingEntity !== null,
    onCreateConnection: createConnection,
  })

  const drag = useEntityDrag({
    currentEntities: layers.currentEntities,
    editingEntityId: editingEntity?.id,
    // Alt+drag: leave a copy at the original position, keep dragging the original
    onAltDragStart: (entityId) => { duplicate([entityId], { x: 0, y: 0 }).catch(console.error) },
  })

  // ---- editing ----
  const openEditor = useCallback((entityId: string) => {
    if (connectionMode.isActive) return
    const entity = entities.get(entityId)
    const stage = stageRef.current
    if (!entity || !stage) return
    setEditingEntity(entity)
    setEditingPosition(worldToStage(stage, entityCenter(entity)))
  }, [connectionMode.isActive, entities, stageRef])

  const handleEntitySave = useCallback(async (entityId: string, updates: Partial<EntityWithRelations>) => {
    try {
      await updateEntityCommand(entityId, updates)
    } catch (error) {
      console.error('Failed to update entity:', error)
      alert('Failed to update entity. Please try again.')
    }
  }, [])

  const handleEntityDelete = useCallback(async (entityId: string) => {
    try {
      await deleteSelection([entityId])
    } catch (error) {
      console.error('Failed to delete entity:', error)
      alert('Failed to delete entity. Please try again.')
    }
  }, [])

  // ---- keyboard shortcuts ----
  const handleDelete = useCallback(async () => {
    const entityIds = Array.from(selectionState.selectedEntities)
    const connectionIds = Array.from(selectionState.selectedConnections)
    if (entityIds.length === 0 && connectionIds.length === 0) return
    try {
      await deleteSelection(entityIds, connectionIds)
    } catch (error) {
      console.error('Failed to delete selection:', error)
    }
    clearSelection()
  }, [selectionState, clearSelection])

  const handlePaste = useCallback(() => paste({
    // centre of the visible area, offset by half an entity
    x: (-viewport.x + width / 2) / stageScale - 100,
    y: (-viewport.y + height / 2) / stageScale - 60,
  }), [paste, viewport, width, height, stageScale])

  const handleSelectAll = useCallback(() => setSelectionState({
    selectedEntities: new Set(layers.currentEntities.map(e => e.id)),
    selectedConnections: new Set(layers.currentConnections.map(c => c.id)),
  }), [layers.currentEntities, layers.currentConnections, setSelectionState])

  useKeyboardShortcuts({
    onDelete: handleDelete,
    onCopy: copy,
    onPaste: handlePaste,
    onDuplicate: () => duplicate(),
    onSelectAll: handleSelectAll,
    onUndo: undo,
    onRedo: redo,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onZoomToFit: () => zoomToFit(Array.from(entities.values())),
    isEnabled: !editingEntity,
  })

  // ---- render ----
  const worldLeft = -viewport.x / viewport.zoom
  const worldTop = -viewport.y / viewport.zoom

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
        onClick={interactions.handleStageClick}
        onMouseDown={interactions.handleStageMouseDown}
        onMouseUp={interactions.handleStageMouseUp}
        onMouseMove={interactions.handleStageMouseMove}
        onContextMenu={interactions.handleStageContextMenu}
        style={{ cursor: isPanMode ? 'grab' : currentTool.cursor }}
      >
        <Layer>
          <CanvasGrid gridSettings={gridSettings} viewport={viewport} canvasWidth={width} canvasHeight={height} />

          {/* Layer tint */}
          <Rect
            x={worldLeft - 5000}
            y={worldTop - 5000}
            width={(width + 10000) / viewport.zoom}
            height={(height + 10000) / viewport.zoom}
            fill={getLayerBackgroundColor(layer)}
            listening={false}
          />

          <AdjacentLayer
            context="above"
            currentLayer={layer}
            entities={layers.aboveEntities}
            connections={layers.aboveConnections}
            reconciliationStates={reconciliationStates}
          />
          <AdjacentLayer
            context="below"
            currentLayer={layer}
            entities={layers.belowEntities}
            connections={layers.belowConnections}
            reconciliationStates={reconciliationStates}
          />

          {/* Current layer: connections behind entities */}
          {layers.currentConnections.map(connection => (
            <ConnectionPath
              key={connection.id}
              connection={connection}
              isSelected={selectionState.selectedConnections.has(connection.id)}
              isDraggedConnection={
                !!drag.draggedEntityId &&
                (connection.fromEntityId === drag.draggedEntityId || connection.toEntityId === drag.draggedEntityId)
              }
              onNavigateToEntity={onNavigateToEntity}
              currentLayer={layer}
              onClick={interactions.handleConnectionClick}
            />
          ))}

          {layers.currentEntities.map(entity => (
            <EntityNode
              key={entity.id}
              entity={entity}
              visual={getEntityVisual({
                reconciliation: reconciliationStates.get(entity.id),
                isSelected: selectionState.selectedEntities.has(entity.id),
                isConnectionSource: connectionMode.isActive && connectionMode.fromEntityId === entity.id,
                context: 'current',
              })}
              isSelected={selectionState.selectedEntities.has(entity.id)}
              isDragging={dragState.isDragging && dragState.entityId === entity.id}
              isEditing={editingEntity?.id === entity.id}
              isInteractable
              isConnectionMode={connectionMode.isActive}
              isConnectionTarget={interactions.hoveredConnectionPoint?.entityId === entity.id}
              isHovered={interactions.hoveredEntityId === entity.id}
              onConnectionPointHover={interactions.handleConnectionPointHover}
              onConnectionPointLeave={interactions.handleConnectionPointLeave}
              onMouseEnter={interactions.handleEntityHover}
              onMouseLeave={interactions.handleEntityHoverLeave}
              onClick={interactions.handleEntityClick}
              onDoubleClick={openEditor}
              onDragStart={drag.handleDragStart}
              onDrag={drag.handleDrag}
              onDragEnd={drag.handleDragEnd}
            />
          ))}

          {interactions.connectionPreview && (
            <Line
              points={[
                interactions.connectionPreview.from.x,
                interactions.connectionPreview.from.y,
                interactions.connectionPreview.to.x,
                interactions.connectionPreview.to.y,
              ]}
              stroke="#2563eb"
              strokeWidth={2}
              dash={[5, 5]}
              opacity={0.7}
            />
          )}

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

          {snappingState.activeGuides.map(guide => (
            <Line
              key={guide.id}
              points={guide.type === 'vertical'
                ? [guide.position, worldTop, guide.position, worldTop + height / viewport.zoom]
                : [worldLeft, guide.position, worldLeft + width / viewport.zoom, guide.position]}
              stroke="#ff6b35"
              strokeWidth={1 / viewport.zoom}
              dash={[8 / viewport.zoom, 4 / viewport.zoom]}
              opacity={0.8}
            />
          ))}
        </Layer>
      </Stage>

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
