'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { LayerCanvas } from '@/components/Canvas/LayerCanvas'
import { CanvasToolStrip } from '@/components/Workspace/CanvasToolStrip'
import { useCanvasStore } from '@/stores/canvasStore'
import { ENTITY_WIDTH, ENTITY_HEIGHT } from '@/lib/canvas/geometry'

interface ProjectCanvasProps {
  currentLayer: number
  onCreateEntity: (type: string, position: { x: number; y: number }) => void
  onCreateConnection: (fromEntityId: string, toEntityId: string) => void
  onNavigateToEntity: (entityId: string) => void
}

/** Measures its container and hosts the canvas plus the floating tool strip. */
export function ProjectCanvas({ currentLayer, onCreateEntity, onCreateConnection, onNavigateToEntity }: ProjectCanvasProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) setDimensions({ width: rect.width, height: rect.height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Place new entities at the centre of the visible area
  const createAtCenter = useCallback((type: string) => {
    const { viewport } = useCanvasStore.getState()
    onCreateEntity(type, {
      x: (dimensions.width / 2 - viewport.x) / viewport.zoom - ENTITY_WIDTH / 2,
      y: (dimensions.height / 2 - viewport.y) / viewport.zoom - ENTITY_HEIGHT / 2,
    })
  }, [dimensions, onCreateEntity])

  return (
    <div ref={containerRef} className="absolute inset-0">
      {dimensions.width > 0 && dimensions.height > 0 ? (
        <LayerCanvas
          width={dimensions.width}
          height={dimensions.height}
          layer={currentLayer}
          onCreateConnection={onCreateConnection}
          onNavigateToEntity={onNavigateToEntity}
        />
      ) : (
        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-500">Loading canvas…</div>
      )}
      <CanvasToolStrip onCreateEntity={createAtCenter} />
    </div>
  )
}
