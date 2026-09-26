'use client'

import { useEffect, useCallback } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'

interface KeyboardShortcutsProps {
  onDelete?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onDuplicate?: () => void
  onSelectAll?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomToFit?: () => void
  onCreateEntity?: () => void
  isEnabled?: boolean
}

export function useKeyboardShortcuts({
  onDelete,
  onCopy,
  onPaste,
  onDuplicate,
  onSelectAll,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onCreateEntity,
  isEnabled = true
}: KeyboardShortcutsProps) {
  const { clearSelection, setCurrentTool, setConnectionMode, connectionMode } = useCanvasStore()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts if typing in inputs
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true') {
      return
    }

    // Don't trigger if disabled
    if (!isEnabled) return

    const { key, ctrlKey, metaKey, shiftKey } = event
    const cmdKey = ctrlKey || metaKey // Support both Ctrl and Cmd


    // Prevent browser defaults for our shortcuts
    const preventDefault = () => {
      event.preventDefault()
      event.stopPropagation()
    }

    switch (key.toLowerCase()) {
      // Delete selected items
      case 'delete':
      case 'backspace':
        if (onDelete) {
          preventDefault()
          onDelete()
        }
        break

      // Copy / Connect tool
      case 'c':
        if (cmdKey && onCopy) {
          preventDefault()
          onCopy()
        } else if (!cmdKey) {
          preventDefault()
          const next = !connectionMode.isActive
          setConnectionMode({ isActive: next, fromEntityId: undefined })
          setCurrentTool({ type: 'select', cursor: next ? 'crosshair' : 'default' })
        }
        break

      // Paste / Select tool
      case 'v':
        if (cmdKey && onPaste) {
          preventDefault()
          onPaste()
        } else if (!cmdKey) {
          preventDefault()
          setConnectionMode({ isActive: false, fromEntityId: undefined })
          setCurrentTool({ type: 'select', cursor: 'default' })
        }
        break

      // Duplicate
      case 'd':
        if (cmdKey && onDuplicate) {
          preventDefault()
          onDuplicate()
        }
        break

      // Select All
      case 'a':
        if (cmdKey && onSelectAll) {
          preventDefault()
          onSelectAll()
        }
        break

      // Undo
      case 'z':
        if (cmdKey && !shiftKey) {
          preventDefault()
          onUndo?.()
        }
        // Redo (Ctrl+Shift+Z)
        else if (cmdKey && shiftKey) {
          preventDefault()
          onRedo?.()
        }
        break

      // Redo (Ctrl+Y)
      case 'y':
        if (cmdKey) {
          preventDefault()
          onRedo?.()
        }
        break

      // Zoom In
      case '=':
      case '+':
        if (cmdKey && onZoomIn) {
          preventDefault()
          onZoomIn()
        }
        break

      // Zoom Out
      case '-':
        if (cmdKey && onZoomOut) {
          preventDefault()
          onZoomOut()
        }
        break

      // Zoom to Fit
      case '0':
        if (cmdKey && onZoomToFit) {
          preventDefault()
          onZoomToFit()
        }
        break

      // Create new entity
      case 'n':
        if (cmdKey && shiftKey && onCreateEntity) {
          preventDefault()
          onCreateEntity()
        }
        break

      // Pan tool
      case 'h':
        if (!cmdKey) {
          preventDefault()
          setConnectionMode({ isActive: false, fromEntityId: undefined })
          setCurrentTool({ type: 'pan', cursor: 'grab' })
        }
        break

      // Clear selection
      case 'escape':
        preventDefault()
        clearSelection()
        break

      default:
        break
    }
  }, [
    onDelete, onCopy, onPaste, onDuplicate, onSelectAll,
    onUndo, onRedo, onZoomIn, onZoomOut, onZoomToFit,
    onCreateEntity, clearSelection, isEnabled, setCurrentTool, setConnectionMode, connectionMode.isActive
  ])

  const handleWheel = useCallback((event: WheelEvent) => {
    const { ctrlKey, metaKey } = event
    const cmdKey = ctrlKey || metaKey

    // Zoom with Ctrl/Cmd + wheel
    if (cmdKey) {
      event.preventDefault()

      if (event.deltaY < 0 && onZoomIn) {
        onZoomIn()
      } else if (event.deltaY > 0 && onZoomOut) {
        onZoomOut()
      }
    }
  }, [onZoomIn, onZoomOut])

  useEffect(() => {
    if (!isEnabled) return

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [handleKeyDown, handleWheel, isEnabled])

  return {
    // Helper function to check if a key combination is currently pressed
    isShortcutPressed: (_keys: string[]) => {
      // This would need additional state tracking if needed
      return false
    }
  }
}

// Helper function for displaying shortcuts in UI
export const KEYBOARD_SHORTCUTS = {
  delete: 'Delete',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  duplicate: 'Ctrl+D',
  selectAll: 'Ctrl+A',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Shift+Z / Ctrl+Y',
  zoomIn: 'Ctrl+=',
  zoomOut: 'Ctrl+-',
  zoomToFit: 'Ctrl+0',
  createEntity: 'Ctrl+Shift+N',
  clearSelection: 'Escape'
} as const