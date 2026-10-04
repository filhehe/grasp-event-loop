import { useEffect, useRef } from 'react'
import type { ConsoleCard } from '../engine/simulate.ts'
import { BlockHelp } from './BlockHelp.tsx'
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
    <section className="panel flex h-full min-h-0 flex-col" aria-label="Консоль">
      <h2 className="zone-label">
        console
        <BlockHelp
          label="console"
          text="Вывод программы: console.log, предупреждения и ошибки. По нему видно, в каком порядке код реально выполнился."
          href="https://developer.mozilla.org/en-US/docs/Web/API/console"
        />
      </h2>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-5 pt-[22px] pb-4">
        {error ? <p className="console-line text-[#fb7185]">{error}</p> : null}
        {entries.map((entry) => (
          <p
            key={entry.id}
            className={`console-line ${entry.kind === 'log' ? 'text-[#c084fc]' : entry.kind === 'error' ? 'text-[#fb7185]' : 'text-[#94a3b8]'}`}
          >
            {entry.text}
          </p>
        ))}
      </div>
    </section>
  )
}
