'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '@prisma/client'
import {
  ArrowLeft, PanelLeft, Undo2, Redo2, MoreHorizontal, Pencil, Trash2, AlertTriangle, Maximize2, Download,
} from 'lucide-react'
import { LayerSwitcher } from './LayerSwitcher'
import { useHistoryStore } from '@/stores/historyStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useEntityStore } from '@/stores/entityStore'
import { useUIStore } from '@/stores/uiStore'
import { api } from '@/lib/client/api'

interface ProjectHeaderProps {
  project: Project
  onProjectChange: (project: Project) => void
  onDeleteRequest: () => void
  onExport: () => void
}

const iconBtn = 'inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent'

export function ProjectHeader({ project, onProjectChange, onDeleteRequest, onExport }: ProjectHeaderProps) {
  const router = useRouter()
  const { past, future, busy, undo, redo } = useHistoryStore()
  const zoom = useCanvasStore(s => s.viewport.zoom)
  const viewActions = useCanvasStore(s => s.viewActions)
  const clearSelection = useCanvasStore(s => s.clearSelection)
  const flaggedCount = useEntityStore(s => s.reconciliationStates.size)
  const toggleOutline = useUIStore(s => s.toggleOutline)
  const openInspector = useUIStore(s => s.openInspector)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  // ---- inline rename ----
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(project.name)
  const nameInput = useRef<HTMLInputElement>(null)
  useEffect(() => { if (renaming) { nameInput.current?.focus(); nameInput.current?.select() } }, [renaming])

  const commitRename = async () => {
    const name = draftName.trim()
    setRenaming(false)
    if (!name || name === project.name) { setDraftName(project.name); return }
    try {
      const updated = await api.updateProject(project.id, { name })
      onProjectChange({ ...project, ...updated })
    } catch (error) {
      console.error('Failed to rename project:', error)
      setDraftName(project.name)
    }
  }

  const openReview = () => {
    clearSelection()
    openInspector({ pinned: true })
  }

  return (
    <header className="bg-white border-b border-gray-200 flex flex-wrap items-center gap-x-2 gap-y-1 px-2 lg:px-3 py-1.5 z-30">
      {/* Left cluster */}
      <div className="flex items-center gap-1 min-w-0 flex-1 lg:flex-none">
        <button onClick={toggleOutline} className={iconBtn} title="Toggle outline" aria-label="Toggle outline">
          <PanelLeft className="h-5 w-5" />
        </button>
        <button onClick={() => router.push('/')} className={iconBtn} title="Back to projects" aria-label="Back to projects">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {renaming ? (
          <input
            ref={nameInput}
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setDraftName(project.name); setRenaming(false) }
            }}
            className="h-9 px-2 text-base font-semibold text-gray-900 border border-blue-400 rounded-md outline-none min-w-0 w-48 lg:w-64"
          />
        ) : (
          <button
            onClick={() => setRenaming(true)}
            className="group h-9 px-2 rounded-md hover:bg-gray-100 text-base font-semibold text-gray-900 truncate min-w-0 max-w-[40vw] lg:max-w-xs text-left inline-flex items-center gap-2"
            title="Rename project"
          >
            <span className="truncate">{project.name}</span>
            <Pencil className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 shrink-0" />
          </button>
        )}
      </div>

      {/* Layer switcher: own row on mobile, centred on desktop */}
      <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1 flex justify-start lg:justify-center min-w-0">
        <LayerSwitcher />
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1">
        <button onClick={() => undo()} disabled={busy || past.length === 0} className={iconBtn}
          title={past.length ? `Undo ${past[past.length - 1].label.toLowerCase()} (Ctrl+Z)` : 'Nothing to undo'} aria-label="Undo">
          <Undo2 className="h-5 w-5" />
        </button>
        <button onClick={() => redo()} disabled={busy || future.length === 0} className={iconBtn}
          title={future.length ? `Redo ${future[0].label.toLowerCase()} (Ctrl+Y)` : 'Nothing to redo'} aria-label="Redo">
          <Redo2 className="h-5 w-5" />
        </button>

        <button
          onClick={() => viewActions.zoomToFit?.()}
          className="hidden lg:inline-flex items-center gap-1 h-9 px-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 tabular-nums"
          title="Zoom to fit (Ctrl+0)"
        >
          <Maximize2 className="h-4 w-4" />
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={openReview}
          className={`inline-flex items-center gap-1.5 h-9 px-2 rounded-md text-sm font-medium ${
            flaggedCount > 0 ? 'text-amber-800 bg-amber-50 hover:bg-amber-100' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Review queue"
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Review</span>
          {flaggedCount > 0 && (
            <span className="text-xs bg-amber-500 text-white px-1.5 rounded-full">{flaggedCount}</span>
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(o => !o)} className={iconBtn} title="More" aria-label="More actions" aria-expanded={menuOpen}>
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <MenuItem icon={Pencil} label="Rename project" onClick={() => { setMenuOpen(false); setRenaming(true) }} />
              <MenuItem icon={Download} label="Export as JSON" onClick={() => { setMenuOpen(false); onExport() }} />
              <div className="my-1 border-t border-gray-100" />
              <MenuItem icon={Trash2} label="Delete project" danger onClick={() => { setMenuOpen(false); onDeleteRequest() }} />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${danger ? 'text-red-600' : 'text-gray-700'}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
