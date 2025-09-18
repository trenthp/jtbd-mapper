'use client'

import { useState, useEffect, useRef } from 'react'
import { EntityWithRelations } from '@/lib/types'
import { X, Save, Trash2 } from 'lucide-react'

interface InlineEntityEditorProps {
  entity: EntityWithRelations | null
  position: { x: number, y: number }
  isOpen: boolean
  onClose: () => void
  onSave: (entityId: string, updates: any) => void
  onDelete: (entityId: string) => void
}

export function InlineEntityEditor({ 
  entity, 
  position, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete 
}: InlineEntityEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    // TODO: Uncomment these fields later when we need them
    // description: '',
    // tags: [] as string[],
    // data: {} as any
  })
  const [isSaving, setIsSaving] = useState(false)
  
  const editorRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (isOpen && editorRef.current) {
      // Focus the first input when editor opens
      const firstInput = editorRef.current.querySelector('input') as HTMLInputElement
      if (firstInput) {
        firstInput.focus()
        firstInput.select()
      }
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!entity) return
    
    setIsSaving(true)
    try {
      await onSave(entity.id, {
        title: formData.title,
        type: formData.type,
        // TODO: Uncomment these fields later when we need them
        // description: formData.description,
        // tags: formData.tags,
        // data: formData.data
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave()
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
    <div
      ref={editorRef}
      className="absolute z-50 bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[420px] backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.1)'
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-semibold text-gray-900">
            Edit {entity.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-medium"
            placeholder="Enter title..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1">
            Entity Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
          <label className="block text-xs font-semibold text-gray-800 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Enter description..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags.join(', ')}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="tag1, tag2, tag3"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {renderDataFields()}
        */}
      </div>

      <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-200">
        <button
          onClick={handleDelete}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </button>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.title.trim() || isSaving}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className={`h-3 w-3 mr-1 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
          <kbd className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs font-mono">Ctrl+Enter</kbd> to save
        </div>
        <div className="text-xs text-gray-400">•</div>
        <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
          <kbd className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs font-mono">Esc</kbd> to cancel
        </div>
      </div>
    </div>
  )
}