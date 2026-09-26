'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, Check, Plus, Trash2, X } from 'lucide-react'
import { useEntityStore } from '@/stores/entityStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { updateEntity, deleteSelection, markReviewed } from '@/lib/commands'
import { downstreamOf } from '@/lib/impact'
import { typeDef, typesForLayer, ENTITY_STATUSES, FieldDef, formatTypeName, STICKY } from '@/lib/entityTypes'
import { EntityWithRelations } from '@/lib/types'

interface EntityInspectorProps {
  entity: EntityWithRelations
  onNavigateToEntity: (entityId: string) => void
}

const input = 'w-full px-2.5 py-2 lg:py-1.5 text-sm text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const label = 'block text-xs font-medium text-gray-600 mb-1'

/** A text-ish field that commits on blur (or Enter for single-line) and reverts on Escape. */
function CommitField({
  value, onCommit, multiline, placeholder, rows = 3,
}: { value: string; onCommit: (v: string) => void; multiline?: boolean; placeholder?: string; rows?: number }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => { if (draft !== value) onCommit(draft) }
  const common = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { setDraft(value); (e.target as HTMLElement).blur() }
      if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) { e.preventDefault(); (e.target as HTMLElement).blur() }
    },
    placeholder,
    className: input,
  }
  return multiline ? <textarea rows={rows} {...common} /> : <input type="text" {...common} />
}

function tagsToString(tags: unknown): string {
  if (Array.isArray(tags)) return tags.filter(t => typeof t === 'string').join(', ')
  if (typeof tags === 'string') return tags
  return ''
}

function hasValue(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0
  return v !== undefined && v !== null && v !== ''
}

function listToString(v: unknown): string {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string').join('\n') : ''
}

export function EntityInspector({ entity, onNavigateToEntity }: EntityInspectorProps) {
  const entities = useEntityStore(s => s.entities)
  const connections = useEntityStore(s => s.connections)
  const status = useEntityStore(s => s.reconciliationStates.get(entity.id))
  const selectConnection = useCanvasStore(s => s.selectConnection)
  const clearSelection = useCanvasStore(s => s.clearSelection)
  const [busy, setBusy] = useState(false)
  // Optional fields the user has added but not filled in yet
  const [added, setAdded] = useState<Set<string>>(new Set())

  const def = typeDef(entity.type)
  const data = (entity.data && typeof entity.data === 'object' && !Array.isArray(entity.data) ? entity.data : {}) as Record<string, unknown>

  const save = async (patch: Partial<EntityWithRelations>) => {
    try { await updateEntity(entity.id, patch) } catch (error) { console.error('Failed to save entity:', error) }
  }
  const saveData = (key: string, value: unknown) => save({ data: { ...data, [key]: value } as EntityWithRelations['data'] })
  const removeField = (key: string) => {
    setAdded(s => { const n = new Set(s); n.delete(key); return n })
    if (key in data) {
      const rest = { ...data }
      delete rest[key]
      save({ data: rest as EntityWithRelations['data'] })
    }
  }

  const shownFields = def.fields.filter(f => hasValue(data[f.key]) || added.has(f.key))
  const availableFields = def.fields.filter(f => !shownFields.includes(f))
  const layerTypes = typesForLayer(entity.layer)

  const links = useMemo(() =>
    Array.from(connections.values())
      .filter(c => c.fromEntityId === entity.id || c.toEntityId === entity.id)
      .map(c => {
        const outgoing = c.fromEntityId === entity.id
        const otherId = outgoing ? c.toEntityId : c.fromEntityId
        return { c, outgoing, other: entities.get(otherId) }
      }),
    [connections, entities, entity.id]
  )

  const downstream = useMemo(() =>
    downstreamOf(entity.id, Array.from(connections.values()))
      .map(id => entities.get(id))
      .filter((e): e is EntityWithRelations => !!e),
    [connections, entities, entity.id]
  )

  const trigger = status?.triggeredBy ? entities.get(status.triggeredBy) : undefined

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${entity.title}"? Connected entities will be flagged for review.`)) return
    setBusy(true)
    try { await deleteSelection([entity.id]); clearSelection() } finally { setBusy(false) }
  }

  const renderField = (f: FieldDef) => {
    const v = data[f.key]
    switch (f.kind) {
      case 'select':
        return (
          <select value={typeof v === 'string' ? v : ''} onChange={e => saveData(f.key, e.target.value)} className={input}>
            <option value="">—</option>
            {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      case 'list':
        return (
          <CommitField
            multiline
            rows={3}
            value={listToString(v)}
            placeholder={f.placeholder ?? 'One per line'}
            onCommit={s => saveData(f.key, s.split('\n').map(x => x.trim()).filter(Boolean))}
          />
        )
      case 'textarea':
        return <CommitField multiline value={typeof v === 'string' ? v : ''} placeholder={f.placeholder} onCommit={s => saveData(f.key, s)} />
      default:
        return <CommitField value={typeof v === 'string' ? v : ''} placeholder={f.placeholder} onCommit={s => saveData(f.key, s)} />
    }
  }

  return (
    <div className="space-y-5 p-4">
      {status && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 flex-1">
              {trigger
                ? <>Upstream <button className="font-semibold underline" onClick={() => onNavigateToEntity(trigger.id)}>{trigger.title}</button> changed. Check this still holds.</>
                : status.reason.replace(/^"(.*)" was deleted$/, 'Connected "$1" was deleted. Check this still holds.')}
            </div>
          </div>
          <button
            onClick={async () => { setBusy(true); try { await markReviewed(entity.id) } finally { setBusy(false) } }}
            disabled={busy}
            className="mt-2 w-full inline-flex items-center justify-center gap-1 text-xs px-2 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Mark reviewed
          </button>
        </div>
      )}

      <section className="space-y-3">
        <div>
          <label className={label}>Title</label>
          <CommitField value={entity.title} onCommit={title => { if (title.trim()) save({ title: title.trim() }) }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>Type</label>
            <select value={entity.type} onChange={e => { setAdded(new Set()); save({ type: e.target.value }) }} className={input}>
              <option value={STICKY.type}>{STICKY.name}</option>
              {entity.type !== STICKY.type && !layerTypes.some(t => t.type === entity.type) && (
                <option value={entity.type}>{formatTypeName(entity.type)}</option>
              )}
              {layerTypes.map(t => <option key={t.type} value={t.type}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Status</label>
            <select value={entity.status} onChange={e => save({ status: e.target.value as EntityWithRelations['status'] })} className={input}>
              {ENTITY_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={label}>Description</label>
          <CommitField multiline value={entity.description ?? ''} placeholder="What is this and why does it matter?" onCommit={d => save({ description: d })} />
        </div>
        <div>
          <label className={label}>Tags</label>
          <CommitField
            value={tagsToString(entity.tags)}
            placeholder="comma, separated"
            onCommit={s => save({ tags: s.split(',').map(t => t.trim()).filter(Boolean) })}
          />
        </div>
      </section>

      {def.fields.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <def.icon className={`h-3.5 w-3.5 ${def.color}`} /> {def.name} details
          </h3>
          {shownFields.map(f => (
            <div key={f.key}>
              <div className="flex items-center justify-between">
                <label className={label}>{f.label}</label>
                <button
                  onClick={() => removeField(f.key)}
                  className="-mt-1 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  title={`Remove ${f.label.toLowerCase()}`}
                  aria-label={`Remove ${f.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {renderField(f)}
            </div>
          ))}
          {availableFields.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableFields.map(f => (
                <button
                  key={f.key}
                  onClick={() => setAdded(s => new Set(s).add(f.key))}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full hover:bg-gray-50 hover:text-gray-900"
                >
                  <Plus className="h-3 w-3" /> {f.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {entity.type === STICKY.type && layerTypes.length > 0 && (
        <p className="text-xs text-gray-500">Choose a type above to add its fields.</p>
      )}

      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Connections <span className="text-gray-400 normal-case font-normal">({links.length})</span>
        </h3>
        {links.length === 0 ? (
          <p className="text-xs text-gray-500">Not connected yet. Use the Connect tool and tap two entities.</p>
        ) : (
          <ul className="space-y-1">
            {links.map(({ c, outgoing, other }) => (
              <li key={c.id} className="flex items-center gap-1 text-sm">
                <button
                  onClick={() => selectConnection(c.id, false)}
                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-1 rounded text-xs text-gray-600 hover:bg-gray-100"
                  title="Edit connection"
                >
                  {outgoing ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                  {c.connectionType.toLowerCase().replace('_', ' ')}
                </button>
                <button
                  onClick={() => other && onNavigateToEntity(other.id)}
                  className="flex-1 min-w-0 text-left truncate px-1.5 py-1 rounded hover:bg-gray-50 text-gray-800"
                >
                  {other?.title ?? '(missing)'}
                  {other && <span className="ml-1 text-xs text-gray-400">L{other.layer}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {downstream.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Depends on this</h3>
          <p className="text-xs text-gray-500 mb-2">Changing this flags {downstream.length} {downstream.length === 1 ? 'entity' : 'entities'}:</p>
          <ul className="space-y-0.5">
            {downstream.map(e => (
              <li key={e.id}>
                <button onClick={() => onNavigateToEntity(e.id)} className="w-full flex items-center gap-2 text-left text-sm px-1.5 py-1 rounded hover:bg-gray-50">
                  <ArrowDownRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="truncate flex-1">{e.title}</span>
                  <span className="text-xs text-gray-400">L{e.layer}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pt-2 border-t border-gray-100">
        <button
          onClick={handleDelete}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" /> Delete entity
        </button>
      </section>
    </div>
  )
}
