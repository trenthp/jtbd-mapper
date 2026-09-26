'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { OutlinePanel } from './OutlinePanel'
import { InspectorPanel } from './InspectorPanel'

interface WorkspaceLayoutProps {
  header: React.ReactNode
  canvas: React.ReactNode
  onNavigateToEntity: (entityId: string) => void
}

/**
 * Header on top; outline | canvas | inspector below. On desktop the panels
 * are columns; on mobile the outline is a drawer and the inspector a bottom
 * sheet. Same panel components either way.
 */
export function WorkspaceLayout({ header, canvas, onNavigateToEntity }: WorkspaceLayoutProps) {
  const isMobile = useIsMobile()
  const outlineOpen = useUIStore(s => s.outlineOpen)
  const setOutlineOpen = useUIStore(s => s.setOutlineOpen)
  const inspectorOpen = useUIStore(s => s.inspectorOpen)
  const inspectorPinned = useUIStore(s => s.inspectorPinned)
  const openInspector = useUIStore(s => s.openInspector)
  const closeInspector = useUIStore(s => s.closeInspector)
  const selection = useCanvasStore(s => s.selectionState)
  const clearSelection = useCanvasStore(s => s.clearSelection)

  const selectionCount = selection.selectedEntities.size + selection.selectedConnections.size

  // Start with the outline closed on small screens
  useEffect(() => { if (isMobile) setOutlineOpen(false) }, [isMobile, setOutlineOpen])

  // Desktop: the inspector follows the selection; mobile: opened by double-tap
  const showInspector = isMobile ? inspectorOpen : selectionCount > 0 || inspectorPinned

  const handleCloseInspector = () => {
    closeInspector()
    if (!isMobile) clearSelection()
  }

  const navigate = (id: string) => {
    onNavigateToEntity(id)
    if (isMobile) { setOutlineOpen(false); openInspector() }
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {header}

      <div className="flex-1 flex min-h-0 relative">
        {/* Outline: column on desktop, drawer on mobile */}
        {outlineOpen && !isMobile && (
          <aside className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <OutlinePanel onNavigateToEntity={navigate} />
          </aside>
        )}
        {outlineOpen && isMobile && (
          <div className="fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/30" onClick={() => setOutlineOpen(false)} />
            <aside className="relative w-[85vw] max-w-sm bg-white shadow-xl flex flex-col">
              <OutlinePanel onNavigateToEntity={navigate} onClose={() => setOutlineOpen(false)} />
            </aside>
          </div>
        )}

        {/* Canvas */}
        <main className="flex-1 relative min-w-0">
          {canvas}
        </main>

        {/* Inspector: column on desktop, bottom sheet on mobile */}
        {showInspector && !isMobile && (
          <aside className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col">
            <InspectorPanel onNavigateToEntity={navigate} onClose={handleCloseInspector} />
          </aside>
        )}
        {showInspector && isMobile && (
          <div className="fixed inset-0 z-40 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={handleCloseInspector} />
            <div className="relative bg-white rounded-t-2xl shadow-2xl h-[60dvh] flex flex-col safe-bottom">
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300" />
              <InspectorPanel onNavigateToEntity={navigate} onClose={handleCloseInspector} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
