'use client'

import { useMemo } from 'react'
import { Group, Line } from 'react-konva'
import { GridSettings, Viewport } from '@/lib/types'

interface CanvasGridProps {
  gridSettings: GridSettings
  viewport: Viewport
  canvasWidth: number
  canvasHeight: number
}

export function CanvasGrid({ gridSettings, viewport, canvasWidth, canvasHeight }: CanvasGridProps) {
  const gridLines = useMemo(() => {
    if (!gridSettings.isVisible) {
      return { vertical: [], horizontal: [] }
    }

    const { gridSize } = gridSettings
    const { x: viewportX, y: viewportY, zoom } = viewport

    // Calculate visible world bounds
    const worldLeft = (-viewportX) / zoom
    const worldRight = (-viewportX + canvasWidth) / zoom
    const worldTop = (-viewportY) / zoom
    const worldBottom = (-viewportY + canvasHeight) / zoom

    // Calculate grid line positions
    const vertical: number[] = []
    const horizontal: number[] = []

    // Add some padding to ensure grid lines cover the entire visible area
    const padding = gridSize * 2

    // Calculate vertical grid lines
    const startX = Math.floor((worldLeft - padding) / gridSize) * gridSize
    const endX = Math.ceil((worldRight + padding) / gridSize) * gridSize
    for (let x = startX; x <= endX; x += gridSize) {
      vertical.push(x)
    }

    // Calculate horizontal grid lines
    const startY = Math.floor((worldTop - padding) / gridSize) * gridSize
    const endY = Math.ceil((worldBottom + padding) / gridSize) * gridSize
    for (let y = startY; y <= endY; y += gridSize) {
      horizontal.push(y)
    }

    return { vertical, horizontal }
  }, [gridSettings.isVisible, gridSettings.gridSize, viewport, canvasWidth, canvasHeight])

  if (!gridSettings.isVisible) {
    return null
  }

  const worldLeft = (-viewport.x) / viewport.zoom
  const worldRight = (-viewport.x + canvasWidth) / viewport.zoom
  const worldTop = (-viewport.y) / viewport.zoom
  const worldBottom = (-viewport.y + canvasHeight) / viewport.zoom

  return (
    <Group opacity={gridSettings.gridOpacity}>
      {/* Vertical grid lines */}
      {gridLines.vertical.map((x, index) => (
        <Line
          key={`vertical-${index}`}
          points={[x, worldTop, x, worldBottom]}
          stroke={gridSettings.gridColor}
          strokeWidth={1 / viewport.zoom} // Keep consistent thickness regardless of zoom
        />
      ))}

      {/* Horizontal grid lines */}
      {gridLines.horizontal.map((y, index) => (
        <Line
          key={`horizontal-${index}`}
          points={[worldLeft, y, worldRight, y]}
          stroke={gridSettings.gridColor}
          strokeWidth={1 / viewport.zoom} // Keep consistent thickness regardless of zoom
        />
      ))}
    </Group>
  )
}

// Helper function to snap a position to grid
export function snapToGrid(position: { x: number, y: number }, gridSize: number): { x: number, y: number } {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize
  }
}