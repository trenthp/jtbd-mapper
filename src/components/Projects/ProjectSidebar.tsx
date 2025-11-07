'use client'

import { useState } from 'react'
import { Project, Entity } from '@prisma/client'
import { X, Plus, User, Target, FileText, Settings, MousePointer, Layout, Navigation, Circle } from 'lucide-react'
import { CanvasToolbar } from '@/components/Canvas/CanvasToolbar'
import { LayerTabs } from '@/components/Projects/LayerTabs'

interface ProjectSidebarProps {
  project: Project
  currentLayer: number
  onCreateEntity: (entityData: Partial<Entity>) => void
  onClose: () => void
  sidebarToggle?: React.ReactNode
  onLayerChange: (layer: number) => void
  entityCounts: Record<number, number>
}

export function ProjectSidebar({ project, currentLayer, onCreateEntity, onClose, sidebarToggle, onLayerChange, entityCounts }: ProjectSidebarProps) {
  const [activeTab, setActiveTab] = useState<'entities' | 'tools'>('entities')

  const getEntitiesForLayer = (layer: number) => {
    switch (layer) {
      case 1:
        return [
          { type: 'user_job', name: 'User Job', icon: User, color: 'text-blue-600' },
          { type: 'business_objective', name: 'Business Objective', icon: Target, color: 'text-amber-600' },
          { type: 'secondary_consideration', name: 'Secondary Consideration', icon: FileText, color: 'text-violet-600' }
        ]
      case 2:
        return [
          { type: 'functional_spec', name: 'Functional Spec', icon: Settings, color: 'text-green-600' },
          { type: 'content_requirement', name: 'Content Requirement', icon: FileText, color: 'text-pink-600' },
          { type: 'system_requirement', name: 'System Requirement', icon: Settings, color: 'text-sky-600' }
        ]
      case 3:
        return [
          { type: 'interaction_spec', name: 'Interaction Spec', icon: MousePointer, color: 'text-orange-600' },
          { type: 'information_architecture', name: 'Information Architecture', icon: Layout, color: 'text-sky-600' }
        ]
      case 4:
        return [
          { type: 'interface_element', name: 'Interface Element', icon: Layout, color: 'text-emerald-600' },
          { type: 'navigation_design', name: 'Navigation Design', icon: Navigation, color: 'text-fuchsia-600' }
        ]
      default:
        return []
    }
  }

  const handleCreateEntity = (type?: string) => {
    onCreateEntity({
      type: type || 'entity',
      title: type ? `New ${type.replace('_', ' ')}` : 'New Entity',
      positionX: Math.random() * 400 + 100,
      positionY: Math.random() * 400 + 100
    })
  }

  const entities = getEntitiesForLayer(currentLayer)

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {sidebarToggle}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-600">{project.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Layer Navigation Stack */}
      <div className="p-4 border-b border-gray-200">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Layer Navigation
          </h3>
          <p className="text-xs text-gray-500">
            Switch between different mapping layers
          </p>
        </div>

        <div className="space-y-2">
          <LayerTabs
            currentLayer={currentLayer}
            onLayerChange={onLayerChange}
            entityCounts={entityCounts}
            vertical={true}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('entities')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            activeTab === 'entities'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Entities
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            activeTab === 'tools'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tools
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'entities' ? (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Add to Layer {currentLayer}
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Start with a blank entity or choose a specific type
              </p>
            </div>

            {/* Primary Add Entity Button */}
            <div className="mb-4">
              <button
                onClick={() => handleCreateEntity()}
                className="w-full p-4 text-left rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-blue-900 text-sm">
                      Add Entity
                    </div>
                    <div className="text-xs text-blue-700">
                      Create a blank entity to get started
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Entity Type Options */}
            {entities.length > 0 && (
              <>
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Or choose a specific type
                  </h4>
                </div>
                <div className="space-y-2">
                  {entities.map((entity) => {
                    const IconComponent = entity.icon
                    return (
                      <button
                        key={entity.type}
                        onClick={() => handleCreateEntity(entity.type)}
                        className="w-full p-2 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${entity.color}`} />
                          <div className="text-sm text-gray-700">
                            {entity.name}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {entities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Layout className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No specific types for this layer</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <CanvasToolbar />

            {/* Canvas Controls */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Canvas Controls
              </h3>
              <div className="text-xs text-gray-500 space-y-1">
                <div><strong>Scroll</strong> - Zoom in/out</div>
                <div><strong>Drag</strong> - Pan around canvas</div>
                <div><strong>Double-click</strong> - Edit entity</div>
                <div><strong>Space + Drag</strong> - Pan mode</div>
                <div><strong>Middle Mouse</strong> - Pan mode</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <div>Framework: {project.framework}</div>
          <div>Layer: {currentLayer} of 4</div>
        </div>
      </div>
    </div>
  )
}