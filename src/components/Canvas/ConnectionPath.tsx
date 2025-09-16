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

  // Calculate control points for curved connection
  const controlPoint1X = startX + (endX - startX) * 0.5
  const controlPoint1Y = startY
  const controlPoint2X = startX + (endX - startX) * 0.5
  const controlPoint2Y = endY

  // Generate smooth curve points
  const generateCurvePoints = (): number[] => {
    const points: number[] = []
    const steps = 20
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      
      // Cubic Bezier curve calculation
      const x = Math.pow(1 - t, 3) * startX +
                3 * Math.pow(1 - t, 2) * t * controlPoint1X +
                3 * (1 - t) * Math.pow(t, 2) * controlPoint2X +
                Math.pow(t, 3) * endX
                
      const y = Math.pow(1 - t, 3) * startY +
                3 * Math.pow(1 - t, 2) * t * controlPoint1Y +
                3 * (1 - t) * Math.pow(t, 2) * controlPoint2Y +
                Math.pow(t, 3) * endY
      
      points.push(x, y)
    }
    
    return points
  }

  // Get color based on connection type and cross-layer status
  const getConnectionColor = (): string => {
    // Gray out if connection involves a dragged entity
    if (isDraggedConnection) return '#9ca3af' // gray-400
    
    if (isSelected) return '#2563eb' // blue-600
    
    // Brighter colors for cross-layer connections
    const baseColors = {
      'SUPPORTS': isCrossLayer ? '#059669' : '#10b981', // emerald-600/500
      'DERIVES_FROM': isCrossLayer ? '#d97706' : '#f59e0b', // amber-600/500
      'CONFLICTS_WITH': isCrossLayer ? '#dc2626' : '#ef4444', // red-600/500
      'INFORMS': isCrossLayer ? '#7c3aed' : '#8b5cf6', // violet-600/500
    }
    
    return baseColors[connection.connectionType] || (isCrossLayer ? '#4b5563' : '#6b7280') // gray-600/500
  }

  // Get stroke width based on connection strength and cross-layer status
  const getStrokeWidth = (): number => {
    const baseWidth = isSelected ? 3 : 2
    const crossLayerBonus = isCrossLayer ? 1 : 0
    
    switch (connection.strength) {
      case 'STRONG':
        return baseWidth + 1 + crossLayerBonus
      case 'WEAK':
        return Math.max(1, baseWidth - 0.5 + crossLayerBonus)
      case 'MEDIUM':
      default:
        return baseWidth + crossLayerBonus
    }
  }

  // Get dash pattern for visual distinction
  const getDashPattern = (): number[] => {
    if (connection.connectionType === 'CONFLICTS_WITH') {
      return [8, 4]
    }
    // Double-dash pattern for cross-layer connections
    if (isCrossLayer) {
      return [6, 3, 2, 3]
    }
    return []
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

  const curvePoints = generateCurvePoints()
  
  // Additional check for valid curve points
  if (!curvePoints || curvePoints.length < 4 || curvePoints.some(point => !isFinite(point) || isNaN(point))) {
    return null
  }
  
  const color = getConnectionColor()
  const strokeWidth = getStrokeWidth()
  const dashPattern = getDashPattern()
  const opacity = getConnectionOpacity()
  
  // Ensure stroke width is valid
  if (!strokeWidth || strokeWidth <= 0 || !isFinite(strokeWidth)) {
    return null
  }

  // Additional validation for arrow points
  const arrowPoints = [endX, endY, endX - 15, endY - 5, endX - 15, endY + 5, endX, endY]
  if (arrowPoints.some(point => !isFinite(point) || isNaN(point))) {
    return null
  }

  // Calculate label position (midpoint of curve)
  const labelX = (startX + endX) / 2
  const labelY = (startY + endY) / 2 - 10

  return (
    <Group>
      {/* Main connection line */}
      {curvePoints && curvePoints.length >= 4 && Math.abs(startX - endX) > 5 && (
        <Line
          points={curvePoints}
          stroke={color}
          strokeWidth={strokeWidth}
          dash={dashPattern}
          lineCap="round"
          lineJoin="round"
          opacity={opacity}
          tension={0.3}
          onClick={(e) => onClick(connection.id, e)}
          onTap={(e) => onClick(connection.id, e)}
        />
      )}
      
      {/* Arrow head - using Line to create triangle */}
      {strokeWidth > 0 && isFinite(endX) && isFinite(endY) && Math.abs(startX - endX) > 15 && (
        <Line
          points={arrowPoints}
          fill={color}
          stroke={color}
          strokeWidth={1}
          closed={true}
          opacity={opacity}
          onClick={(e) => onClick(connection.id, e)}
          onTap={(e) => onClick(connection.id, e)}
        />
      )}
      
      {/* Connection type label */}
      {isSelected && (
        <Group>
          {/* Label background */}
          <Text
            x={labelX - 60}
            y={labelY - 8}
            text={`    ${connection.connectionType.replace('_', ' ')}${isCrossLayer ? ' (L' + fromEntity.layer + '→L' + toEntity.layer + ')' : ''}    `}
            fontSize={10}
            fontFamily="Arial"
            fill="white"
            background={isCrossLayer ? "#1f2937" : "#000000"}
            cornerRadius={4}
            padding={4}
          />
          
          {/* Label text */}
          <Text
            x={labelX - 55}
            y={labelY - 5}
            text={`${connection.connectionType.replace('_', ' ')}${isCrossLayer ? ' (L' + fromEntity.layer + '→L' + toEntity.layer + ')' : ''}`}
            fontSize={10}
            fontFamily="Arial"
            fill={color}
            fontStyle="bold"
          />
        </Group>
      )}
      
      {/* Strength indicator */}
      {isSelected && connection.strength !== 'MEDIUM' && (
        <Text
          x={labelX - 15}
          y={labelY + 10}
          text={connection.strength.toLowerCase()}
          fontSize={8}
          fontFamily="Arial"
          fill="#6b7280"
          fontStyle="italic"
        />
      )}
      
      {/* Navigation indicators for cross-layer connections */}
      {isCrossLayer && onNavigateToEntity && (
        <Group>
          {/* Navigate to fromEntity indicator */}
          <Circle
            x={startX - 15}
            y={startY}
            radius={8}
            fill={color}
            stroke="#ffffff"
            strokeWidth={2}
            opacity={0.9}
            onClick={() => onNavigateToEntity(fromEntity.id)}
            onTap={() => onNavigateToEntity(fromEntity.id)}
          />
          <Text
            x={startX - 18}
            y={startY - 4}
            text="→"
            fontSize={10}
            fontFamily="Arial"
            fill="white"
            fontStyle="bold"
            onClick={() => onNavigateToEntity(fromEntity.id)}
            onTap={() => onNavigateToEntity(fromEntity.id)}
          />
          
          {/* Navigate to toEntity indicator */}
          <Circle
            x={endX + 15}
            y={endY}
            radius={8}
            fill={color}
            stroke="#ffffff"
            strokeWidth={2}
            opacity={0.9}
            onClick={() => onNavigateToEntity(toEntity.id)}
            onTap={() => onNavigateToEntity(toEntity.id)}
          />
          <Text
            x={endX + 12}
            y={endY - 4}
            text="→"
            fontSize={10}
            fontFamily="Arial"
            fill="white"
            fontStyle="bold"
            onClick={() => onNavigateToEntity(toEntity.id)}
            onTap={() => onNavigateToEntity(toEntity.id)}
          />
        </Group>
      )}
    </Group>
  )
}