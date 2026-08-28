import { create } from 'zustand'

/**
 * Layout chrome state for the project workspace. Panels are the same
 * components on every screen size; only how they are presented differs
 * (column vs. drawer/sheet), which is decided in the layout with CSS.
 */
interface UIState {
  /** Left outline panel (desktop column / mobile drawer) */
  outlineOpen: boolean
  /**
   * Right inspector. On desktop it is shown whenever there is a selection or
   * `inspectorPinned` is set (e.g. from the Review badge). On mobile it is a
   * sheet that opens explicitly.
   */
  inspectorOpen: boolean
  /** Keep the inspector visible with no selection (shows the review queue) */
  inspectorPinned: boolean

  setOutlineOpen: (open: boolean) => void
  toggleOutline: () => void
  openInspector: (opts?: { pinned?: boolean }) => void
  closeInspector: () => void
}

export const useUIStore = create<UIState>((set) => ({
  outlineOpen: true,
  inspectorOpen: false,
  inspectorPinned: false,

  setOutlineOpen: (outlineOpen) => set({ outlineOpen }),
  toggleOutline: () => set(s => ({ outlineOpen: !s.outlineOpen })),
  openInspector: (opts) => set({ inspectorOpen: true, inspectorPinned: opts?.pinned ?? false }),
  closeInspector: () => set({ inspectorOpen: false, inspectorPinned: false }),
}))
