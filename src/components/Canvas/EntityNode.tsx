'use client'

import { Group, Rect, Text, Circle } from 'react-konva'
import Konva from 'konva'
import { EntityWithRelations, EntityVisual } from '@/lib/types'

interface EntityNodeProps {
  entity: EntityWithRelations
  visual: Partial<EntityVisual> & { 
    borderColor: string
    borderStyle: 'solid' | 'dashed' | 'dotted'
    opacity: number
    highlight: boolean
  }
  isSelected: boolean
  isDragging: boolean
  isEditing?: boolean
  isInteractable?: boolean
  onClick: (entityId: string, e: Konva.KonvaEventObject<MouseEvent>) => void
  onDoubleClick?: (entityId: string) => void
  onDragStart: (entityId: string) => boolean
  onDrag?: (entityId: string, position: { x: number, y: number }) => void
  onDragEnd: (entityId: string, position: { x: number, y: number }) => void
}

const ENTITY_WIDTH = 200
const ENTITY_HEIGHT = 120
const CORNER_RADIUS = 8

export function EntityNode({
  entity,
  visual,
  isSelected,
  isDragging,
  isEditing = false,
  isInteractable = true,
  onClick,
  onDoubleClick,
  onDragStart,
  onDrag,
  onDragEnd
}: EntityNodeProps) {
  
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Don't process drag end if entity is being edited
    if (isEditing) {
      return
    }
    
    const node = e.target
    const newPosition = {
      x: node.x(),
      y: node.y()
    }
    onDragEnd(entity.id, newPosition)
  }

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    const canDrag = onDragStart(entity.id)
    if (!canDrag) {
      e.evt.preventDefault()
      return false
    }
  }

  const handleDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (onDrag) {
      const node = e.target
      onDrag(entity.id, {
        x: node.x(),
        y: node.y()
      })
    }
  }

  // Get dash pattern based on border style
  const getDashPattern = (style: 'solid' | 'dashed' | 'dotted'): number[] => {
    switch (style) {
      case 'dashed':
        return [10, 5]
      case 'dotted':
        return [3, 3]
      default:
        return []
    }
  }

  // Get background color based on entity type
  const getBackgroundColor = (type: string): string => {
    switch (type) {
      case 'user_job':
        return '#dbeafe' // blue-100
      case 'business_objective':
        return '#fef3c7' // amber-100
      case 'secondary_consideration':
        return '#f3e8ff' // violet-100
      case 'functional_spec':
        return '#dcfce7' // green-100
      case 'content_requirement':
        return '#fce7f3' // pink-100
      case 'system_requirement':
        return '#e0f2fe' // sky-100
      case 'interaction_spec':
        return '#fef7ed' // orange-100
      case 'information_architecture':
        return '#f0f9ff' // sky-50
      case 'interface_element':
        return '#ecfdf5' // emerald-100
      case 'navigation_design':
        return '#fdf4ff' // fuchsia-50
      default:
        return '#f9fafb' // gray-50
    }
  }

  // Get type label for display
  const getTypeLabel = (type: string): string => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }


  // Safely parse tags from JSON
  const getTags = (): string[] => {
    try {
      if (typeof entity.tags === 'string') {
        return JSON.parse(entity.tags) || []
      }
      if (Array.isArray(entity.tags)) {
        return entity.tags
      }
      return []
    } catch {
      return []
    }
  }

  const tags = getTags()

  return (
    <Group
      x={entity.positionX}
      y={entity.positionY}
      draggable={isInteractable && !isEditing}
      onDragStart={isInteractable ? handleDragStart : undefined}
      onDrag={isInteractable ? handleDrag : undefined}
      onDragEnd={isInteractable ? handleDragEnd : undefined}
      onClick={isInteractable ? (e) => onClick(entity.id, e) : undefined}
      onDblClick={isInteractable ? () => onDoubleClick?.(entity.id) : undefined}
      onTap={isInteractable ? (e) => onClick(entity.id, e) : undefined}
      onDbltap={isInteractable ? () => onDoubleClick?.(entity.id) : undefined}
      listening={isInteractable} // Disable all event listening for non-interactable entities
    >
      {/* Main entity rectangle */}
      <Rect
        width={ENTITY_WIDTH}
        height={ENTITY_HEIGHT}
        fill={visual.backgroundColor || getBackgroundColor(entity.type)}
        stroke={isEditing ? "#3b82f6" : visual.borderColor} // Blue border when editing
        strokeWidth={isEditing ? 3 : (isSelected ? 3 : 2)}
        dash={isEditing ? [] : getDashPattern(visual.borderStyle)} // Solid border when editing
        cornerRadius={CORNER_RADIUS}
        opacity={visual.opacity}
        shadowEnabled={isSelected || visual.highlight || isEditing}
        shadowColor={isEditing ? "rgba(59, 130, 246, 0.4)" : "rgba(0, 0, 0, 0.3)"} // Blue glow when editing
        shadowBlur={isEditing ? 12 : (isSelected ? 8 : 4)}
        shadowOffset={{ x: 2, y: 2 }}
      />
      
      {/* Entity type indicator */}
      <Rect
        x={0}
        y={0}
        width={ENTITY_WIDTH}
        height={24}
        fill={visual.borderColor}
        opacity={0.1}
        cornerRadius={[CORNER_RADIUS, CORNER_RADIUS, 0, 0]}
      />
      
      {/* Type label */}
      <Text
        x={8}
        y={6}
        text={getTypeLabel(entity.type)}
        fontSize={11}
        fontFamily="Arial"
        fill={visual.borderColor}
        fontStyle="bold"
      />
      
      {/* Layer indicator */}
      <Circle
        x={ENTITY_WIDTH - 20}
        y={12}
        radius={8}
        fill={visual.borderColor}
        opacity={0.8}
      />
      
      <Text
        x={ENTITY_WIDTH - 24}
        y={8}
        text={entity.layer.toString()}
        fontSize={10}
        fontFamily="Arial"
        fill="white"
        fontStyle="bold"
        align="center"
        width={8}
      />
      
      {/* Entity title */}
      <Text
        x={8}
        y={32}
        text={entity.title}
        fontSize={13}
        fontFamily="Arial"
        fill="#111827" // gray-900 - higher contrast
        fontStyle="bold"
        width={ENTITY_WIDTH - 16}
        height={18}
        wrap="word"
        ellipsis={true}
      />
      
      {/* Entity description */}
      {entity.description && (
        <Text
          x={8}
          y={54}
          text={entity.description}
          fontSize={10}
          fontFamily="Arial"
          fill="#374151" // gray-700 - better contrast
          width={ENTITY_WIDTH - 16}
          height={46}
          wrap="word"
          ellipsis={true}
        />
      )}
      
      {/* Tags */}
      {tags.length > 0 && (
        <Text
          x={8}
          y={ENTITY_HEIGHT - 18}
          text={`#${tags.slice(0, 3).join(' #')}${tags.length > 3 ? '...' : ''}`}
          fontSize={9}
          fontFamily="Arial"
          fill="#6b7280" // gray-500 - improved contrast
          width={ENTITY_WIDTH - 16}
          wrap="word"
          ellipsis={true}
        />
      )}
      
      {/* Editing indicator */}
      {isEditing && (
        <Text
          x={ENTITY_WIDTH - 55}
          y={6}
          text="EDITING"
          fontSize={8}
          fontFamily="Arial"
          fill="#3b82f6"
          fontStyle="bold"
          opacity={0.8}
        />
      )}
      
      {/* Connection points */}
      <Circle
        x={0}
        y={ENTITY_HEIGHT / 2}
        radius={5}
        fill={visual.borderColor}
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.8}
        visible={isSelected || isDragging}
      />
      
      <Circle
        x={ENTITY_WIDTH}
        y={ENTITY_HEIGHT / 2}
        radius={5}
        fill={visual.borderColor}
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.8}
        visible={isSelected || isDragging}
      />
      
      <Circle
        x={ENTITY_WIDTH / 2}
        y={0}
        radius={5}
        fill={visual.borderColor}
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.8}
        visible={isSelected || isDragging}
      />
      
      <Circle
        x={ENTITY_WIDTH / 2}
        y={ENTITY_HEIGHT}
        radius={5}
        fill={visual.borderColor}
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.8}
        visible={isSelected || isDragging}
      />
    </Group>
  )
}