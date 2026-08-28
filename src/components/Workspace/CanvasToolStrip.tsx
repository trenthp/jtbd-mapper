'use client'

import { useEffect, useRef, useState } from 'react'
import { MousePointer2, Hand, Zap, Plus, ChevronUp, Grid3x3, Layers, Maximize2 } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvasStore'
import { defaultTypeForLayer, typesForLayer, EntityTypeDef } from '@/lib/entityTypes'

interface CanvasToolStripProps {
  /** Create an entity of `type` at the centre of the current view */
  onCreateEntity: (type: string) => void
}

const btn = (active: boolean) =>
  `inline-flex items-center justify-center h-11 w-11 lg:h-10 lg:w-10 rounded-lg transition-colors ${
    active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
  }`

/** Floating mode/view controls, bottom-centre of the canvas. */
export function CanvasToolStrip({ onCreateEntity }: CanvasToolStripProps) {
  const currentTool = useCanvasStore(s => s.currentTool)
  const connectionMode = useCanvasStore(s => s.connectionMode)
  const gridSettings = useCanvasStore(s => s.gridSettings)
  const showAdjacent = useCanvasStore(s => s.showAdjacentLayers)
  const currentLayer = useCanvasStore(s => s.currentLayer)
  const viewActions = useCanvasStore(s => s.viewActions)
  const setCurrentTool = useCanvasStore(s => s.setCurrentTool)
  const setConnectionMode = useCanvasStore(s => s.setConnectionMode)
  const setGridSettings = useCanvasStore(s => s.setGridSettings)
  const setShowAdjacent = useCanvasStore(s => s.setShowAdjacentLayers)

  const [typesOpen, setTypesOpen] = useState(false)
  const typesRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!typesOpen) return
    const close = (e: PointerEvent) => {
      if (!typesRef.current?.contains(e.target as Node)) setTypesOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [typesOpen])

  const selectTool = () => {
    setConnectionMode({ isActive: false, fromEntityId: undefined })
    setCurrentTool({ type: 'select', cursor: 'default' })
  }
  const panTool = () => {
    setConnectionMode({ isActive: false, fromEntityId: undefined })
    setCurrentTool({ type: 'pan', cursor: 'grab' })
  }
  const toggleConnect = () => {
    const next = !connectionMode.isActive
    setConnectionMode({ isActive: next, fromEntityId: undefined })
    setCurrentTool({ type: 'select', cursor: next ? 'crosshair' : 'default' })
  }

  const defaultType = defaultTypeForLayer(currentLayer)
  const types = typesForLayer(currentLayer)
  const create = (t: EntityTypeDef) => { setTypesOpen(false); onCreateEntity(t.type) }

  const selectActive = currentTool.type === 'select' && !connectionMode.isActive

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-3 lg:bottom-4 z-20 safe-bottom pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 p-1 bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg">
        <button onClick={selectTool} className={btn(selectActive)} title="Select (V)" aria-label="Select tool" aria-pressed={selectActive}>
          <MousePointer2 className="h-5 w-5" />
        </button>
        <button onClick={panTool} className={btn(currentTool.type === 'pan')} title="Pan (H)" aria-label="Pan tool" aria-pressed={currentTool.type === 'pan'}>
          <Hand className="h-5 w-5" />
        </button>
        <button onClick={toggleConnect} className={btn(connectionMode.isActive)} title="Connect entities (C)" aria-label="Connect tool" aria-pressed={connectionMode.isActive}>
          <Zap className="h-5 w-5" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-0.5" />

        {/* Add: primary click creates the layer's default type; chevron picks a type */}
        <div className="relative flex items-center" ref={typesRef}>
          <button
            onClick={() => create(defaultType)}
            className="inline-flex items-center gap-1.5 h-11 lg:h-10 pl-3 pr-2 rounded-l-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
            title={`Add ${defaultType.name} (Ctrl+Shift+N)`}
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add</span>
          </button>
          <button
            onClick={() => setTypesOpen(o => !o)}
            className="inline-flex items-center justify-center h-11 lg:h-10 w-8 rounded-r-lg bg-blue-600 text-white hover:bg-blue-700 border-l border-blue-500"
            title="Choose entity type"
            aria-label="Choose entity type"
            aria-expanded={typesOpen}
          >
            <ChevronUp className={`h-4 w-4 transition-transform ${typesOpen ? 'rotate-180' : ''}`} />
          </button>
          {typesOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-60 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Add to layer {currentLayer}</div>
              {types.map(t => (
                <button
                  key={t.type}
                  onClick={() => create(t)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <t.icon className={`h-4 w-4 ${t.color}`} />
                  {t.name}
                  {t.type === defaultType.type && <span className="ml-auto text-xs text-gray-400">default</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-0.5" />

        <button
          onClick={() => setGridSettings({ snapToGrid: !gridSettings.snapToGrid })}
          className={btn(gridSettings.snapToGrid)}
          title={gridSettings.snapToGrid ? 'Snap to grid: on' : 'Snap to grid: off'}
          aria-label="Toggle snap to grid"
          aria-pressed={gridSettings.snapToGrid}
        >
          <Grid3x3 className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowAdjacent(!showAdjacent)}
          className={btn(showAdjacent)}
          title={showAdjacent ? 'Adjacent layers: shown' : 'Adjacent layers: hidden'}
          aria-label="Toggle adjacent layers"
          aria-pressed={showAdjacent}
        >
          <Layers className="h-5 w-5" />
        </button>
        <button onClick={() => viewActions.zoomToFit?.()} className={btn(false)} title="Zoom to fit (Ctrl+0)" aria-label="Zoom to fit">
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
