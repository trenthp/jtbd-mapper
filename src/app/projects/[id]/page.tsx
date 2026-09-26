'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Project } from '@prisma/client'
import { Trash2 } from 'lucide-react'
import { EntityWithRelations, LayerConnectionWithEntities } from '@/lib/types'
import { createEntity, createConnection } from '@/lib/commands'
import { useEntityStore } from '@/stores/entityStore'
import { typeDef } from '@/lib/entityTypes'
import { useCanvasStore } from '@/stores/canvasStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useUIStore } from '@/stores/uiStore'
import { ProjectCanvas } from '@/components/Projects/ProjectCanvas'
import { ProjectHeader } from '@/components/Workspace/ProjectHeader'
import { WorkspaceLayout } from '@/components/Workspace/WorkspaceLayout'

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentLayer = useCanvasStore(s => s.currentLayer)
  const setCurrentLayer = useCanvasStore(s => s.setCurrentLayer)

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
      useEntityStore.getState().resetStore()
      useHistoryStore.getState().clear()
      useCanvasStore.getState().resetCanvas()
      useUIStore.getState().closeInspector()

      const [entitiesResponse, connectionsResponse] = await Promise.all([
        fetch(`/api/entities?projectId=${projectId}`),
        fetch(`/api/connections?projectId=${projectId}`),
      ])
      const entitiesData = await entitiesResponse.json()
      const connectionsData = await connectionsResponse.json()

      entitiesData.entities.forEach((entity: EntityWithRelations) => {
        useEntityStore.getState().addEntity(entity)
      })
      connectionsData.connections.forEach((connection: LayerConnectionWithEntities) => {
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
      window.location.href = '/projects/new'
    }
  }, [projectId, fetchProject, fetchProjectData])

  const handleCreateEntity = async (type: string, position: { x: number; y: number }) => {
    try {
      const created = await createEntity({
        projectId,
        type,
        layer: currentLayer,
        title: `New ${typeDef(type).name.toLowerCase()}`,
        data: {},
        positionX: position.x,
        positionY: position.y,
      })
      useCanvasStore.getState().setSelectionState({ selectedEntities: new Set([created.id]), selectedConnections: new Set() })
    } catch (error) {
      console.error('Error creating entity:', error)
    }
  }

  const handleCreateConnection = async (fromEntityId: string, toEntityId: string) => {
    try {
      await createConnection({
        projectId,
        fromEntityId,
        toEntityId,
        connectionType: 'SUPPORTS',
        createdBy: 'user', // TODO: replace with the signed-in user once auth exists
      })
    } catch (error) {
      console.error('Error creating connection:', error)
    }
  }

  const handleNavigateToEntity = (entityId: string) => {
    const entity = useEntityStore.getState().entities.get(entityId)
    if (!entity) return
    const canvas = useCanvasStore.getState()
    setCurrentLayer(entity.layer)
    if (canvas.viewActions.panTo) canvas.viewActions.panTo(entity.positionX, entity.positionY)
    else canvas.panTo(entity.positionX, entity.positionY)
    canvas.setSelectionState({ selectedEntities: new Set([entityId]), selectedConnections: new Set() })
  }

  const handleExport = () => {
    if (!project) return
    const { entities, connections } = useEntityStore.getState()
    const payload = {
      project: { id: project.id, name: project.name, description: project.description },
      exportedAt: new Date().toISOString(),
      entities: Array.from(entities.values()),
      connections: Array.from(connections.values()),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'project'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete project')
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
      <div className="h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h1>
          <p className="text-gray-600">The project you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <WorkspaceLayout
        onNavigateToEntity={handleNavigateToEntity}
        header={
          <ProjectHeader
            project={project}
            onProjectChange={setProject}
            onDeleteRequest={() => setShowDeleteConfirm(true)}
            onExport={handleExport}
          />
        }
        canvas={
          <ProjectCanvas
            currentLayer={currentLayer}
            onCreateEntity={handleCreateEntity}
            onCreateConnection={handleCreateConnection}
            onNavigateToEntity={handleNavigateToEntity}
          />
        }
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete project</h3>
                <p className="text-sm text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Delete <strong>&quot;{project.name}&quot;</strong> and all of its entities and connections?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
