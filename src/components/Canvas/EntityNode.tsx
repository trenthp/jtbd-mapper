'use client'

import { Group, Rect, Text, Circle } from 'react-konva'
import Konva from 'konva'
import { EntityWithRelations, EntityVisual } from '@/lib/types'
import { typeDef } from '@/lib/entityTypes'
import {
  cardLayout, CARD_PADDING, TITLE_FONT, BODY_FONT, FIELD_FONT, TAG_FONT,
} from '@/lib/canvas/cardLayout'

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
  isConnectionMode?: boolean
  isConnectionTarget?: boolean
  isHovered?: boolean
  onConnectionPointHover?: (entityId: string, point: string) => void
  onConnectionPointLeave?: (entityId: string) => void
  onMouseEnter?: (entityId: string) => void
  onMouseLeave?: () => void
  onClick: (entityId: string, e: Konva.KonvaEventObject<MouseEvent>) => void
  onDoubleClick?: (entityId: string) => void
  onDragStart: (entityId: string) => boolean
  onDrag?: (entityId: string, position: { x: number, y: number }, altKey?: boolean) => void
  onDragEnd: (entityId: string, position: { x: number, y: number }) => void
}

const CORNER_RADIUS = 8
const FONT = 'Arial'

/**
 * A card on the canvas. Deliberately minimal: title and description only,
 * plus whichever optional fields (and tags) the user has added. Type is
 * conveyed by the card colour; connection handles appear only in Connect
 * mode.
 */
export function EntityNode({
  entity,
  visual,
  isSelected,
  isEditing = false,
  isInteractable = true,
  isConnectionMode = false,
  isConnectionTarget = false,
  isHovered = false,
  onConnectionPointHover,
  onConnectionPointLeave,
  onMouseEnter,
  onMouseLeave,
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
      onDrag(entity.id, { x: node.x(), y: node.y() }, e.evt?.altKey ?? false)
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

  const def = typeDef(entity.type)
  const layout = cardLayout(entity)
  const { width, height } = layout
  const innerWidth = width - CARD_PADDING * 2

  const anchors: Array<{ point: string; x: number; y: number }> = [
    { point: 'left', x: 0, y: height / 2 },
    { point: 'right', x: width, y: height / 2 },
    { point: 'top', x: width / 2, y: 0 },
    { point: 'bottom', x: width / 2, y: height },
  ]

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
      onTap={isInteractable ? (e) => onClick(entity.id, e as Konva.KonvaEventObject<MouseEvent>) : undefined}
      onDbltap={isInteractable ? () => onDoubleClick?.(entity.id) : undefined}
      onMouseEnter={isInteractable ? () => onMouseEnter?.(entity.id) : undefined}
      onMouseLeave={isInteractable ? () => onMouseLeave?.() : undefined}
      listening={isInteractable} // Disable all event listening for non-interactable entities
    >
      {/* Card */}
      <Rect
        width={width}
        height={height}
        fill={visual.backgroundColor || def.fill}
        stroke={isEditing ? "#3b82f6" : visual.borderColor} // Blue border when editing
        strokeWidth={isEditing ? 3 : (isSelected ? 3 : 2)}
        dash={isEditing ? [] : getDashPattern(visual.borderStyle)} // Solid border when editing
        cornerRadius={CORNER_RADIUS}
        opacity={visual.opacity}
        shadowEnabled={isSelected || visual.highlight || isEditing || isHovered}
        shadowColor={
          isEditing
            ? "rgba(59, 130, 246, 0.4)"
            : isHovered
              ? "rgba(0, 0, 0, 0.2)"
              : "rgba(0, 0, 0, 0.3)"
        }
        shadowBlur={isEditing ? 12 : (isSelected ? 8 : (isHovered ? 6 : 4))}
        shadowOffset={isHovered ? { x: 0, y: 4 } : { x: 2, y: 2 }}
      />

      {/* Title */}
      <Text
        x={CARD_PADDING}
        y={layout.title.y}
        width={innerWidth}
        height={layout.title.height}
        text={entity.title}
        fontSize={TITLE_FONT.size}
        lineHeight={TITLE_FONT.lineHeight}
        fontFamily={FONT}
        fill="#111827" // gray-900
        fontStyle="bold"
        wrap="word"
        ellipsis
      />

      {/* Description */}
      {layout.description && (
        <Text
          x={CARD_PADDING}
          y={layout.description.y}
          width={innerWidth}
          height={layout.description.height}
          text={entity.description ?? ''}
          fontSize={BODY_FONT.size}
          lineHeight={BODY_FONT.lineHeight}
          fontFamily={FONT}
          fill="#374151" // gray-700
          wrap="word"
          ellipsis
        />
      )}

      {/* Optional fields the user has added */}
      {layout.fields.map(f => (
        <Text
          key={f.key}
          x={CARD_PADDING}
          y={f.y}
          width={innerWidth}
          height={f.lines * FIELD_FONT.size * FIELD_FONT.lineHeight}
          text={`${f.label}: ${f.value}`}
          fontSize={FIELD_FONT.size}
          lineHeight={FIELD_FONT.lineHeight}
          fontFamily={FONT}
          fill="#4b5563" // gray-600
          wrap="word"
          ellipsis
        />
      ))}

      {/* Tags */}
      {layout.tags && (
        <Text
          x={CARD_PADDING}
          y={layout.tags.y}
          width={innerWidth}
          height={TAG_FONT.size * TAG_FONT.lineHeight}
          text={layout.tags.text}
          fontSize={TAG_FONT.size}
          lineHeight={TAG_FONT.lineHeight}
          fontFamily={FONT}
          fill="#6b7280" // gray-500
          wrap="none"
          ellipsis
        />
      )}

      {/* Connection handles: only while connecting */}
      {isConnectionMode && anchors.map(a => (
        <Circle
          key={a.point}
          x={a.x}
          y={a.y}
          radius={8}
          fill={isConnectionTarget ? "#10b981" : visual.borderColor}
          stroke="#ffffff"
          strokeWidth={2}
          onMouseEnter={() => onConnectionPointHover?.(entity.id, a.point)}
          onMouseLeave={() => onConnectionPointLeave?.(entity.id)}
        />
      ))}
    </Group>
  )
}
