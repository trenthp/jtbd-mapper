'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'
import { useEntityStore } from '@/stores/entityStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { updateConnection, deleteSelection } from '@/lib/commands'
import { CONNECTION_TYPES, CONNECTION_STRENGTHS } from '@/lib/entityTypes'
import { LayerConnectionWithEntities } from '@/lib/types'
import { ConnectionType, ConnectionStrength } from '@prisma/client'

interface ConnectionInspectorProps {
  connection: LayerConnectionWithEntities
  onNavigateToEntity: (entityId: string) => void
}

const input = 'w-full px-2.5 py-2 lg:py-1.5 text-sm text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const label = 'block text-xs font-medium text-gray-600 mb-1'

const TYPE_HELP: Record<string, string> = {
  SUPPORTS: 'The source helps achieve the target.',
  DERIVES_FROM: 'The source was derived from the target.',
  CONFLICTS_WITH: 'The two pull in different directions.',
  INFORMS: 'The source provides context for the target.',
}

export function ConnectionInspector({ connection, onNavigateToEntity }: ConnectionInspectorProps) {
  const entities = useEntityStore(s => s.entities)
  const clearSelection = useCanvasStore(s => s.clearSelection)
  const from = entities.get(connection.fromEntityId)
  const to = entities.get(connection.toEntityId)
  const [rationale, setRationale] = useState(connection.rationale ?? '')
  useEffect(() => setRationale(connection.rationale ?? ''), [connection.rationale])

  const save = async (patch: Partial<LayerConnectionWithEntities>) => {
    try { await updateConnection(connection.id, patch) } catch (error) { console.error('Failed to save connection:', error) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this connection?')) return
    await deleteSelection([], [connection.id])
    clearSelection()
  }

  const endpoint = (e: typeof from) => e ? (
    <button onClick={() => onNavigateToEntity(e.id)} className="flex-1 min-w-0 text-left px-2 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
      <div className="text-sm text-gray-900 truncate">{e.title}</div>
      <div className="text-xs text-gray-500">Layer {e.layer}</div>
    </button>
  ) : <div className="flex-1 text-sm text-gray-400">(missing)</div>

  return (
    <div className="space-y-5 p-4">
      <section>
        <div className="flex items-center gap-2">
          {endpoint(from)}
          <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
          {endpoint(to)}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <label className={label}>Relationship</label>
          <select value={connection.connectionType} onChange={e => save({ connectionType: e.target.value as ConnectionType })} className={input}>
            {CONNECTION_TYPES.map(t => <option key={t} value={t}>{t.toLowerCase().replace('_', ' ')}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1">{TYPE_HELP[connection.connectionType]}</p>
        </div>
        <div>
          <label className={label}>Strength</label>
          <div className="flex gap-1">
            {CONNECTION_STRENGTHS.map(s => (
              <button
                key={s}
                onClick={() => save({ strength: s as ConnectionStrength })}
                className={`flex-1 py-1.5 text-xs rounded-md border ${
                  connection.strength === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Rationale</label>
          <textarea
            rows={3}
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            onBlur={() => { if (rationale !== (connection.rationale ?? '')) save({ rationale }) }}
            placeholder="Why does this link exist?"
            className={input}
          />
        </div>
      </section>

      <section className="pt-2 border-t border-gray-100">
        <button onClick={handleDelete} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50">
          <Trash2 className="h-4 w-4" /> Delete connection
        </button>
      </section>
    </div>
  )
}
