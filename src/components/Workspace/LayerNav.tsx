'use client'

import { useState } from 'react'
import { Layers, Eye, EyeOff } from 'lucide-react'
import { LAYERS, LayerDef } from '@/lib/entityTypes'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'

const TONES: Record<LayerDef['tone'], { active: string; dot: string }> = {
  blue: { active: 'bg-blue-600 text-white', dot: 'bg-blue-500' },
  green: { active: 'bg-green-600 text-white', dot: 'bg-green-500' },
  purple: { active: 'bg-purple-600 text-white', dot: 'bg-purple-500' },
  orange: { active: 'bg-orange-600 text-white', dot: 'bg-orange-500' },
}

const iconBtn = (active: boolean) =>
  `inline-flex items-center justify-center h-9 w-9 rounded-md transition-colors ${
    active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

/**
 * Floating layer navigation, top-left of the canvas. Collapsed it shows the
 * current layer; expanded it lists all four as a vertical accordion. Also
 * hosts the adjacent-layer visibility toggle, since that is a layer concern.
 */
export function LayerNav() {
  const currentLayer = useCanvasStore(s => s.currentLayer)
  const setCurrentLayer = useCanvasStore(s => s.setCurrentLayer)
  const showAdjacent = useCanvasStore(s => s.showAdjacentLayers)
  const setShowAdjacent = useCanvasStore(s => s.setShowAdjacentLayers)
  const entities = useEntityStore(s => s.entities)
  const flagged = useEntityStore(s => s.reconciliationStates)

  const [expanded, setExpanded] = useState(false)

  const counts = new Map<number, number>()
  const flags = new Map<number, number>()
  entities.forEach(e => {
    counts.set(e.layer, (counts.get(e.layer) ?? 0) + 1)
    if (flagged.has(e.id)) flags.set(e.layer, (flags.get(e.layer) ?? 0) + 1)
  })

  const visible = expanded ? LAYERS : LAYERS.filter(l => l.id === currentLayer)

  const choose = (id: number) => {
    setCurrentLayer(id)
    setExpanded(false)
  }

  return (
    <div className="absolute left-3 top-3 z-20 pointer-events-none">
      <div className="pointer-events-auto w-56 max-w-[calc(100vw-1.5rem)] bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {/* Control row */}
        <div className="flex items-center gap-1 p-1 border-b border-gray-100">
          <button
            onClick={() => setExpanded(o => !o)}
            className={iconBtn(expanded)}
            title={expanded ? 'Collapse layers' : 'Show all layers'}
            aria-label="Toggle layer list"
            aria-expanded={expanded}
          >
            <Layers className="h-5 w-5" />
          </button>
          <span className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
            {expanded ? 'Layers' : `Layer ${currentLayer}`}
          </span>
          <button
            onClick={() => setShowAdjacent(!showAdjacent)}
            className={iconBtn(false)}
            title={showAdjacent ? 'Adjacent layers: shown' : 'Adjacent layers: hidden'}
            aria-label="Toggle adjacent layers"
            aria-pressed={showAdjacent}
          >
            {showAdjacent ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
          </button>
        </div>

        {/* Layer rows */}
        <div role="tablist" aria-label="Layer" aria-orientation="vertical" className="p-1 flex flex-col gap-0.5">
          {visible.map(layer => {
            const active = layer.id === currentLayer
            const tone = TONES[layer.tone]
            const flagCount = flags.get(layer.id) ?? 0
            return (
              <button
                key={layer.id}
                role="tab"
                aria-selected={active}
                onClick={() => (expanded ? choose(layer.id) : setExpanded(true))}
                title={expanded ? layer.blurb : 'Show all layers'}
                className={`relative w-full flex items-center gap-2 px-2 h-10 lg:h-9 rounded-md text-sm font-medium text-left transition-colors ${
                  active && expanded ? tone.active : 'text-gray-800 hover:bg-gray-100'
                }`}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${active && expanded ? 'bg-white/80' : tone.dot}`} />
                <span className="flex-1 truncate">
                  <span className="text-gray-400 mr-1 font-normal">{layer.id}</span>
                  {layer.name}
                </span>
                {flagCount > 0 && (
                  <span
                    className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
                    title={`${flagCount} flagged for review`}
                  />
                )}
                <span
                  className={`text-xs px-1.5 rounded-full tabular-nums ${
                    active && expanded ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {counts.get(layer.id) ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
