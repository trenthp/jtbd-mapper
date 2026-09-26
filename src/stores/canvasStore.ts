import { create } from 'zustand'
import { CanvasStore, Viewport, DragState, SelectionState, ConnectionMode, RectangleSelection, SnappingState, GridSettings, CanvasTool } from '@/lib/types'

export const useCanvasStore = create<CanvasStore>((set) => ({
  viewport: {
    x: 0,
    y: 0,
    zoom: 1
  },

  dragState: {
    isDragging: false
  },

  selectionState: {
    selectedEntities: new Set(),
    selectedConnections: new Set()
  },

  connectionMode: {
    isActive: false
  },

  rectangleSelection: {
    isActive: false
  },

  snappingState: {
    isEnabled: true,
    snapDistance: 10,
    activeGuides: [],
    snapPosition: undefined
  },

  gridSettings: {
    isVisible: true,
    snapToGrid: false,
    gridSize: 20,
    gridColor: '#e5e7eb',
    gridOpacity: 0.5
  },

  currentTool: {
    type: 'select',
    cursor: 'default'
  },

  isPanMode: false,

  currentLayer: 1,

  showAdjacentLayers: true,

  viewActions: {},

  setViewport: (viewport: Partial<Viewport>) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport }
    }))
  },

  setDragState: (dragState: Partial<DragState>) => {
    set((state) => ({
      dragState: { ...state.dragState, ...dragState }
    }))
  },

  setSelectionState: (selectionState: Partial<SelectionState>) => {
    set((state) => ({
      selectionState: { ...state.selectionState, ...selectionState }
    }))
  },

  setConnectionMode: (connectionMode: Partial<ConnectionMode>) => {
    set((state) => ({
      connectionMode: { ...state.connectionMode, ...connectionMode }
    }))
  },

  setRectangleSelection: (rectangleSelection: Partial<RectangleSelection>) => {
    set((state) => ({
      rectangleSelection: { ...state.rectangleSelection, ...rectangleSelection }
    }))
  },

  setSnappingState: (snappingState: Partial<SnappingState>) => {
    set((state) => ({
      snappingState: { ...state.snappingState, ...snappingState }
    }))
  },

  setGridSettings: (gridSettings: Partial<GridSettings>) => {
    set((state) => ({
      gridSettings: { ...state.gridSettings, ...gridSettings }
    }))
  },

  setCurrentTool: (tool: CanvasTool) => {
    set(() => ({ currentTool: tool }))
  },

  setIsPanMode: (isPanMode: boolean) => {
    set(() => ({ isPanMode }))
  },

  setCurrentLayer: (layer: number) => {
    set(() => ({ currentLayer: layer }))
  },

  setShowAdjacentLayers: (showAdjacentLayers: boolean) => {
    set(() => ({ showAdjacentLayers }))
  },

  setViewActions: (viewActions) => {
    set(() => ({ viewActions }))
  },

  // Helper methods
  selectEntity: (entityId: string, multiSelect = false) => {
    set((state) => {
      const newSelectedEntities = multiSelect
        ? new Set(state.selectionState.selectedEntities)
        : new Set<string>()

      if (newSelectedEntities.has(entityId)) {
        newSelectedEntities.delete(entityId)
      } else {
        newSelectedEntities.add(entityId)
      }

      return {
        selectionState: {
          ...state.selectionState,
          selectedEntities: newSelectedEntities,
          selectedConnections: multiSelect ? state.selectionState.selectedConnections : new Set()
        }
      }
    })
  },

  selectConnection: (connectionId: string, multiSelect = false) => {
    set((state) => {
      const newSelectedConnections = multiSelect
        ? new Set(state.selectionState.selectedConnections)
        : new Set<string>()

      if (newSelectedConnections.has(connectionId)) {
        newSelectedConnections.delete(connectionId)
      } else {
        newSelectedConnections.add(connectionId)
      }

      return {
        selectionState: {
          ...state.selectionState,
          selectedConnections: newSelectedConnections,
          selectedEntities: multiSelect ? state.selectionState.selectedEntities : new Set()
        }
      }
    })
  },

  clearSelection: () => {
    set((state) => ({
      selectionState: {
        ...state.selectionState,
        selectedEntities: new Set(),
        selectedConnections: new Set()
      }
    }))
  },

  selectEntitiesInRectangle: (_rect: { x: number, y: number, width: number, height: number }) => {
    // This will be called with entities from the LayerCanvas component
    // The actual entity filtering logic will be in the LayerCanvas
    // This method exists to satisfy the interface - implementation will be in canvas component
  },

  panTo: (x: number, y: number) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        x: -x + window.innerWidth / 2,
        y: -y + window.innerHeight / 2
      }
    }))
  },

  zoomToFit: (entities: Array<{ positionX: number; positionY: number }>) => {
    if (entities.length === 0) return

    const minX = Math.min(...entities.map(e => e.positionX))
    const maxX = Math.max(...entities.map(e => e.positionX))
    const minY = Math.min(...entities.map(e => e.positionY))
    const maxY = Math.max(...entities.map(e => e.positionY))

    const width = maxX - minX + 400 // padding
    const height = maxY - minY + 400 // padding

    const scaleX = window.innerWidth / width
    const scaleY = window.innerHeight / height
    const scale = Math.min(scaleX, scaleY, 1) // don't zoom in beyond 1x

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    set(() => ({
      viewport: {
        x: -centerX * scale + window.innerWidth / 2,
        y: -centerY * scale + window.innerHeight / 2,
        zoom: scale
      }
    }))
  },

  // Reset canvas state for project switching
  resetCanvas: () => {
    set(() => ({
      viewport: { x: 0, y: 0, zoom: 1 },
      dragState: { isDragging: false },
      selectionState: { selectedEntities: new Set(), selectedConnections: new Set() },
      connectionMode: { isActive: false },
      rectangleSelection: { isActive: false },
      snappingState: {
        isEnabled: true,
        snapDistance: 10,
        activeGuides: [],
        snapPosition: undefined
      },
      currentLayer: 1
    }))
  }
}))

// Add helper methods to the store
Object.assign(useCanvasStore.getState(), {
  selectEntity: useCanvasStore.getState().selectEntity,
  selectConnection: useCanvasStore.getState().selectConnection,
  clearSelection: useCanvasStore.getState().clearSelection,
  panTo: useCanvasStore.getState().panTo,
  zoomToFit: useCanvasStore.getState().zoomToFit
})