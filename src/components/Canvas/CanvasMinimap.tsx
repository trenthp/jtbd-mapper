'use client'

import { useMemo } from 'react'
import { Stage, Layer, Group, Rect, Circle } from 'react-konva'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'
import { EntityWithRelations } from '@/lib/types'

interface CanvasMinimapProps {
  width?: number
  height?: number
  canvasWidth: number
  canvasHeight: number
  onViewportChange: (x: number, y: number) => void
}

export function CanvasMinimap({
  width = 200,
  height = 150,
  canvasWidth,
  canvasHeight,
  onViewportChange
}: CanvasMinimapProps) {
  const { viewport } = useCanvasStore()
  const { entities } = useEntityStore()

  // Calculate minimap scale and bounds
  const entitiesArray = Array.from(entities.values())
  const { minX, maxX, minY, maxY, minimapScale } = useMemo(() => {
    if (entitiesArray.length === 0) {
      return {
        minX: 0,
        maxX: 1000,
        minY: 0,
        maxY: 1000,
        minimapScale: 0.1
      }
    }

    const padding = 200
    const minX = Math.min(...entitiesArray.map(e => e.positionX)) - padding
    const maxX = Math.max(...entitiesArray.map(e => e.positionX + 200)) + padding // 200 = entity width
    const minY = Math.min(...entitiesArray.map(e => e.positionY)) - padding
    const maxY = Math.max(...entitiesArray.map(e => e.positionY + 120)) + padding // 120 = entity height

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    const scaleX = width / contentWidth
    const scaleY = height / contentHeight
    const minimapScale = Math.min(scaleX, scaleY, 0.2) // Max scale of 0.2

    return { minX, maxX, minY, maxY, minimapScale }
  }, [entitiesArray, width, height])

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    const viewportWorldWidth = canvasWidth / viewport.zoom
    const viewportWorldHeight = canvasHeight / viewport.zoom
    const viewportWorldX = -viewport.x / viewport.zoom
    const viewportWorldY = -viewport.y / viewport.zoom

    return {
      x: (viewportWorldX - minX) * minimapScale,
      y: (viewportWorldY - minY) * minimapScale,
      width: viewportWorldWidth * minimapScale,
      height: viewportWorldHeight * minimapScale
    }
  }, [viewport, canvasWidth, canvasHeight, minX, minY, minimapScale])

  // Handle minimap click to navigate
  const handleMinimapClick = (e: any) => {
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    // Convert minimap coordinates to world coordinates
    const worldX = (pointer.x / minimapScale) + minX
    const worldY = (pointer.y / minimapScale) + minY

    // Center the viewport on the clicked position
    const newViewportX = -(worldX * viewport.zoom) + canvasWidth / 2
    const newViewportY = -(worldY * viewport.zoom) + canvasHeight / 2

    onViewportChange(newViewportX, newViewportY)
  }

  // Get entity color based on type
  const getEntityColor = (type: string): string => {
    switch (type) {
      case 'user_job': return '#3b82f6'
      case 'business_objective': return '#f59e0b'
      case 'secondary_consideration': return '#8b5cf6'
      case 'functional_spec': return '#10b981'
      case 'content_requirement': return '#ec4899'
      case 'system_requirement': return '#06b6d4'
      case 'interaction_spec': return '#f97316'
      case 'information_architecture': return '#0ea5e9'
      case 'interface_element': return '#059669'
      case 'navigation_design': return '#c026d3'
      default: return '#6b7280'
    }
  }

  return (
    <div className="absolute top-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 border-b">
        Navigation
      </div>
      <Stage
        width={width}
        height={height}
        onClick={handleMinimapClick}
        style={{ cursor: 'pointer' }}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="#f9fafb"
          />

          {/* Entities as small dots */}
          {entitiesArray.map(entity => (
            <Circle
              key={entity.id}
              x={(entity.positionX + 100 - minX) * minimapScale} // +100 for entity center
              y={(entity.positionY + 60 - minY) * minimapScale} // +60 for entity center
              radius={2}
              fill={getEntityColor(entity.type)}
              opacity={0.8}
            />
          ))}

          {/* Viewport indicator */}
          <Rect
            x={Math.max(0, Math.min(width - viewportRect.width, viewportRect.x))}
            y={Math.max(0, Math.min(height - viewportRect.height, viewportRect.y))}
            width={Math.min(width, viewportRect.width)}
            height={Math.min(height, viewportRect.height)}
            fill="rgba(37, 99, 235, 0.2)"
            stroke="#2563eb"
            strokeWidth={1}
            dash={[3, 3]}
          />
        </Layer>
      </Stage>
    </div>
  )
}