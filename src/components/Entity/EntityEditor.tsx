'use client'

import { useState, useEffect } from 'react'
import { EntityWithRelations } from '@/lib/types'
import { X, Save, Trash2 } from 'lucide-react'

interface EntityEditorProps {
  entity: EntityWithRelations | null
  isOpen: boolean
  onClose: () => void
  onSave: (entityId: string, updates: any) => void
  onDelete: (entityId: string) => void
}

export function EntityEditor({ entity, isOpen, onClose, onSave, onDelete }: EntityEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    data: {} as any
  })

  useEffect(() => {
    if (entity) {
      // Parse tags safely
      let tags: string[] = []
      try {
        if (typeof entity.tags === 'string') {
          tags = JSON.parse(entity.tags)
        } else if (Array.isArray(entity.tags)) {
          tags = entity.tags
        }
      } catch {
        tags = []
      }

      setFormData({
        title: entity.title || '',
        description: entity.description || '',
        tags,
        data: entity.data || {}
      })
    }
  }, [entity])

  const handleSave = () => {
    if (!entity) return
    
    onSave(entity.id, {
      title: formData.title,
      description: formData.description,
      tags: formData.tags,
      data: formData.data
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

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    setFormData(prev => ({ ...prev, tags }))
  }

  const handleDataChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      data: { ...prev.data, [key]: value }
    }))
  }

  const renderDataFields = () => {
    if (!entity) return null

    switch (entity.type) {
      case 'user_job':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type
              </label>
              <select
                value={formData.data.type || 'functional'}
                onChange={(e) => handleDataChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="functional">Functional</option>
                <option value="emotional">Emotional</option>
                <option value="social">Social</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Statement
              </label>
              <textarea
                value={formData.data.jobStatement || ''}
                onChange={(e) => handleDataChange('jobStatement', e.target.value)}
                placeholder="When I [situation], I want to [motivation], so I can [expected outcome]"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Segment
              </label>
              <input
                type="text"
                value={formData.data.userSegment || ''}
                onChange={(e) => handleDataChange('userSegment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )

      case 'business_objective':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.data.category || 'revenue'}
                onChange={(e) => handleDataChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="revenue">Revenue</option>
                <option value="cost">Cost</option>
                <option value="risk">Risk</option>
                <option value="experience">Experience</option>
                <option value="operational">Operational</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metric
              </label>
              <input
                type="text"
                value={formData.data.metric || ''}
                onChange={(e) => handleDataChange('metric', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stakeholder
              </label>
              <input
                type="text"
                value={formData.data.stakeholder || ''}
                onChange={(e) => handleDataChange('stakeholder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )

      case 'functional_spec':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spec Type
              </label>
              <select
                value={formData.data.specType || 'feature'}
                onChange={(e) => handleDataChange('specType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="feature">Feature</option>
                <option value="capability">Capability</option>
                <option value="integration">Integration</option>
                <option value="constraint">Constraint</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.data.priority || 'should-have'}
                onChange={(e) => handleDataChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="must-have">Must Have</option>
                <option value="should-have">Should Have</option>
                <option value="could-have">Could Have</option>
                <option value="wont-have">Won't Have</option>
              </select>
            </div>
          </>
        )

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Data (JSON)
            </label>
            <textarea
              value={JSON.stringify(formData.data, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setFormData(prev => ({ ...prev, data: parsed }))
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        )
    }
  }

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
            />
          </div>

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