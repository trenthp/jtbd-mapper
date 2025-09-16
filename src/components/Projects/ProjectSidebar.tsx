'use client'

import { useState } from 'react'
import { Project } from '@prisma/client'
import { X, Plus, User, Target, FileText, Settings, MousePointer, Layout, Navigation } from 'lucide-react'

interface ProjectSidebarProps {
  project: Project
  currentLayer: number
  onCreateEntity: (entityData: any) => void
  onClose: () => void
  sidebarToggle?: React.ReactNode
}

export function ProjectSidebar({ project, currentLayer, onCreateEntity, onClose, sidebarToggle }: ProjectSidebarProps) {
  const [activeTab, setActiveTab] = useState<'entities' | 'properties'>('entities')

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

  const handleCreateEntity = (type: string) => {
    onCreateEntity({
      type,
      title: `New ${type.replace('_', ' ')}`,
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
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            activeTab === 'properties' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Properties
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'entities' ? (
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Layer {currentLayer} Entities
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Click to add entities to the canvas
              </p>
            </div>

            <div className="space-y-2">
              {entities.map((entity) => {
                const IconComponent = entity.icon
                return (
                  <button
                    key={entity.type}
                    onClick={() => handleCreateEntity(entity.type)}
                    className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`h-5 w-5 ${entity.color}`} />
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {entity.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Add to Layer {currentLayer}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {entities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Layout className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No entities available for this layer</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select an entity to view properties</p>
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