'use client'

import { useMemo, useState } from 'react'
import { Search, AlertTriangle, X } from 'lucide-react'
import { useEntityStore } from '@/stores/entityStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { typeDef, typesForLayer, layerDef } from '@/lib/entityTypes'
import { EntityWithRelations } from '@/lib/types'

interface OutlinePanelProps {
  onNavigateToEntity: (entityId: string) => void
  onClose?: () => void
}

/** Searchable list of entities: the current layer by default, all layers while searching. */
export function OutlinePanel({ onNavigateToEntity, onClose }: OutlinePanelProps) {
  const entities = useEntityStore(s => s.entities)
  const flagged = useEntityStore(s => s.reconciliationStates)
  const currentLayer = useCanvasStore(s => s.currentLayer)
  const selected = useCanvasStore(s => s.selectionState.selectedEntities)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const searching = q.length > 0

  const groups = useMemo(() => {
    const all = Array.from(entities.values())
    const visible = searching
      ? all.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q))
      : all.filter(e => e.layer === currentLayer)
    const byType = new Map<string, EntityWithRelations[]>()
    visible.forEach(e => byType.set(e.type, [...(byType.get(e.type) ?? []), e]))
    // Known types first in their defined order, then anything else
    const order = [...typesForLayer(currentLayer).map(t => t.type), ...Array.from(byType.keys())]
    const seen = new Set<string>()
    return order
      .filter(t => byType.has(t) && !seen.has(t) && seen.add(t))
      .map(t => ({ def: typeDef(t), items: byType.get(t)!.sort((a, b) => a.title.localeCompare(b.title)) }))
  }, [entities, currentLayer, q, searching])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all layers…"
            className="w-full h-9 pl-8 pr-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md" aria-label="Close outline">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
        {searching
          ? `${total} ${total === 1 ? 'match' : 'matches'} across all layers`
          : `${layerDef(currentLayer).name} · ${total} ${total === 1 ? 'entity' : 'entities'}`}
      </div>

      <div className="flex-1 overflow-y-auto">
        {total === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            {searching ? 'Nothing matches.' : 'Nothing on this layer yet. Use Add in the toolbar to create one.'}
          </div>
        ) : (
          groups.map(({ def, items }) => (
            <div key={def.type} className="py-1">
              <div className="px-3 py-1 flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <def.icon className={`h-3.5 w-3.5 ${def.color}`} />
                {def.name}
                <span className="text-gray-400 normal-case">({items.length})</span>
              </div>
              <ul>
                {items.map(e => {
                  const isSelected = selected.has(e.id)
                  const isFlagged = flagged.has(e.id)
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => onNavigateToEntity(e.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 lg:py-1.5 text-sm text-left hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-800'
                        }`}
                      >
                        <span className="truncate flex-1">{e.title}</span>
                        {isFlagged && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        {searching && <span className="text-xs text-gray-400 shrink-0">L{e.layer}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
