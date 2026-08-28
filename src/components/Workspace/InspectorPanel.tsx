'use client'

import { X, Trash2 } from 'lucide-react'
import { useEntityStore } from '@/stores/entityStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { deleteSelection } from '@/lib/commands'
import { typeDef } from '@/lib/entityTypes'
import { EntityInspector } from './EntityInspector'
import { ConnectionInspector } from './ConnectionInspector'
import { ReviewPanel } from '@/components/Projects/ReviewPanel'

interface InspectorPanelProps {
  onNavigateToEntity: (entityId: string) => void
  onClose: () => void
}

/**
 * Right-hand inspector. Shows the selected entity, the selected connection,
 * a multi-selection summary, or (with nothing selected) the review queue.
 */
export function InspectorPanel({ onNavigateToEntity, onClose }: InspectorPanelProps) {
  const entities = useEntityStore(s => s.entities)
  const connections = useEntityStore(s => s.connections)
  const flaggedCount = useEntityStore(s => s.reconciliationStates.size)
  const selection = useCanvasStore(s => s.selectionState)
  const clearSelection = useCanvasStore(s => s.clearSelection)

  const entityIds = Array.from(selection.selectedEntities)
  const connectionIds = Array.from(selection.selectedConnections)
  const entity = entityIds.length === 1 && connectionIds.length === 0 ? entities.get(entityIds[0]) : undefined
  const connection = connectionIds.length === 1 && entityIds.length === 0 ? connections.get(connectionIds[0]) : undefined
  const multi = entityIds.length + connectionIds.length > 1

  let title: React.ReactNode
  let body: React.ReactNode
  if (entity) {
    const def = typeDef(entity.type)
    title = <span className="inline-flex items-center gap-1.5"><def.icon className={`h-4 w-4 ${def.color}`} />{def.name}</span>
    body = <EntityInspector key={entity.id} entity={entity} onNavigateToEntity={onNavigateToEntity} />
  } else if (connection) {
    title = 'Connection'
    body = <ConnectionInspector key={connection.id} connection={connection} onNavigateToEntity={onNavigateToEntity} />
  } else if (multi) {
    title = `${entityIds.length + connectionIds.length} selected`
    body = (
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-600">
          {entityIds.length} {entityIds.length === 1 ? 'entity' : 'entities'}
          {connectionIds.length > 0 && <> and {connectionIds.length} {connectionIds.length === 1 ? 'connection' : 'connections'}</>}.
        </p>
        <button
          onClick={async () => { if (window.confirm('Delete the selection?')) { await deleteSelection(entityIds, connectionIds); clearSelection() } }}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" /> Delete selection
        </button>
      </div>
    )
  } else {
    title = <>Review {flaggedCount > 0 && <span className="ml-1 text-xs bg-amber-500 text-white px-1.5 rounded-full">{flaggedCount}</span>}</>
    body = <ReviewPanel onNavigateToEntity={onNavigateToEntity} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-md" aria-label="Close inspector">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{body}</div>
    </div>
  )
}
