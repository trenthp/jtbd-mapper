'use client'

import { Group } from 'react-konva'
import { EntityNode } from './EntityNode'
import { ConnectionPath } from './ConnectionPath'
import { ADJACENT_LAYER_OPACITY, getEntityVisual, LayerContext } from './layerVisuals'
import { EntityWithRelations, LayerConnectionWithEntities } from '@/lib/types'
import { ReconciliationStatus } from '@prisma/client'

interface AdjacentLayerProps {
  context: Exclude<LayerContext, 'current'>
  currentLayer: number
  entities: EntityWithRelations[]
  connections: LayerConnectionWithEntities[]
  reconciliationStates: Map<string, ReconciliationStatus>
}

const noop = () => {}

/** Non-interactive, dimmed rendering of the layer above or below the current one. */
export function AdjacentLayer({ context, currentLayer, entities, connections, reconciliationStates }: AdjacentLayerProps) {
  if (entities.length === 0) return null
  return (
    <Group opacity={ADJACENT_LAYER_OPACITY}>
      {connections.map(connection => (
        <ConnectionPath
          key={`${context}-${connection.id}`}
          connection={connection}
          isSelected={false}
          isDraggedConnection={false}
          onClick={noop}
          currentLayer={currentLayer}
        />
      ))}
      {entities.map(entity => (
        <EntityNode
          key={`${context}-${entity.id}`}
          entity={entity}
          visual={getEntityVisual({
            reconciliation: reconciliationStates.get(entity.id),
            isSelected: false,
            isConnectionSource: false,
            context,
          })}
          isSelected={false}
          isDragging={false}
          isEditing={false}
          isInteractable={false}
          onClick={noop}
          onDoubleClick={noop}
          onDragStart={() => false}
          onDragEnd={noop}
        />
      ))}
    </Group>
  )
}
