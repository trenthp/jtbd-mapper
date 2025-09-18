import { Entity, LayerConnection, ReconciliationStatus, Project } from '@prisma/client'

// Extended types with relationships
export interface EntityWithRelations extends Entity {
  fromConnections: LayerConnection[]
  toConnections: LayerConnection[]
  reconciliationStatus?: ReconciliationStatus | null
  project: Project
  tags: any // JSON field that can be string[] or string
}

export interface LayerConnectionWithEntities extends LayerConnection {
  fromEntity: Entity
  toEntity: Entity
  project: Project
}

// Frontend-specific types
export interface Position {
  x: number
  y: number
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface EntityVisual {
  width: number
  height: number
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderStyle: 'solid' | 'dashed' | 'dotted'
  opacity: number
  icon?: string
}

export interface ConnectionVisual {
  color: string
  thickness: number
  opacity: number
  dashPattern?: number[]
}

// Layer-specific data interfaces
export interface UserJobData {
  type: 'functional' | 'emotional' | 'social'
  jobStatement: string
  userSegment: string
  context: {
    when: string[]
    where: string[]
    why: string[]
  }
  successCriteria: string[]
  painPoints: string[]
  currentSolutions: string[]
  priority: 'high' | 'medium' | 'low'
  frequency: 'daily' | 'weekly' | 'monthly' | 'rarely'
}

export interface BusinessObjectiveData {
  category: 'revenue' | 'cost' | 'risk' | 'experience' | 'operational'
  metric: string
  target?: string
  timeframe?: string
  stakeholder: string
}

export interface SecondaryConsiderationData {
  category: 'constraint' | 'assumption' | 'dependency' | 'risk'
  impact: 'high' | 'medium' | 'low'
  likelihood?: 'high' | 'medium' | 'low'
}

export interface FunctionalSpecData {
  specType: 'feature' | 'capability' | 'integration' | 'constraint'
  acceptanceCriteria: string[]
  businessRules: string[]
  dependencies: string[]
  priority: 'must-have' | 'should-have' | 'could-have' | 'wont-have'
  effort: 'xs' | 's' | 'm' | 'l' | 'xl'
}

export interface ContentRequirementData {
  contentType: 'copy' | 'image' | 'video' | 'data' | 'document'
  purpose: string
  audience: string[]
  tone?: string
  length?: string
  format?: string
  source?: string
}

export interface SystemRequirementData {
  systemType: 'database' | 'api' | 'service' | 'integration'
  technology?: string[]
  performance?: string[]
  security?: string[]
  scalability?: string[]
}

export interface InteractionSpecData {
  interactionType: 'user-flow' | 'user-story' | 'use-case' | 'scenario'
  actor: string
  trigger: string
  steps: string[]
  alternativeFlows?: string[]
  exceptions?: string[]
}

export interface InformationArchitectureData {
  structureType: 'hierarchy' | 'taxonomy' | 'choreography' | 'ecosystem'
  elements: string[]
  relationships: string[]
  navigation?: string[]
}

export interface InterfaceElementData {
  elementType: 'page' | 'component' | 'pattern' | 'template'
  functionality: string[]
  content: string[]
  interactions: string[]
  states: string[]
}

export interface NavigationDesignData {
  navType: 'primary' | 'secondary' | 'utility' | 'contextual'
  structure: 'linear' | 'hierarchical' | 'hub' | 'web'
  elements: string[]
  behavior: string[]
}

// Union type for all entity data types
export type EntityData = 
  | UserJobData
  | BusinessObjectiveData
  | SecondaryConsiderationData
  | FunctionalSpecData
  | ContentRequirementData
  | SystemRequirementData
  | InteractionSpecData
  | InformationArchitectureData
  | InterfaceElementData
  | NavigationDesignData

// Canvas interaction types
export interface DragState {
  isDragging: boolean
  entityId?: string
  startPosition?: Position
  currentPosition?: Position
}

export interface SelectionState {
  selectedEntities: Set<string>
  selectedConnections: Set<string>
}

export interface RectangleSelection {
  isActive: boolean
  startPosition?: Position
  currentPosition?: Position
}

export interface SnapGuide {
  id: string
  type: 'horizontal' | 'vertical'
  position: number
  entities: string[] // Entity IDs that create this guide
}

export interface SnappingState {
  isEnabled: boolean
  snapDistance: number
  activeGuides: SnapGuide[]
  snapPosition?: Position
}

export interface GridSettings {
  isVisible: boolean
  snapToGrid: boolean
  gridSize: number
  gridColor: string
  gridOpacity: number
}

export interface ConnectionMode {
  isActive: boolean
  fromEntityId?: string
  previewPosition?: Position
}

export interface CanvasTool {
  type: 'select' | 'pan' | 'connect'
  cursor: string
}

// Event types
export interface EntityChangeEvent {
  type: 'entity:created' | 'entity:updated' | 'entity:deleted'
  entityId: string
  changes?: Partial<Entity>
  userId: string
  timestamp: number
}

export interface ConnectionChangeEvent {
  type: 'connection:created' | 'connection:updated' | 'connection:deleted'
  connectionId: string
  changes?: Partial<LayerConnection>
  userId: string
  timestamp: number
}

export interface ReconciliationEvent {
  type: 'reconciliation:triggered' | 'reconciliation:resolved'
  entityId: string
  state: ReconciliationStatus['state']
  triggeredBy?: string
  reason: string
  userId: string
  timestamp: number
}

// Store interfaces
export interface EntityStore {
  entities: Map<string, EntityWithRelations>
  connections: Map<string, LayerConnectionWithEntities>
  reconciliationStates: Map<string, ReconciliationStatus>

  // Actions
  addEntity: (entity: EntityWithRelations) => void
  updateEntity: (entityId: string, changes: Partial<Entity>) => void
  removeEntity: (entityId: string) => void
  addConnection: (connection: LayerConnectionWithEntities) => void
  updateConnection: (connectionId: string, changes: Partial<LayerConnection>) => void
  removeConnection: (connectionId: string) => void
  setReconciliationState: (entityId: string, state: ReconciliationStatus) => void

  // Bulk operations
  removeEntities: (entityIds: string[]) => void
  removeConnections: (connectionIds: string[]) => void
  duplicateEntity: (entityId: string, offset?: { x: number; y: number }) => EntityWithRelations | null

  // Helper methods
  getEntitiesByLayer: (layer: number) => EntityWithRelations[]
  getConnectionsForEntity: (entityId: string) => LayerConnectionWithEntities[]
  getReconciliationState: (entityId: string) => ReconciliationStatus | undefined
  cleanupTemporaryEntities: () => void
}

export interface CanvasStore {
  viewport: Viewport
  dragState: DragState
  selectionState: SelectionState
  connectionMode: ConnectionMode
  rectangleSelection: RectangleSelection
  snappingState: SnappingState
  gridSettings: GridSettings
  currentTool: CanvasTool
  isPanMode: boolean
  currentLayer: number

  // Actions
  setViewport: (viewport: Partial<Viewport>) => void
  setDragState: (dragState: Partial<DragState>) => void
  setSelectionState: (selectionState: Partial<SelectionState>) => void
  setConnectionMode: (connectionMode: Partial<ConnectionMode>) => void
  setRectangleSelection: (rectangleSelection: Partial<RectangleSelection>) => void
  setSnappingState: (snappingState: Partial<SnappingState>) => void
  setGridSettings: (gridSettings: Partial<GridSettings>) => void
  setCurrentTool: (tool: CanvasTool) => void
  setIsPanMode: (isPanMode: boolean) => void
  setCurrentLayer: (layer: number) => void

  // Selection helpers
  selectEntity: (entityId: string, multiSelect?: boolean) => void
  selectConnection: (connectionId: string, multiSelect?: boolean) => void
  clearSelection: () => void
  selectEntitiesInRectangle: (rect: { x: number, y: number, width: number, height: number }) => void

  // Navigation helpers
  panTo: (x: number, y: number) => void
  zoomToFit: (entities: Array<{ positionX: number; positionY: number }>) => void
}