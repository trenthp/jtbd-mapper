'use client'

import { useEffect, useState, useRef } from 'react'
import { LayerCanvas } from '@/components/Canvas/LayerCanvas'

interface ProjectCanvasProps {
  projectId: string
  currentLayer: number
  onCreateConnection: (fromEntityId: string, toEntityId: string) => void
  onNavigateToEntity: (entityId: string) => void
}

export function ProjectCanvas({ projectId, currentLayer, onCreateConnection, onNavigateToEntity }: ProjectCanvasProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        // Use container dimensions if available
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: rect.width,
            height: rect.height
          })
        } else {
          // Fallback: calculate approximate dimensions based on viewport minus sidebar
          const sidebarWidth = 320 // Approximate sidebar width
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          
          setDimensions({
            width: Math.max(viewportWidth - sidebarWidth, 400), // Ensure minimum width
            height: viewportHeight
          })
        }
      } else {
        // Initial fallback before ref is ready
        const sidebarWidth = 320
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        setDimensions({
          width: Math.max(viewportWidth - sidebarWidth, 400),
          height: viewportHeight
        })
      }
    }

    // Try multiple times with increasing delays
    const timers: NodeJS.Timeout[] = []
    timers.push(setTimeout(updateDimensions, 0))
    timers.push(setTimeout(updateDimensions, 50))
    timers.push(setTimeout(updateDimensions, 100))
    
    // Use ResizeObserver for ongoing updates once container is available
    let resizeObserver: ResizeObserver | null = null
    
    const setupResizeObserver = () => {
      if (containerRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect
            if (width > 0 && height > 0) {
              setDimensions({ width, height })
            }
          }
        })
        resizeObserver.observe(containerRef.current)
      }
    }
    
    timers.push(setTimeout(setupResizeObserver, 100))

    window.addEventListener('resize', updateDimensions)
    
    return () => {
      timers.forEach(clearTimeout)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  // Don't render LayerCanvas until we have valid dimensions
  if (dimensions.width === 0 || dimensions.height === 0) {
    return (
      <div className="w-full h-full relative bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading canvas...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <LayerCanvas
        width={dimensions.width}
        height={dimensions.height}
        layer={currentLayer}
        onCreateConnection={onCreateConnection}
        onNavigateToEntity={onNavigateToEntity}
      />
      
    </div>
  )
}