import { useEffect, useRef } from 'react'
import { ConsolePanel } from './components/ConsolePanel.tsx'
import { Diagram } from './components/Diagram.tsx'
import { Editor } from './components/Editor.tsx'
import { StepBanner } from './components/StepBanner.tsx'
import { Toolbar } from './components/Toolbar.tsx'
import { useVisualizer } from './store.ts'

export default function App() {
  const status = useVisualizer((state) => state.status)
  const speed = useVisualizer((state) => state.speed)
  const tick = useVisualizer((state) => state.tick)
  const hold = useVisualizer((state) => state.hold)
  const stackHost = useRef<HTMLDivElement>(null)
  const loopHost = useRef<HTMLDivElement>(null)
  const held = useRef(false)

  useEffect(() => {
    if (status !== 'playing' || hold) return
    const id = window.setInterval(tick, speed)
    return () => window.clearInterval(id)
  }, [status, speed, tick, hold])

  useEffect(() => {
    const released = held.current && !hold
    held.current = hold
    if (released && status === 'playing') tick()
  }, [hold, status, tick])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey
      if (!meta) return
      if (event.key === 'Enter') {
        event.preventDefault()
        useVisualizer.getState().togglePlay()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        useVisualizer.getState().step()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app-shell">
      <Toolbar />
      <StepBanner />
      <main className="app-main grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 px-4 pt-4 pb-4 xl:grid-cols-[minmax(420px,0.92fr)_minmax(0,1.08fr)]">
        <section className="code-column grid min-h-0 min-w-0 gap-4">
          <Editor />
          <div className="stack-row">
            <div ref={stackHost} className="stack-slot min-h-0 min-w-0" />
            <div ref={loopHost} className="loop-slot" />
          </div>
          <ConsolePanel />
        </section>
        <Diagram stackHost={stackHost} loopHost={loopHost} />
      </main>
    </div>
  )
}
