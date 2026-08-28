import { useMemo } from 'react'
import { useEntityStore } from '@/stores/entityStore'

/** Entities and connections partitioned into the current layer and its neighbours. */
export function useLayerData(layer: number) {
  const entities = useEntityStore(s => s.entities)
  const connections = useEntityStore(s => s.connections)

  return useMemo(() => {
    const all = Array.from(entities.values())
    const allConnections = Array.from(connections.values())
    const touches = (l: number) => (c: { fromLayer: number; toLayer: number }) =>
      c.fromLayer === l || c.toLayer === l
    const touchesCurrent = touches(layer)

    return {
      currentEntities: all.filter(e => e.layer === layer),
      belowEntities: all.filter(e => e.layer === layer - 1),
      aboveEntities: all.filter(e => e.layer === layer + 1),
      currentConnections: allConnections.filter(touchesCurrent),
      belowConnections: allConnections.filter(c => touches(layer - 1)(c) && !touchesCurrent(c)),
      aboveConnections: allConnections.filter(c => touches(layer + 1)(c) && !touchesCurrent(c)),
    }
  }, [entities, connections, layer])
}
