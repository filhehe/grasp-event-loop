import { useEffect, useRef } from 'react'
import type { ConsoleCard } from '../engine/simulate.ts'
import { useVisualizer } from '../store.ts'

const EMPTY: ConsoleCard[] = []

export function ConsolePanel() {
  const entries = useVisualizer((state) => (state.index >= 0 ? state.steps[state.index].console : EMPTY))
  const error = useVisualizer((state) => (state.index >= 0 ? null : state.error))
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [entries, error])

  return (
    <section className="panel flex min-h-44 flex-col" aria-label="Консоль">
      <h2 className="pt-3 text-center text-[11px] tracking-[0.16em] text-[#8b93a7]">console</h2>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-5 pt-2 pb-4">
        {error ? <p className="font-mono text-sm leading-6 text-[#fb7185]">{error}</p> : null}
        {entries.map((entry) => (
          <p
            key={entry.id}
            className={`console-line ${entry.kind === 'log' ? 'text-[#c084fc]' : entry.kind === 'error' ? 'text-[#fb7185]' : 'text-[#94a3b8]'} ${entry.text.length > 18 ? 'text-sm leading-6' : 'text-[22px] leading-8'}`}
          >
            {entry.text}
          </p>
        ))}
      </div>
    </section>
  )
}
