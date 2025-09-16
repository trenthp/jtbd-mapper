'use client'

import { useEffect, useState, useRef } from 'react'
import { LayerCanvas } from '@/components/Canvas/LayerCanvas'
import { useCanvasStore } from '@/stores/canvasStore'
import { Link2 } from 'lucide-react'

interface ProjectCanvasProps {
  projectId: string
  currentLayer: number
  onCreateConnection: (fromEntityId: string, toEntityId: string) => void
  onNavigateToEntity: (entityId: string) => void
}

export function ProjectCanvas({ projectId, currentLayer, onCreateConnection, onNavigateToEntity }: ProjectCanvasProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const { connectionMode, setConnectionMode } = useCanvasStore()
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
      
      {/* Canvas tools positioned below layer tabs */}
      <div className="absolute top-80 right-6 flex flex-col gap-2 items-end z-10">
        <div className="bg-white rounded-lg shadow-lg p-3 min-w-[160px]">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Layer {currentLayer} View
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {connectionMode.isActive 
              ? 'Click entities to connect them'
              : 'Scroll to zoom • Drag to pan • Double-click to edit'
            }
          </div>
          {/* Layer visibility indicator */}
          <div className="text-xs text-gray-400 flex items-center gap-1">
            {currentLayer > 1 && (
              <span className="opacity-60">L{currentLayer - 1} below</span>
            )}
            {currentLayer > 1 && currentLayer < 4 && (
              <span className="text-gray-300">•</span>
            )}
            {currentLayer < 4 && (
              <span className="opacity-40">L{currentLayer + 1} above</span>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setConnectionMode({ 
            isActive: !connectionMode.isActive, 
            fromEntityId: undefined 
          })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors min-w-[160px] justify-center ${
            connectionMode.isActive
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Link2 className="h-4 w-4" />
          {connectionMode.isActive ? 'Exit Connect' : 'Connect Mode'}
        </button>
      </div>
    </div>
  )
}