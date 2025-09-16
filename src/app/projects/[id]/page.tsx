'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Project } from '@prisma/client'
import { ProjectCanvas } from '@/components/Projects/ProjectCanvas'
import { ProjectSidebar } from '@/components/Projects/ProjectSidebar'
import { LayerTabs } from '@/components/Projects/LayerTabs'
import { useEntityStore } from '@/stores/entityStore'
import { useCanvasStore } from '@/stores/canvasStore'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const { currentLayer, setCurrentLayer } = useCanvasStore()
  const { entities, connections } = useEntityStore()

  useEffect(() => {
    if (projectId && projectId !== 'new') {
      fetchProject()
      fetchProjectData()
    } else if (projectId === 'new') {
      // This should not happen with proper routing
      window.location.href = '/projects/new'
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      const data = await response.json()
      setProject(data.project)
    } catch (error) {
      console.error('Error fetching project:', error)
    }
  }

  const fetchProjectData = async () => {
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
  }

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
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      {sidebarOpen && (
        <ProjectSidebar
          project={project}
          currentLayer={currentLayer}
          onCreateEntity={handleCreateEntity}
          onClose={() => setSidebarOpen(false)}
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
        
        {/* Right-side vertical layer tabs */}
        <div className="absolute top-4 right-6 z-10">
          <LayerTabs 
            currentLayer={currentLayer}
            onLayerChange={setCurrentLayer}
            entityCounts={{
              1: Array.from(entities.values()).filter(e => e.layer === 1).length,
              2: Array.from(entities.values()).filter(e => e.layer === 2).length,
              3: Array.from(entities.values()).filter(e => e.layer === 3).length,
              4: Array.from(entities.values()).filter(e => e.layer === 4).length
            }}
            vertical={true}
          />
        </div>
      </div>
    </div>
  )
}