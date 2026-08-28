// Single source of truth for layers, entity types, and the editable fields
// of each type's `data` JSON. Used by the header, tool strip, outline,
// inspector, and landing page.
import type { LucideIcon } from 'lucide-react'
import {
  User, Target, FileText, Settings, Database, MousePointer, Layout, Navigation, Box,
} from 'lucide-react'

export interface LayerDef {
  id: number
  name: string
  short: string
  blurb: string
  /** Tailwind colour family used for the segmented control and outline accents */
  tone: 'blue' | 'green' | 'purple' | 'orange'
}

export const LAYERS: LayerDef[] = [
  { id: 1, name: 'Jobs & Objectives', short: 'Jobs', blurb: 'User jobs, business objectives, and secondary considerations', tone: 'blue' },
  { id: 2, name: 'Specifications', short: 'Specs', blurb: 'Functional specs, content requirements, and system needs', tone: 'green' },
  { id: 3, name: 'Interactions', short: 'Flows', blurb: 'Interaction flows and information architecture', tone: 'purple' },
  { id: 4, name: 'Interface Design', short: 'UI', blurb: 'Screens and components that deliver each interaction', tone: 'orange' },
]

export function layerDef(id: number): LayerDef {
  return LAYERS.find(l => l.id === id) ?? LAYERS[0]
}

export type FieldKind = 'text' | 'textarea' | 'select' | 'list'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  options?: string[]
  placeholder?: string
}

export interface EntityTypeDef {
  type: string
  name: string
  layer: number
  icon: LucideIcon
  /** Tailwind text colour class for icons */
  color: string
  /** Fields inside the entity's `data` JSON, in display order */
  fields: FieldDef[]
}

const text = (key: string, label: string, placeholder?: string): FieldDef => ({ key, label, kind: 'text', placeholder })
const area = (key: string, label: string, placeholder?: string): FieldDef => ({ key, label, kind: 'textarea', placeholder })
const select = (key: string, label: string, options: string[]): FieldDef => ({ key, label, kind: 'select', options })
const list = (key: string, label: string, placeholder?: string): FieldDef => ({ key, label, kind: 'list', placeholder })

export const ENTITY_TYPES: EntityTypeDef[] = [
  {
    type: 'user_job', name: 'User Job', layer: 1, icon: User, color: 'text-blue-600',
    fields: [
      area('jobStatement', 'Job statement', 'When I…, I want to…, so I can…'),
      select('type', 'Job type', ['functional', 'emotional', 'social']),
      text('userSegment', 'User segment'),
      select('priority', 'Priority', ['high', 'medium', 'low']),
      select('frequency', 'Frequency', ['daily', 'weekly', 'monthly', 'rarely']),
      list('successCriteria', 'Success criteria'),
      list('painPoints', 'Pain points'),
      list('currentSolutions', 'Current solutions'),
    ],
  },
  {
    type: 'business_objective', name: 'Business Objective', layer: 1, icon: Target, color: 'text-amber-600',
    fields: [
      select('category', 'Category', ['revenue', 'cost', 'risk', 'experience', 'operational']),
      text('metric', 'Metric'),
      text('target', 'Target'),
      text('timeframe', 'Timeframe'),
      text('stakeholder', 'Stakeholder'),
    ],
  },
  {
    type: 'secondary_consideration', name: 'Secondary Consideration', layer: 1, icon: FileText, color: 'text-violet-600',
    fields: [
      select('category', 'Category', ['constraint', 'assumption', 'dependency', 'risk']),
      select('impact', 'Impact', ['high', 'medium', 'low']),
      select('likelihood', 'Likelihood', ['high', 'medium', 'low']),
    ],
  },
  {
    type: 'functional_spec', name: 'Functional Spec', layer: 2, icon: Settings, color: 'text-green-600',
    fields: [
      select('specType', 'Spec type', ['feature', 'capability', 'integration', 'constraint']),
      select('priority', 'Priority', ['must-have', 'should-have', 'could-have', 'wont-have']),
      select('effort', 'Effort', ['xs', 's', 'm', 'l', 'xl']),
      list('acceptanceCriteria', 'Acceptance criteria'),
      list('businessRules', 'Business rules'),
      list('dependencies', 'Dependencies'),
    ],
  },
  {
    type: 'content_requirement', name: 'Content Requirement', layer: 2, icon: FileText, color: 'text-pink-600',
    fields: [
      select('contentType', 'Content type', ['copy', 'image', 'video', 'data', 'document']),
      area('purpose', 'Purpose'),
      list('audience', 'Audience'),
      text('tone', 'Tone'),
      text('length', 'Length'),
      text('format', 'Format'),
      text('source', 'Source'),
    ],
  },
  {
    type: 'system_requirement', name: 'System Requirement', layer: 2, icon: Database, color: 'text-sky-600',
    fields: [
      select('systemType', 'System type', ['database', 'api', 'service', 'integration']),
      list('technology', 'Technology'),
      list('performance', 'Performance'),
      list('security', 'Security'),
      list('scalability', 'Scalability'),
    ],
  },
  {
    type: 'interaction_spec', name: 'Interaction Spec', layer: 3, icon: MousePointer, color: 'text-orange-600',
    fields: [
      select('interactionType', 'Interaction type', ['user-flow', 'user-story', 'use-case', 'scenario']),
      text('actor', 'Actor'),
      text('trigger', 'Trigger'),
      list('steps', 'Steps'),
      list('alternativeFlows', 'Alternative flows'),
      list('exceptions', 'Exceptions'),
    ],
  },
  {
    type: 'information_architecture', name: 'Information Architecture', layer: 3, icon: Layout, color: 'text-sky-600',
    fields: [
      select('structureType', 'Structure', ['hierarchy', 'taxonomy', 'choreography', 'ecosystem']),
      list('elements', 'Elements'),
      list('relationships', 'Relationships'),
      list('navigation', 'Navigation'),
    ],
  },
  {
    type: 'interface_element', name: 'Interface Element', layer: 4, icon: Layout, color: 'text-emerald-600',
    fields: [
      select('elementType', 'Element type', ['page', 'component', 'pattern', 'template']),
      list('functionality', 'Functionality'),
      list('content', 'Content'),
      list('interactions', 'Interactions'),
      list('states', 'States'),
    ],
  },
  {
    type: 'navigation_design', name: 'Navigation Design', layer: 4, icon: Navigation, color: 'text-fuchsia-600',
    fields: [
      select('navType', 'Navigation type', ['primary', 'secondary', 'utility', 'contextual']),
      select('structure', 'Structure', ['linear', 'hierarchical', 'hub', 'web']),
      list('elements', 'Elements'),
      list('behavior', 'Behaviour'),
    ],
  },
]

const GENERIC: EntityTypeDef = { type: 'entity', name: 'Entity', layer: 0, icon: Box, color: 'text-gray-500', fields: [] }

export function typesForLayer(layer: number): EntityTypeDef[] {
  return ENTITY_TYPES.filter(t => t.layer === layer)
}

/** The type created by a plain "add" on a layer: the first listed for it. */
export function defaultTypeForLayer(layer: number): EntityTypeDef {
  return typesForLayer(layer)[0] ?? GENERIC
}

export function typeDef(type: string): EntityTypeDef {
  return ENTITY_TYPES.find(t => t.type === type) ?? { ...GENERIC, name: formatTypeName(type) }
}

export function formatTypeName(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export const CONNECTION_TYPES = ['SUPPORTS', 'DERIVES_FROM', 'CONFLICTS_WITH', 'INFORMS'] as const
export const CONNECTION_STRENGTHS = ['STRONG', 'MEDIUM', 'WEAK'] as const
export const ENTITY_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const
