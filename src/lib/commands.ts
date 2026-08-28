// Undoable canvas operations. Each function performs the change (server +
// store) and records a Command that can reverse and replay it. Entities and
// connections are recreated with their original IDs so that references stay
// stable across undo/redo.
import { api, EntityCreateInput, ConnectionCreateInput } from '@/lib/client/api'
import { useEntityStore } from '@/stores/entityStore'
import { useHistoryStore } from '@/stores/historyStore'
import { EntityWithRelations, LayerConnectionWithEntities } from '@/lib/types'

const store = () => useEntityStore.getState()
const history = () => useHistoryStore.getState()

function entityToCreateInput(e: EntityWithRelations): EntityCreateInput {
  return {
    id: e.id,
    projectId: e.projectId,
    type: e.type,
    layer: e.layer,
    title: e.title,
    description: e.description,
    data: e.data,
    positionX: e.positionX,
    positionY: e.positionY,
    tags: e.tags,
    status: e.status,
  }
}

function connectionToCreateInput(c: LayerConnectionWithEntities): ConnectionCreateInput {
  return {
    id: c.id,
    projectId: c.projectId,
    fromEntityId: c.fromEntityId,
    toEntityId: c.toEntityId,
    connectionType: c.connectionType,
    strength: c.strength,
    rationale: c.rationale,
    createdBy: c.createdBy,
  }
}

async function recreateEntities(entities: EntityWithRelations[]) {
  for (const e of entities) {
    const created = await api.createEntity(entityToCreateInput(e))
    store().addEntity(created)
  }
}

async function recreateConnections(connections: LayerConnectionWithEntities[]) {
  for (const c of connections) {
    const created = await api.createConnection(connectionToCreateInput(c))
    store().addConnection(created)
  }
}

async function destroyEntities(entities: EntityWithRelations[]) {
  await Promise.all(entities.map(e => api.deleteEntity(e.id)))
  store().removeEntities(entities.map(e => e.id))
}

async function destroyConnections(connections: LayerConnectionWithEntities[]) {
  await Promise.all(connections.map(c => api.deleteConnection(c.id)))
  store().removeConnections(connections.map(c => c.id))
}

/** Create one entity. Returns the created entity. */
export async function createEntity(input: EntityCreateInput, label = 'Create entity') {
  const created = await api.createEntity(input)
  store().addEntity(created)
  history().push({
    label,
    undo: () => destroyEntities([created]),
    redo: () => recreateEntities([created]),
  })
  return created
}

/** Create several entities as a single undo step (paste / duplicate). */
export async function createEntities(inputs: EntityCreateInput[], label = 'Create entities') {
  const created: EntityWithRelations[] = []
  for (const input of inputs) {
    const e = await api.createEntity(input)
    store().addEntity(e)
    created.push(e)
  }
  if (created.length > 0) {
    history().push({
      label,
      undo: () => destroyEntities(created),
      redo: () => recreateEntities(created),
    })
  }
  return created
}

/** Create one connection. */
export async function createConnection(input: ConnectionCreateInput) {
  const created = await api.createConnection(input)
  store().addConnection(created)
  history().push({
    label: 'Create connection',
    undo: () => destroyConnections([created]),
    redo: () => recreateConnections([created]),
  })
  return created
}

/**
 * Delete entities and/or connections. Connections attached to deleted
 * entities are captured too so undo can restore the whole subgraph.
 */
export async function deleteSelection(entityIds: string[], connectionIds: string[] = []) {
  const s = store()
  const entities = entityIds
    .map(id => s.entities.get(id))
    .filter((e): e is EntityWithRelations => !!e)
  const entityIdSet = new Set(entities.map(e => e.id))
  const connectionMap = new Map<string, LayerConnectionWithEntities>()
  connectionIds.forEach(id => {
    const c = s.connections.get(id)
    if (c) connectionMap.set(id, c)
  })
  s.connections.forEach(c => {
    if (entityIdSet.has(c.fromEntityId) || entityIdSet.has(c.toEntityId)) connectionMap.set(c.id, c)
  })
  const connections = Array.from(connectionMap.values())
  if (entities.length === 0 && connections.length === 0) return

  const run = async () => {
    // Deleting entities cascades their connections server-side; delete the
    // remaining explicitly-selected connections ourselves.
    const standalone = connections.filter(
      c => !entityIdSet.has(c.fromEntityId) && !entityIdSet.has(c.toEntityId)
    )
    await Promise.all([
      ...entities.map(e => api.deleteEntity(e.id)),
      ...standalone.map(c => api.deleteConnection(c.id)),
    ])
    store().removeEntities(entities.map(e => e.id))
    store().removeConnections(connections.map(c => c.id))
  }

  await run()
  history().push({
    label: entities.length ? 'Delete entities' : 'Delete connections',
    undo: async () => {
      await recreateEntities(entities)
      await recreateConnections(connections)
    },
    redo: run,
  })
}

export interface EntityMove {
  id: string
  from: { x: number; y: number }
  to: { x: number; y: number }
}

/** Persist a drag. The store already reflects `to`; this records the step. */
export async function moveEntities(moves: EntityMove[]) {
  const real = moves.filter(m => m.from.x !== m.to.x || m.from.y !== m.to.y)
  if (real.length === 0) return
  const apply = async (key: 'from' | 'to') => {
    real.forEach(m => store().updateEntity(m.id, { positionX: m[key].x, positionY: m[key].y }))
    await Promise.all(
      real.map(m => api.updateEntity(m.id, { positionX: m[key].x, positionY: m[key].y }))
    )
  }
  await apply('to')
  history().push({
    label: real.length === 1 ? 'Move entity' : 'Move entities',
    undo: () => apply('from'),
    redo: () => apply('to'),
  })
}

/** Edit an entity's fields (title, description, data, tags, ...). */
export async function updateEntity(id: string, updates: Partial<EntityWithRelations>) {
  const before = store().entities.get(id)
  if (!before) return
  const previous: Partial<EntityWithRelations> = {}
  for (const key of Object.keys(updates) as (keyof EntityWithRelations)[]) {
    Object.assign(previous, { [key]: before[key] })
  }
  const apply = async (patch: Partial<EntityWithRelations>) => {
    const saved = await api.updateEntity(id, patch)
    const current = store().entities.get(id)
    // Keep whatever position the canvas currently shows.
    store().updateEntity(id, {
      ...saved,
      positionX: current?.positionX ?? saved.positionX,
      positionY: current?.positionY ?? saved.positionY,
    })
  }
  await apply(updates)
  history().push({
    label: 'Edit entity',
    undo: () => apply(previous),
    redo: () => apply(updates),
  })
}
