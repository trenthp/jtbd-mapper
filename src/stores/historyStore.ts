import { create } from 'zustand'

/**
 * A reversible operation. `undo` and `redo` must both update the client
 * stores and persist to the server; they may reject, in which case the
 * history is left as-is so the user can retry.
 */
export interface Command {
  label: string
  undo: () => Promise<void>
  redo: () => Promise<void>
}

interface HistoryState {
  past: Command[]
  future: Command[]
  busy: boolean
  push: (command: Command) => void
  undo: () => Promise<void>
  redo: () => Promise<void>
  clear: () => void
}

const MAX_HISTORY = 100

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  busy: false,

  push: (command) =>
    set((s) => ({ past: [...s.past, command].slice(-MAX_HISTORY), future: [] })),

  undo: async () => {
    const { past, busy } = get()
    if (busy || past.length === 0) return
    const command = past[past.length - 1]
    set({ busy: true })
    try {
      await command.undo()
      set((s) => ({ past: s.past.slice(0, -1), future: [command, ...s.future] }))
    } catch (error) {
      console.error(`Undo failed (${command.label}):`, error)
    } finally {
      set({ busy: false })
    }
  },

  redo: async () => {
    const { future, busy } = get()
    if (busy || future.length === 0) return
    const command = future[0]
    set({ busy: true })
    try {
      await command.redo()
      set((s) => ({ future: s.future.slice(1), past: [...s.past, command] }))
    } catch (error) {
      console.error(`Redo failed (${command.label}):`, error)
    } finally {
      set({ busy: false })
    }
  },

  clear: () => set({ past: [], future: [] }),
}))
