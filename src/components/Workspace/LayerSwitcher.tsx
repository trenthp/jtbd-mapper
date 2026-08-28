'use client'

import { LAYERS, LayerDef } from '@/lib/entityTypes'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'

const TONES: Record<LayerDef['tone'], { active: string; dot: string }> = {
  blue: { active: 'bg-blue-600 text-white', dot: 'bg-blue-500' },
  green: { active: 'bg-green-600 text-white', dot: 'bg-green-500' },
  purple: { active: 'bg-purple-600 text-white', dot: 'bg-purple-500' },
  orange: { active: 'bg-orange-600 text-white', dot: 'bg-orange-500' },
}

/** Segmented control for the four layers with entity and flag counts. */
export function LayerSwitcher() {
  const currentLayer = useCanvasStore(s => s.currentLayer)
  const setCurrentLayer = useCanvasStore(s => s.setCurrentLayer)
  const entities = useEntityStore(s => s.entities)
  const flagged = useEntityStore(s => s.reconciliationStates)

  const counts = new Map<number, number>()
  const flags = new Map<number, number>()
  entities.forEach(e => {
    counts.set(e.layer, (counts.get(e.layer) ?? 0) + 1)
    if (flagged.has(e.id)) flags.set(e.layer, (flags.get(e.layer) ?? 0) + 1)
  })

  return (
    <div
      role="tablist"
      aria-label="Layer"
      className="flex gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto max-w-full [scrollbar-width:none]"
    >
      {LAYERS.map(layer => {
        const active = layer.id === currentLayer
        const tone = TONES[layer.tone]
        return (
          <button
            key={layer.id}
            role="tab"
            aria-selected={active}
            onClick={() => setCurrentLayer(layer.id)}
            title={layer.name}
            className={`relative shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition-colors ${
              active ? tone.active : 'text-gray-700 hover:bg-white'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white/80' : tone.dot}`} />
            <span className="hidden sm:inline">{layer.name}</span>
            <span className="sm:hidden">L{layer.id} {layer.short}</span>
            <span className={`text-xs px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-200 text-gray-600'}`}>
              {counts.get(layer.id) ?? 0}
            </span>
            {(flags.get(layer.id) ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </button>
        )
      })}
    </div>
  )
}
