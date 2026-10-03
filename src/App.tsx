import { useEffect } from 'react'
import { ConsolePanel } from './components/ConsolePanel.tsx'
import { Diagram } from './components/Diagram.tsx'
import { Editor } from './components/Editor.tsx'
import { Toolbar } from './components/Toolbar.tsx'
import { useVisualizer } from './store.ts'

export default function App() {
  const status = useVisualizer((state) => state.status)
  const speed = useVisualizer((state) => state.speed)
  const tick = useVisualizer((state) => state.tick)

  useEffect(() => {
    if (status !== 'playing') return
    const id = window.setInterval(tick, speed)
    return () => window.clearInterval(id)
  }, [status, speed, tick])

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
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-4 pt-5 pb-4 xl:grid-cols-[minmax(420px,0.92fr)_minmax(0,1.08fr)]">
        <section className="grid min-h-0 grid-rows-[minmax(280px,1.15fr)_minmax(180px,0.85fr)] gap-4">
          <Editor />
          <ConsolePanel />
        </section>
        <Diagram />
      </main>
    </div>
  )
}
