import { create } from 'zustand'
import { EXAMPLES } from './examples.ts'
import { simulate, SyntaxFailure, type Step } from './engine/simulate.ts'
import { readCompleted, rememberExample } from './progress.ts'

export type Status = 'idle' | 'playing' | 'paused' | 'done'

export type HoverMark = {
  id: string
  line: number
  start?: number
  end?: number
}

type VisualizerState = {
  code: string
  steps: Step[]
  index: number
  status: Status
  speed: number
  error: string | null
  errorLine: number | null
  hover: HoverMark | null
  hold: boolean
  loopTurn: number
  completed: string[]
  setCode: (code: string) => void
  setSpeed: (speed: number) => void
  setHover: (hover: HoverMark | null) => void
  setHold: (hold: boolean) => void
  spinLoop: () => void
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
  hover: null,
  hold: false,
}

function exampleFromLocation() {
  if (typeof location === 'undefined') return undefined
  const id = new URLSearchParams(location.search).get('example')
  return EXAMPLES.find((example) => example.id === id)
}

function syncExampleUrl(code: string) {
  if (typeof history === 'undefined' || typeof location === 'undefined') return
  const example = EXAMPLES.find((item) => item.code === code)
  const url = new URL(location.href)
  if (example) url.searchParams.set('example', example.id)
  else url.searchParams.delete('example')
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${location.pathname}${location.search}${location.hash}`
  if (next !== current) history.replaceState(null, '', next)
}

function finish(code: string, completed: string[]) {
  const example = EXAMPLES.find((item) => item.code === code)
  if (!example) return { status: 'done' as const }
  return { status: 'done' as const, completed: rememberExample(example.id, completed) }
}

const opening = exampleFromLocation() ?? EXAMPLES.find((example) => example.id === 'classic') ?? EXAMPLES[0]
syncExampleUrl(opening.code)

export const useVisualizer = create<VisualizerState>((set, get) => ({
  code: opening.code,
  speed: 700,
  loopTurn: 0,
  completed: readCompleted(),
  ...cleared,

  setCode: (code) => {
    syncExampleUrl(code)
    set({ code, ...cleared })
  },
  setSpeed: (speed) => set({ speed }),
  setHover: (hover) => set({ hover }),
  setHold: (hold) => set((state) => (state.hold === hold ? state : { hold })),
  spinLoop: () => set((state) => ({ loopTurn: state.loopTurn + 1 })),

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
        ...(compiled.steps.length <= 1 ? finish(state.code, state.completed) : { status: 'playing' as const }),
      })
      return
    }

    if (state.status === 'done' || state.index >= state.steps.length - 1) {
      set({
        index: 0,
        ...(state.steps.length <= 1 ? finish(state.code, state.completed) : { status: 'playing' as const }),
      })
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
        ...(compiled.steps.length <= 1 ? finish(state.code, state.completed) : { status: 'paused' as const }),
      })
      return
    }

    const next = state.index + 1
    if (next >= state.steps.length) {
      set(finish(state.code, state.completed))
      return
    }
    const finished = next >= state.steps.length - 1
    set({
      index: next,
      ...(finished ? finish(state.code, state.completed) : { status: 'paused' as const }),
    })
  },

  reset: () => set({ ...cleared }),

  tick: () => {
    const { status, index, steps, hold } = get()
    if (status !== 'playing' || hold) return
    const next = index + 1
    if (next >= steps.length) {
      set(finish(get().code, get().completed))
      return
    }
    const finished = next >= steps.length - 1
    set({
      index: next,
      ...(finished ? finish(get().code, get().completed) : { status: 'playing' as const }),
    })
  },
}))
