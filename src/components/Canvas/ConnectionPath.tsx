'use client'

import { Line, Text, Group, Circle } from 'react-konva'
import Konva from 'konva'
import { LayerConnectionWithEntities } from '@/lib/types'
import { useEntityStore } from '@/stores/entityStore'

interface ConnectionPathProps {
  connection: LayerConnectionWithEntities
  isSelected: boolean
  isDraggedConnection?: boolean
  onNavigateToEntity?: (entityId: string) => void
  onClick: (connectionId: string, e: Konva.KonvaEventObject<MouseEvent>) => void
  currentLayer?: number
}

export function ConnectionPath({ connection, isSelected, isDraggedConnection, onNavigateToEntity, onClick, currentLayer }: ConnectionPathProps) {
  const { entities } = useEntityStore()
  
  // Get current entity positions from the store instead of cached connection entities
  const fromEntity = entities.get(connection.fromEntityId) || connection.fromEntity
  const toEntity = entities.get(connection.toEntityId) || connection.toEntity

  // Defensive check for entity existence
  if (!fromEntity || !toEntity) {
    return null
  }

  // Check if this is a cross-layer connection
  const isCrossLayer = fromEntity.layer !== toEntity.layer

  // Use static entity positions (no real-time dragging updates)
  const fromPos = {
    x: fromEntity.positionX || 0,
    y: fromEntity.positionY || 0
  }
  const toPos = {
    x: toEntity.positionX || 0,
    y: toEntity.positionY || 0
  }

  const startX = fromPos.x + 200 // entity width
  const startY = fromPos.y + 60  // entity height / 2
  const endX = toPos.x
  const endY = toPos.y + 60

  // Simple straight line points
  const getLinePoints = (): number[] => {
    return [startX, startY, endX, endY]
  }

  // Simplified color scheme
  const getConnectionColor = (): string => {
    // Gray out if connection involves a dragged entity
    if (isDraggedConnection) return '#9ca3af' // gray-400

    if (isSelected) return '#2563eb' // blue-600

    // Simple gray color for all connections
    return '#6b7280' // gray-500
  }

  // Simplified stroke width
  const getStrokeWidth = (): number => {
    return isSelected ? 3 : 2
  }

  // Calculate opacity based on entity layer context
  const getConnectionOpacity = (): number => {
    // If dragged, always use reduced opacity
    if (isDraggedConnection) return 0.4
    
    // If selected, full opacity
    if (isSelected) return 1.0
    
    // If no current layer context, use default opacity (for background layers)
    if (currentLayer === undefined) return 1.0
    
    // For current layer context, calculate based on entity layers
    const fromLayerContext = fromEntity.layer === currentLayer ? 'current' : 
                           fromEntity.layer === currentLayer - 1 ? 'below' :
                           fromEntity.layer === currentLayer + 1 ? 'above' : 'other'
    
    const toLayerContext = toEntity.layer === currentLayer ? 'current' : 
                         toEntity.layer === currentLayer - 1 ? 'below' :
                         toEntity.layer === currentLayer + 1 ? 'above' : 'other'
    
    // Same layer connections
    if (fromLayerContext === 'current' && toLayerContext === 'current') {
      return 1.0 // Full opacity for same-layer connections
    }
    
    // Cross-layer connections - use minimum opacity of the entities involved
    if (fromLayerContext === 'current' || toLayerContext === 'current') {
      // Connection from/to current layer
      const otherLayerContext = fromLayerContext === 'current' ? toLayerContext : fromLayerContext
      
      switch (otherLayerContext) {
        case 'below': return 0.25 // Match below layer entity opacity
        case 'above': return 0.15 // Match above layer entity opacity
        default: return 0.1 // Other layers are very faint
      }
    }
    
    // Connections between background layers (shouldn't happen in current implementation)
    return 0.1
  }

  // Defensive check to prevent zero-dimension rendering
  if (!isFinite(startX) || !isFinite(startY) || !isFinite(endX) || !isFinite(endY) ||
      startX === endX && startY === endY ||
      Math.abs(startX - endX) < 1 && Math.abs(startY - endY) < 1) {
    return null
  }

  const linePoints = getLinePoints()

  // Additional check for valid line points
  if (!linePoints || linePoints.length < 4 || linePoints.some(point => !isFinite(point) || isNaN(point))) {
    return null
  }
  
  const color = getConnectionColor()
  const strokeWidth = getStrokeWidth()
  const opacity = getConnectionOpacity()

  // Ensure stroke width is valid
  if (!strokeWidth || strokeWidth <= 0 || !isFinite(strokeWidth)) {
    return null
  }

  return (
    <Group>
      {/* Simple straight connection line */}
      {linePoints && linePoints.length >= 4 && Math.abs(startX - endX) > 5 && (
        <Line
          points={linePoints}
          stroke={color}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          opacity={opacity}
          onClick={(e) => onClick(connection.id, e)}
          onTap={(e) => onClick(connection.id, e)}
        />
      )}
    </Group>
  )
}