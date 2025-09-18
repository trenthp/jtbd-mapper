'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Project } from '@prisma/client'
import { ProjectCanvas } from '@/components/Projects/ProjectCanvas'
import { ProjectSidebar } from '@/components/Projects/ProjectSidebar'
import { useEntityStore } from '@/stores/entityStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { ArrowLeft, Trash2 } from 'lucide-react'

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const { currentLayer, setCurrentLayer } = useCanvasStore()
  const { entities, connections } = useEntityStore()

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      const data = await response.json()
      setProject(data.project)
    } catch (error) {
      console.error('Error fetching project:', error)
    }
  }, [projectId])

  const fetchProjectData = useCallback(async () => {
    try {
      const [entitiesResponse, connectionsResponse] = await Promise.all([
        fetch(`/api/entities?projectId=${projectId}`),
        fetch(`/api/connections?projectId=${projectId}`)
      ])

      const entitiesData = await entitiesResponse.json()
      const connectionsData = await connectionsResponse.json()

      // Load data into stores
      entitiesData.entities.forEach((entity: any) => {
        useEntityStore.getState().addEntity(entity)
      })

      connectionsData.connections.forEach((connection: any) => {
        useEntityStore.getState().addConnection(connection)
      })
    } catch (error) {
      console.error('Error fetching project data:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId && projectId !== 'new') {
      fetchProject()
      fetchProjectData()
    } else if (projectId === 'new') {
      // This should not happen with proper routing
      window.location.href = '/projects/new'
    }
  }, [projectId, fetchProject, fetchProjectData])

  const handleCreateEntity = async (entityData: any) => {
    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entityData,
          projectId,
          layer: currentLayer
        })
      })
      
      const data = await response.json()
      useEntityStore.getState().addEntity(data.entity)
    } catch (error) {
      console.error('Error creating entity:', error)
    }
  }

  const handleCreateConnection = async (fromEntityId: string, toEntityId: string) => {
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          fromEntityId,
          toEntityId,
          connectionType: 'SUPPORTS',
          createdBy: 'user' // TODO: Replace with actual user ID
        })
      })
      
      const data = await response.json()
      
      // Add better error handling
      if (!response.ok) {
        console.error('API Error:', data.error || 'Unknown error')
        return
      }
      
      if (!data.connection) {
        console.error('No connection returned from API:', data)
        return
      }
      
      if (!data.connection.id) {
        console.error('Connection missing ID:', data.connection)
        return
      }
      
      useEntityStore.getState().addConnection(data.connection)
    } catch (error) {
      console.error('Error creating connection:', error)
    }
  }

  const handleNavigateToEntity = async (entityId: string) => {
    try {
      // Find the entity to get its layer
      const entity = entities.get(entityId)
      if (entity) {
        // Switch to the entity's layer
        setCurrentLayer(entity.layer)

        // Focus on the entity by panning to it and selecting it
        const canvasStore = useCanvasStore.getState()
        canvasStore.panTo(entity.positionX, entity.positionY)
        canvasStore.selectEntity(entityId, false)

        // Small delay to ensure layer switch has completed, then open entity for editing
        setTimeout(() => {
          // You could also trigger the entity double-click here to open inline editor
          console.log(`Navigated to entity ${entityId} on layer ${entity.layer}`)
        }, 100)
      }
    } catch (error) {
      console.error('Error navigating to entity:', error)
    }
  }

  const handleBackToProjects = () => {
    router.push('/')
  }

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      router.push('/')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h1>
          <p className="text-gray-600">The project you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToProjects}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to projects
          </button>
          <div className="h-4 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        {sidebarOpen && (
          <ProjectSidebar
            project={project}
            currentLayer={currentLayer}
            onCreateEntity={handleCreateEntity}
            onClose={() => setSidebarOpen(false)}
            onLayerChange={setCurrentLayer}
            entityCounts={{
              1: Array.from(entities.values()).filter(e => e.layer === 1).length,
              2: Array.from(entities.values()).filter(e => e.layer === 2).length,
              3: Array.from(entities.values()).filter(e => e.layer === 3).length,
              4: Array.from(entities.values()).filter(e => e.layer === 4).length
            }}
            sidebarToggle={
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            }
          />
        )}

        {/* Sidebar toggle when closed */}
        {!sidebarOpen && (
          <div className="p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg bg-white shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 relative">
          <ProjectCanvas
            projectId={projectId}
            currentLayer={currentLayer}
            onCreateConnection={handleCreateConnection}
            onNavigateToEntity={handleNavigateToEntity}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Project</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>"{project.name}"</strong>?
              This will permanently remove the project and all its data including entities, connections, and layers.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 inline-flex items-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}