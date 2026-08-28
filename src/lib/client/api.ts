// Thin typed wrappers around the REST API. All canvas mutations go through
// here so that the undo/redo commands in lib/commands.ts can replay them.
import { EntityWithRelations, LayerConnectionWithEntities } from '@/lib/types'
import { ConnectionType, ConnectionStrength, Prisma } from '@prisma/client'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {}
    throw new Error(message || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export interface EntityCreateInput {
  id?: string
  projectId: string
  type: string
  layer: number
  title: string
  description?: string | null
  data?: Prisma.JsonValue
  positionX?: number
  positionY?: number
  tags?: Prisma.JsonValue
  status?: string
}

export interface ConnectionCreateInput {
  id?: string
  projectId: string
  fromEntityId: string
  toEntityId: string
  connectionType: ConnectionType
  strength?: ConnectionStrength
  rationale?: string | null
  createdBy: string
}

export const api = {
  createEntity: (input: EntityCreateInput) =>
    request<{ entity: EntityWithRelations }>('/api/entities', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => r.entity),

  updateEntity: (id: string, updates: Partial<EntityWithRelations>) =>
    request<{ entity: EntityWithRelations }>(`/api/entities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then(r => r.entity),

  deleteEntity: (id: string) =>
    request<{ success: true }>(`/api/entities/${id}`, { method: 'DELETE' }).then(() => undefined),

  createConnection: (input: ConnectionCreateInput) =>
    request<{ connection: LayerConnectionWithEntities }>('/api/connections', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(r => r.connection),

  deleteConnection: (id: string) =>
    request<{ success: true }>(`/api/connections/${id}`, { method: 'DELETE' }).then(() => undefined),
}
