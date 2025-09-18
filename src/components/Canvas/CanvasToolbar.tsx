'use client'

import { MousePointer, Hand, Zap } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvasStore'
import { CanvasTool } from '@/lib/types'

export function CanvasToolbar() {
  const { currentTool, connectionMode, setCurrentTool, setConnectionMode } = useCanvasStore()

  const tools: Array<{ tool: CanvasTool; icon: React.ElementType; label: string; shortcut?: string }> = [
    {
      tool: { type: 'select', cursor: 'default' },
      icon: MousePointer,
      label: 'Select',
      shortcut: 'V'
    },
    {
      tool: { type: 'pan', cursor: 'grab' },
      icon: Hand,
      label: 'Pan',
      shortcut: 'H'
    }
  ]

  const handleToolChange = (tool: CanvasTool) => {
    setCurrentTool(tool)
    if (tool.type !== 'connect') {
      // Exit connection mode when switching to other tools
      setConnectionMode({ isActive: false, fromEntityId: undefined })
    }
  }

  const handleConnectionToggle = () => {
    const newConnectionMode = !connectionMode.isActive
    setConnectionMode({
      isActive: newConnectionMode,
      fromEntityId: undefined
    })

    // When entering connection mode, switch to select tool
    if (newConnectionMode) {
      setCurrentTool({ type: 'select', cursor: 'crosshair' })
    } else {
      setCurrentTool({ type: 'select', cursor: 'default' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Mode Toggle */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Connection Mode</h3>
        <button
          onClick={handleConnectionToggle}
          className={`w-full p-3 text-left rounded-lg border transition-colors ${
            connectionMode.isActive
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Zap className={`h-5 w-5 ${connectionMode.isActive ? 'text-blue-600' : 'text-gray-600'}`} />
            <div>
              <div className="font-medium text-sm">
                {connectionMode.isActive ? 'Exit Connect Mode' : 'Connect Mode'}
              </div>
              <div className="text-xs text-gray-500">
                {connectionMode.isActive ? 'Click entities to connect' : 'Link entities together'}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Canvas Tools */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Canvas Tools</h3>
        <div className="space-y-2">
          {tools.map((toolData, index) => {
            const IconComponent = toolData.icon
            const isActive = currentTool.type === toolData.tool.type && !connectionMode.isActive

            return (
              <button
                key={index}
                onClick={() => handleToolChange(toolData.tool)}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {toolData.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {toolData.tool.type === 'select' && 'Select and move entities'}
                      {toolData.tool.type === 'pan' && 'Pan around the canvas'}
                    </div>
                  </div>
                  {toolData.shortcut && (
                    <div className="text-xs text-gray-400 font-mono">
                      {toolData.shortcut}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tool Tips */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
        <div><strong>Space</strong> - Hold to pan</div>
        <div><strong>Middle Mouse</strong> - Click to pan</div>
        <div><strong>Wheel</strong> - Zoom in/out</div>
      </div>
    </div>
  )
}