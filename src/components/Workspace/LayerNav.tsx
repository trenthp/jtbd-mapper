'use client'

import { useEffect, useRef, useState } from 'react'
import { Layers, PanelLeft, Eye, EyeOff, Check } from 'lucide-react'
import { LAYERS, LayerDef } from '@/lib/entityTypes'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'
import { useUIStore } from '@/stores/uiStore'

const TONES: Record<LayerDef['tone'], { dot: string; active: string }> = {
  blue: { dot: 'bg-blue-500', active: 'bg-blue-50 text-blue-900' },
  green: { dot: 'bg-green-500', active: 'bg-green-50 text-green-900' },
  purple: { dot: 'bg-purple-500', active: 'bg-purple-50 text-purple-900' },
  orange: { dot: 'bg-orange-500', active: 'bg-orange-50 text-orange-900' },
}

const iconBtn = (active: boolean) =>
  `inline-flex items-center justify-center h-11 w-11 lg:h-10 lg:w-10 rounded-lg transition-colors ${
    active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
  }`

/**
 * Floating layer navigation, top-left of the canvas. Collapsed: the current
 * layer plus an expand toggle, with the outline toggle beneath. Expanded: all
 * layers stacked vertically and the adjacent-layer visibility switch.
 */
export function LayerNav() {
  const currentLayer = useCanvasStore(s => s.currentLayer)
  const setCurrentLayer = useCanvasStore(s => s.setCurrentLayer)
  const showAdjacent = useCanvasStore(s => s.showAdjacentLayers)
  const setShowAdjacent = useCanvasStore(s => s.setShowAdjacentLayers)
  const entities = useEntityStore(s => s.entities)
  const flagged = useEntityStore(s => s.reconciliationStates)
  const outlineOpen = useUIStore(s => s.outlineOpen)
  const toggleOutline = useUIStore(s => s.toggleOutline)

  const [expanded, setExpanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!expanded) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setExpanded(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [expanded])

  const counts = new Map<number, number>()
  const flags = new Map<number, number>()
  entities.forEach(e => {
    counts.set(e.layer, (counts.get(e.layer) ?? 0) + 1)
    if (flagged.has(e.id)) flags.set(e.layer, (flags.get(e.layer) ?? 0) + 1)
  })

  const current = LAYERS.find(l => l.id === currentLayer) ?? LAYERS[0]
  const pick = (id: number) => { setCurrentLayer(id); setExpanded(false) }

  return (
    <div ref={ref} className="absolute left-3 top-3 z-20 flex flex-col items-start gap-2 max-w-[calc(100%-1.5rem)]">
      <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg overflow-hidden w-64 max-w-full">
        {/* Current layer + expand toggle */}
        <div className="flex items-center gap-1 p-1">
          <button
            onClick={() => setExpanded(o => !o)}
            className="flex-1 min-w-0 inline-flex items-center gap-2 h-11 lg:h-10 px-2 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-100 text-left"
            title="Switch layer"
            aria-expanded={expanded}
          >
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${TONES[current.tone].dot}`} />
            <span className="truncate">
              <span className="text-gray-400 mr-1">L{current.id}</span>{current.name}
            </span>
            <LayerBadges count={counts.get(current.id) ?? 0} flagged={flags.get(current.id) ?? 0} />
          </button>
          <button
            onClick={() => setExpanded(o => !o)}
            className={iconBtn(expanded)}
            title={expanded ? 'Collapse layers' : 'Show all layers'}
            aria-label="Toggle layer list"
            aria-expanded={expanded}
          >
            <Layers className="h-5 w-5" />
          </button>
        </div>

        {expanded && (
          <div className="border-t border-gray-100 p-1" role="listbox" aria-label="Layer">
            {LAYERS.map(layer => {
              const active = layer.id === currentLayer
              return (
                <button
                  key={layer.id}
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(layer.id)}
                  className={`w-full inline-flex items-center gap-2 h-11 lg:h-10 px-2 rounded-lg text-sm text-left ${
                    active ? `${TONES[layer.tone].active} font-medium` : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={layer.blurb}
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${TONES[layer.tone].dot}`} />
                  <span className="truncate flex-1">
                    <span className="text-gray-400 mr-1">L{layer.id}</span>{layer.name}
                  </span>
                  <LayerBadges count={counts.get(layer.id) ?? 0} flagged={flags.get(layer.id) ?? 0} />
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              )
            })}

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={() => setShowAdjacent(!showAdjacent)}
              className="w-full inline-flex items-center gap-2 h-11 lg:h-10 px-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 text-left"
              aria-pressed={showAdjacent}
            >
              {showAdjacent ? <Eye className="h-4 w-4 shrink-0" /> : <EyeOff className="h-4 w-4 shrink-0 text-gray-400" />}
              <span className="flex-1">Adjacent layers</span>
              <span className="text-xs text-gray-400">{showAdjacent ? 'Shown' : 'Hidden'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Outline toggle, beneath the layer control */}
      <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg p-1">
        <button
          onClick={toggleOutline}
          className={iconBtn(outlineOpen)}
          title="Toggle outline"
          aria-label="Toggle outline"
          aria-pressed={outlineOpen}
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

function LayerBadges({ count, flagged }: { count: number; flagged: number }) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <span className="text-xs px-1.5 rounded-full bg-gray-200 text-gray-600 tabular-nums">{count}</span>
      {flagged > 0 && (
        <span className="inline-flex items-center justify-center text-[10px] min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white" title={`${flagged} flagged`}>
          {flagged}
        </span>
      )}
    </span>
  )
}
