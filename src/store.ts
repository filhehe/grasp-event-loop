import { create } from 'zustand'
import { EXAMPLES } from './examples.ts'
import { simulate, SyntaxFailure, type Step } from './engine/simulate.ts'

export type Status = 'idle' | 'playing' | 'paused' | 'done'

type VisualizerState = {
  code: string
  steps: Step[]
  index: number
  status: Status
  speed: number
  error: string | null
  errorLine: number | null
  setCode: (code: string) => void
  setSpeed: (speed: number) => void
  play: () => void
  pause: () => void
  togglePlay: () => void
  step: () => void
  reset: () => void
  tick: () => void
}

function compile(code: string) {
  try {
    return { steps: simulate(code), error: null, errorLine: null }
  } catch (error) {
    if (error instanceof SyntaxFailure) {
      return { steps: [] as Step[], error: error.message, errorLine: error.line }
    }
    const message = error instanceof Error ? error.message : String(error)
    return { steps: [] as Step[], error: message, errorLine: null }
  }
}

const cleared = {
  steps: [] as Step[],
  index: -1,
  status: 'idle' as const,
  error: null,
  errorLine: null,
}

export const useVisualizer = create<VisualizerState>((set, get) => ({
  code: EXAMPLES[0].code,
  speed: 700,
  ...cleared,

  setCode: (code) => set({ code, ...cleared }),
  setSpeed: (speed) => set({ speed }),

  play: () => {
    const state = get()
    if (state.status === 'playing') return

    if (!state.steps.length || state.status === 'idle') {
      const compiled = compile(state.code)
      if (compiled.error) {
        set({ ...cleared, error: compiled.error, errorLine: compiled.errorLine })
        return
      }
      set({
        steps: compiled.steps,
        error: null,
        errorLine: null,
        index: 0,
        status: compiled.steps.length <= 1 ? 'done' : 'playing',
      })
      return
    }

    if (state.status === 'done' || state.index >= state.steps.length - 1) {
      set({ index: 0, status: state.steps.length <= 1 ? 'done' : 'playing' })
      return
    }

    set({ status: 'playing', index: state.index < 0 ? 0 : state.index })
  },

  pause: () => {
    if (get().status === 'playing') set({ status: 'paused' })
  },

  togglePlay: () => {
    if (get().status === 'playing') get().pause()
    else get().play()
  },

  step: () => {
    const state = get()
    if (!state.steps.length || state.status === 'idle') {
      const compiled = compile(state.code)
      if (compiled.error) {
        set({ ...cleared, error: compiled.error, errorLine: compiled.errorLine })
        return
      }
      set({
        steps: compiled.steps,
        error: null,
        errorLine: null,
        index: 0,
        status: compiled.steps.length <= 1 ? 'done' : 'paused',
      })
      return
    }

    const next = state.index + 1
    if (next >= state.steps.length) {
      set({ status: 'done' })
      return
    }
    set({ index: next, status: next >= state.steps.length - 1 ? 'done' : 'paused' })
  },

  reset: () => set({ ...cleared }),

  tick: () => {
    const { status, index, steps } = get()
    if (status !== 'playing') return
    const next = index + 1
    if (next >= steps.length) {
      set({ status: 'done' })
      return
    }
    set({ index: next, status: next >= steps.length - 1 ? 'done' : 'playing' })
  },
}))
