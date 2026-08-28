'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, Check, CheckCircle2, Crosshair } from 'lucide-react'
import { useEntityStore } from '@/stores/entityStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { markReviewed } from '@/lib/commands'
import { EntityWithRelations } from '@/lib/types'
import { downstreamOf } from '@/lib/impact'

interface ReviewPanelProps {
  onNavigateToEntity: (entityId: string) => void
}

function formatType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Entities flagged for review after an upstream change, plus a live
 * "what depends on this?" list for the currently selected entity.
 */
export function ReviewPanel({ onNavigateToEntity }: ReviewPanelProps) {
  const entities = useEntityStore(s => s.entities)
  const connections = useEntityStore(s => s.connections)
  const statuses = useEntityStore(s => s.reconciliationStates)
  const selected = useCanvasStore(s => s.selectionState.selectedEntities)
  const [busyId, setBusyId] = useState<string | null>(null)

  const flagged = useMemo(() =>
    Array.from(statuses.values())
      .map(status => ({ status, entity: entities.get(status.entityId), trigger: status.triggeredBy ? entities.get(status.triggeredBy) : undefined }))
      .filter((f): f is typeof f & { entity: EntityWithRelations } => !!f.entity)
      .sort((a, b) => new Date(b.status.triggeredAt).getTime() - new Date(a.status.triggeredAt).getTime()),
    [statuses, entities]
  )

  // Downstream of the single selected entity, computed client-side from the store
  const selectedId = selected.size === 1 ? Array.from(selected)[0] : null
  const selectedEntity = selectedId ? entities.get(selectedId) : undefined
  const downstream = useMemo(() => {
    if (!selectedId) return []
    return downstreamOf(selectedId, Array.from(connections.values()))
      .map(id => entities.get(id))
      .filter((e): e is EntityWithRelations => !!e)
  }, [selectedId, connections, entities])

  const handleReviewed = async (entityId: string) => {
    setBusyId(entityId)
    try {
      await markReviewed(entityId)
    } catch (error) {
      console.error('Failed to mark reviewed:', error)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-4 space-y-6">
      <section>
        <h3 className="text-sm font-medium text-gray-700 mb-1">Needs review</h3>
        <p className="text-xs text-gray-500 mb-3">
          Entities whose upstream jobs or specs changed since they were last looked at.
        </p>

        {flagged.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Everything is in sync
          </div>
        ) : (
          <ul className="space-y-2">
            {flagged.map(({ status, entity, trigger }) => (
              <li key={entity.id} className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{entity.title}</div>
                    <div className="text-xs text-gray-500">L{entity.layer} · {formatType(entity.type)}</div>
                    <div className="text-xs text-amber-800 mt-1">
                      {trigger ? <>Upstream <strong>{trigger.title}</strong> changed</> : status.reason.replace(/^"(.*)" was deleted$/, 'Connected "$1" was deleted')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onNavigateToEntity(entity.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    <Crosshair className="h-3 w-3" /> Go to
                  </button>
                  <button
                    onClick={() => handleReviewed(entity.id)}
                    disabled={busyId === entity.id}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> Reviewed
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-700 mb-1">Depends on selection</h3>
        {!selectedEntity ? (
          <p className="text-xs text-gray-500">Select one entity to see what would be affected by changing it.</p>
        ) : downstream.length === 0 ? (
          <p className="text-xs text-gray-500">
            Nothing on a lower layer is connected to <strong>{selectedEntity.title}</strong> yet.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-2">
              Changing <strong>{selectedEntity.title}</strong> will flag {downstream.length}{' '}
              {downstream.length === 1 ? 'entity' : 'entities'}:
            </p>
            <ul className="space-y-1">
              {downstream.map(e => (
                <li key={e.id}>
                  <button
                    onClick={() => onNavigateToEntity(e.id)}
                    className="w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded hover:bg-gray-50"
                  >
                    <ArrowDownRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate flex-1">{e.title}</span>
                    <span className="text-xs text-gray-400">L{e.layer}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
