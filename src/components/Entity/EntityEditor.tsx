'use client'

import { useState, useEffect } from 'react'
import { Entity } from '@prisma/client'
import { EntityWithRelations } from '@/lib/types'
import { X, Save, Trash2 } from 'lucide-react'

interface EntityEditorProps {
  entity: EntityWithRelations | null
  isOpen: boolean
  onClose: () => void
  onSave: (entityId: string, updates: Partial<Entity>) => void
  onDelete: (entityId: string) => void
}

export function EntityEditor({ entity, isOpen, onClose, onSave, onDelete }: EntityEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    // TODO: Uncomment these fields later when we need them
    // description: '',
    // tags: [] as string[],
    // data: {} as any
  })

  useEffect(() => {
    if (entity) {
      setFormData({
        title: entity.title || '',
        type: entity.type || 'entity',
        // TODO: Uncomment these fields later when we need them
        // description: entity.description || '',
        // tags,
        // data: entity.data || {}
      })
    }
  }, [entity])

  const handleSave = () => {
    if (!entity) return

    onSave(entity.id, {
      title: formData.title,
      type: formData.type,
      // TODO: Uncomment these fields later when we need them
      // description: formData.description,
      // tags: formData.tags,
      // data: formData.data
    })
    onClose()
  }

  const handleDelete = () => {
    if (!entity) return
    if (window.confirm('Are you sure you want to delete this entity?')) {
      onDelete(entity.id)
      onClose()
    }
  }

  // TODO: Uncomment these helper functions later when we need them
  // const handleTagsChange = (tagsString: string) => {
  //   const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
  //   setFormData(prev => ({ ...prev, tags }))
  // }

  // const handleDataChange = (key: string, value: any) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     data: { ...prev.data, [key]: value }
  //   }))
  // }

  const getEntityTypeOptions = (layer: number) => {
    switch (layer) {
      case 1:
        return [
          { value: 'entity', label: 'Generic Entity' },
          { value: 'user_job', label: 'User Job' },
          { value: 'business_objective', label: 'Business Objective' },
          { value: 'secondary_consideration', label: 'Secondary Consideration' }
        ]
      case 2:
        return [
          { value: 'entity', label: 'Generic Entity' },
          { value: 'functional_spec', label: 'Functional Spec' },
          { value: 'content_requirement', label: 'Content Requirement' },
          { value: 'system_requirement', label: 'System Requirement' }
        ]
      case 3:
        return [
          { value: 'entity', label: 'Generic Entity' },
          { value: 'interaction_spec', label: 'Interaction Spec' },
          { value: 'information_architecture', label: 'Information Architecture' }
        ]
      case 4:
        return [
          { value: 'entity', label: 'Generic Entity' },
          { value: 'interface_element', label: 'Interface Element' },
          { value: 'navigation_design', label: 'Navigation Design' }
        ]
      default:
        return [{ value: 'entity', label: 'Generic Entity' }]
    }
  }

  // TODO: Uncomment this function later when we need the detailed entity fields
  // const renderDataFields = () => {
  //   if (!entity) return null
  //   // [Previous field rendering logic will go here]
  //   return null
  // }

  if (!isOpen || !entity) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit {entity.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter entity title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getEntityTypeOptions(entity.layer).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* TODO: Uncomment these fields later when we need them */}
          {/*
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags.join(', ')}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {renderDataFields()}
          */}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}