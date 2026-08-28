'use client'

import { useState, useCallback } from 'react'
import { useEntityStore } from '@/stores/entityStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { EntityWithRelations } from '@/lib/types'
import { createEntities } from '@/lib/commands'
import { EntityCreateInput } from '@/lib/client/api'

interface ClipboardData {
  entities: EntityWithRelations[]
  timestamp: number
}

export function useClipboard() {
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null)
  const { entities } = useEntityStore()
  const { selectionState } = useCanvasStore()

  const copySelected = useCallback(() => {
    const selectedEntities = Array.from(selectionState.selectedEntities)
      .map(id => entities.get(id))
      .filter(Boolean) as EntityWithRelations[]

    if (selectedEntities.length === 0) return false

    const clipboardContent = {
      entities: selectedEntities,
      timestamp: Date.now()
    }

    setClipboardData(clipboardContent)

    // Also copy to system clipboard as JSON (for advanced users)
    try {
      navigator.clipboard?.writeText(JSON.stringify(clipboardContent, null, 2))
    } catch (error) {
      console.warn('Could not write to system clipboard:', error)
    }

    return true
  }, [entities, selectionState.selectedEntities])

  const paste = useCallback(async (position?: { x: number; y: number }) => {
    if (!clipboardData || clipboardData.entities.length === 0) {
      return false
    }

    // Calculate paste position
    const basePosition = position || { x: 100, y: 100 }

    // If pasting multiple entities, arrange them in a grid
    const gridSize = Math.ceil(Math.sqrt(clipboardData.entities.length))
    const entitySpacing = 220 // Entity width + padding

    try {
      const inputs: EntityCreateInput[] = clipboardData.entities.map((entity, index) => {
        const row = Math.floor(index / gridSize)
        const col = index % gridSize
        return {
          type: entity.type,
          layer: entity.layer,
          title: `${entity.title} (Pasted)`,
          description: entity.description,
          data: entity.data,
          positionX: basePosition.x + (col * entitySpacing),
          positionY: basePosition.y + (row * 140), // Entity height + padding
          tags: entity.tags,
          projectId: entity.projectId,
          status: entity.status
        }
      })
      await createEntities(inputs, 'Paste')
      return true
    } catch (error) {
      console.error('Failed to paste entities:', error)
      return false
    }
  }, [clipboardData])

  const duplicate = useCallback(async (entityIds?: string[], offset = { x: 20, y: 20 }) => {
    const targetIds = entityIds || Array.from(selectionState.selectedEntities)

    if (targetIds.length === 0) return false

    try {
      const inputs: EntityCreateInput[] = targetIds
        .map(id => entities.get(id))
        .filter((e): e is EntityWithRelations => !!e)
        .map(entity => ({
          type: entity.type,
          layer: entity.layer,
          title: `${entity.title} (Copy)`,
          description: entity.description,
          data: entity.data,
          positionX: entity.positionX + offset.x,
          positionY: entity.positionY + offset.y,
          tags: entity.tags,
          projectId: entity.projectId,
          status: entity.status
        }))
      await createEntities(inputs, 'Duplicate')
      return true
    } catch (error) {
      console.error('Failed to duplicate entities:', error)
      return false
    }
  }, [entities, selectionState.selectedEntities])

  const canPaste = useCallback(() => {
    return clipboardData !== null && clipboardData.entities.length > 0
  }, [clipboardData])

  const getClipboardInfo = useCallback(() => {
    if (!clipboardData) return null

    return {
      count: clipboardData.entities.length,
      timestamp: clipboardData.timestamp,
      entities: clipboardData.entities.map(e => ({ id: e.id, title: e.title, type: e.type }))
    }
  }, [clipboardData])

  return {
    copy: copySelected,
    paste,
    duplicate,
    canPaste: canPaste(),
    clipboardInfo: getClipboardInfo()
  }
}