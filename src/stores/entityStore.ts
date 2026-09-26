import { create } from 'zustand'
import { Entity, LayerConnection, ReconciliationStatus, Prisma } from '@prisma/client'
import { EntityWithRelations, LayerConnectionWithEntities, EntityStore } from '@/lib/types'

export const useEntityStore = create<EntityStore>((set, get) => ({
  entities: new Map(),
  connections: new Map(),
  reconciliationStates: new Map(),

  addEntity: (entity: EntityWithRelations) => {
    set((state) => {
      const newEntities = new Map(state.entities)
      newEntities.set(entity.id, entity)
      const newReconciliationStates = new Map(state.reconciliationStates)
      if (entity.reconciliationStatus) newReconciliationStates.set(entity.id, entity.reconciliationStatus)
      else newReconciliationStates.delete(entity.id)
      return { entities: newEntities, reconciliationStates: newReconciliationStates }
    })
  },

  updateEntity: (entityId: string, changes: Partial<Entity>) => {
    set((state) => {
      const newEntities = new Map(state.entities)
      const existing = newEntities.get(entityId)
      if (existing) {
        newEntities.set(entityId, { ...existing, ...changes })
      }
      return { entities: newEntities }
    })
  },

  removeEntity: (entityId: string) => {
    set((state) => {
      const newEntities = new Map(state.entities)
      const newConnections = new Map(state.connections)
      const newReconciliationStates = new Map(state.reconciliationStates)

      // Remove entity
      newEntities.delete(entityId)

      // Remove related connections
      Array.from(newConnections.values()).forEach(connection => {
        if (connection.fromEntityId === entityId || connection.toEntityId === entityId) {
          newConnections.delete(connection.id)
        }
      })

      // Remove reconciliation state
      newReconciliationStates.delete(entityId)

      return {
        entities: newEntities,
        connections: newConnections,
        reconciliationStates: newReconciliationStates
      }
    })
  },

  addConnection: (connection: LayerConnectionWithEntities) => {
    set((state) => {
      const newConnections = new Map(state.connections)
      newConnections.set(connection.id, connection)
      return { connections: newConnections }
    })
  },

  updateConnection: (connectionId: string, changes: Partial<LayerConnection>) => {
    set((state) => {
      const newConnections = new Map(state.connections)
      const existing = newConnections.get(connectionId)
      if (existing) {
        newConnections.set(connectionId, { ...existing, ...changes })
      }
      return { connections: newConnections }
    })
  },

  removeConnection: (connectionId: string) => {
    set((state) => {
      const newConnections = new Map(state.connections)
      newConnections.delete(connectionId)
      return { connections: newConnections }
    })
  },

  clearReconciliationState: (entityId: string) => {
    set((currentState) => {
      if (!currentState.reconciliationStates.has(entityId)) return {}
      const newReconciliationStates = new Map(currentState.reconciliationStates)
      newReconciliationStates.delete(entityId)
      return { reconciliationStates: newReconciliationStates }
    })
  },

  setReconciliationState: (entityId: string, state: ReconciliationStatus) => {
    set((currentState) => {
      const newReconciliationStates = new Map(currentState.reconciliationStates)
      newReconciliationStates.set(entityId, state)
      return { reconciliationStates: newReconciliationStates }
    })
  },

  // Helper methods
  getEntitiesByLayer: (layer: number) => {
    return Array.from(get().entities.values()).filter(entity => entity.layer === layer)
  },

  getConnectionsForEntity: (entityId: string) => {
    return Array.from(get().connections.values()).filter(
      connection => connection.fromEntityId === entityId || connection.toEntityId === entityId
    )
  },

  getReconciliationState: (entityId: string) => {
    return get().reconciliationStates.get(entityId)
  },

  // Bulk operations for keyboard shortcuts
  removeEntities: (entityIds: string[]) => {
    set((state) => {
      const newEntities = new Map(state.entities)
      const newConnections = new Map(state.connections)
      const newReconciliationStates = new Map(state.reconciliationStates)

      // Remove entities
      entityIds.forEach(entityId => {
        newEntities.delete(entityId)
        newReconciliationStates.delete(entityId)
      })

      // Remove related connections
      Array.from(newConnections.values()).forEach(connection => {
        if (entityIds.includes(connection.fromEntityId) || entityIds.includes(connection.toEntityId)) {
          newConnections.delete(connection.id)
        }
      })

      return {
        entities: newEntities,
        connections: newConnections,
        reconciliationStates: newReconciliationStates
      }
    })
  },

  removeConnections: (connectionIds: string[]) => {
    set((state) => {
      const newConnections = new Map(state.connections)
      connectionIds.forEach(connectionId => {
        newConnections.delete(connectionId)
      })
      return { connections: newConnections }
    })
  },

  duplicateEntity: (_entityId: string, _offset: { x: number; y: number } = { x: 20, y: 20 }) => {
    // This method is deprecated - use the clipboard duplicate function instead
    console.warn('entityStore.duplicateEntity is deprecated, use useClipboard().duplicate instead')
    return null
  },

  // Clean up temporary entities
  cleanupTemporaryEntities: () => {
    set((state) => {
      const newEntities = new Map(state.entities)
      const toRemove: string[] = []

      newEntities.forEach((entity, id) => {
        if (id.includes('-copy-') || id.includes('paste-')) {
          toRemove.push(id)
        }
      })

      toRemove.forEach(id => newEntities.delete(id))

      return { entities: newEntities }
    })
  },

  // Reset store for project switching
  resetStore: () => {
    set(() => ({
      entities: new Map(),
      connections: new Map(),
      reconciliationStates: new Map()
    }))
  }
}))

// Helper functions for working with entity data
export const createEntityWithDefaults = (
  type: string,
  layer: number,
  position: { x: number; y: number },
  projectId: string
): Partial<Entity> => ({
  type,
  layer,
  title: `New ${type.replace('_', ' ')}`,
  description: '',
  data: getDefaultDataForType(type),
  positionX: position.x,
  positionY: position.y,
  tags: [],
  projectId,
  status: 'ACTIVE',
  version: 1
})

export const getDefaultDataForType = (type: string): Prisma.JsonObject => {
  switch (type) {
    case 'user_job':
      return {
        type: 'functional',
        jobStatement: '',
        userSegment: '',
        context: { when: [], where: [], why: [] },
        successCriteria: [],
        painPoints: [],
        currentSolutions: [],
        priority: 'medium',
        frequency: 'weekly'
      }
    case 'business_objective':
      return {
        category: 'revenue',
        metric: '',
        stakeholder: ''
      }
    case 'secondary_consideration':
      return {
        category: 'constraint',
        impact: 'medium'
      }
    case 'functional_spec':
      return {
        specType: 'feature',
        acceptanceCriteria: [],
        businessRules: [],
        dependencies: [],
        priority: 'should-have',
        effort: 'm'
      }
    case 'content_requirement':
      return {
        contentType: 'copy',
        purpose: '',
        audience: []
      }
    case 'system_requirement':
      return {
        systemType: 'api',
        technology: [],
        performance: [],
        security: [],
        scalability: []
      }
    case 'interaction_spec':
      return {
        interactionType: 'user-flow',
        actor: '',
        trigger: '',
        steps: []
      }
    case 'information_architecture':
      return {
        structureType: 'hierarchy',
        elements: [],
        relationships: []
      }
    case 'interface_element':
      return {
        elementType: 'component',
        functionality: [],
        content: [],
        interactions: [],
        states: []
      }
    case 'navigation_design':
      return {
        navType: 'primary',
        structure: 'hierarchical',
        elements: [],
        behavior: []
      }
    default:
      return {}
  }
}