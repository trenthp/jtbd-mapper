import { ReconciliationState, ReconciliationStatus } from '@prisma/client'

export type LayerContext = 'current' | 'below' | 'above'

export const ADJACENT_LAYER_OPACITY = 0.5

const LAYER_TINTS: Record<number, string> = {
  1: 'rgba(59, 130, 246, 0.02)', // blue
  2: 'rgba(34, 197, 94, 0.02)', // green
  3: 'rgba(168, 85, 247, 0.02)', // purple
  4: 'rgba(251, 146, 60, 0.02)', // orange
}

export function getLayerBackgroundColor(layer: number): string {
  return LAYER_TINTS[layer] ?? 'rgba(156, 163, 175, 0.02)'
}

export interface EntityVisualStyle {
  borderColor: string
  borderStyle: 'solid' | 'dashed' | 'dotted'
  opacity: number
  highlight: boolean
}

export interface EntityVisualInput {
  reconciliation?: ReconciliationStatus
  isSelected: boolean
  isConnectionSource: boolean
  context: LayerContext
}

/** Border/opacity for an entity node given its reconciliation state and context. */
export function getEntityVisual({
  reconciliation,
  isSelected,
  isConnectionSource,
  context,
}: EntityVisualInput): EntityVisualStyle {
  const isCurrent = context === 'current'
  const baseOpacity = isCurrent ? 1 : ADJACENT_LAYER_OPACITY

  if (isConnectionSource && isCurrent) {
    return { borderColor: '#10b981', borderStyle: 'solid', opacity: baseOpacity, highlight: true }
  }

  switch (reconciliation?.state ?? ReconciliationState.SYNCED) {
    case ReconciliationState.NEEDS_ATTENTION:
      return {
        borderColor: '#ff6b6b',
        borderStyle: 'dashed',
        opacity: isCurrent ? (isSelected ? 1 : 0.7) : baseOpacity,
        highlight: isCurrent,
      }
    case ReconciliationState.DOWNSTREAM_IMPACT:
      return {
        borderColor: '#ffd93d',
        borderStyle: 'dotted',
        opacity: isCurrent ? (isSelected ? 0.8 : 0.5) : baseOpacity,
        highlight: false,
      }
    default:
      return {
        borderColor: isSelected && isCurrent ? '#2563eb' : '#4ecdc4',
        borderStyle: 'solid',
        opacity: baseOpacity,
        highlight: isCurrent && isSelected,
      }
  }
}
