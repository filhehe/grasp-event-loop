import { useId, useState } from 'react'
import { EXAMPLES } from '../examples.ts'
import { useVisualizer } from '../store.ts'
import { useLoopTurn } from './useLoopTurn.ts'

function LoopMark({ turn, duration }: { turn: number; duration: number }) {
  const rawId = useId().replace(/:/g, '')
  return (
    <svg
      key={turn}
      className={turn > 0 ? 'loop-turn' : undefined}
      style={turn > 0 ? { animationDuration: `${duration}ms` } : undefined}
      width="22"
      height="22"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path d="M24 8a16 16 0 0 1 13.8 7.8" stroke={`url(#${rawId})`} strokeWidth="4" strokeLinecap="round" />
      <path d="M38 11.2v8.2h-8" stroke="#67e8f9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 40a16 16 0 0 1-13.8-7.8" stroke={`url(#${rawId})`} strokeWidth="4" strokeLinecap="round" />
      <path d="M10 36.8v-8.2h8" stroke="#5eead4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id={rawId} x1="10" y1="8" x2="38" y2="40">
          <stop stopColor="#5eead4" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function Toolbar() {
  const [help, setHelp] = useState(false)
  const code = useVisualizer((state) => state.code)
  const setCode = useVisualizer((state) => state.setCode)
  const status = useVisualizer((state) => state.status)
  const speed = useVisualizer((state) => state.speed)
  const setSpeed = useVisualizer((state) => state.setSpeed)
  const index = useVisualizer((state) => state.index)
  const total = useVisualizer((state) => state.steps.length)
  const message = useVisualizer((state) =>
    state.error ?? (state.index >= 0 ? state.steps[state.index].message : 'Отредактируйте код, затем запустите его или идите по шагам'),
  )
  const time = useVisualizer((state) => (state.index >= 0 ? state.steps[state.index].time : 0))
  const togglePlay = useVisualizer((state) => state.togglePlay)
  const step = useVisualizer((state) => state.step)
  const reset = useVisualizer((state) => state.reset)
  const playing = status === 'playing'
  const { turn, duration } = useLoopTurn()
  const matched = EXAMPLES.find((example) => example.code === code)?.id ?? 'custom'
  const progress = total > 0 && index >= 0 ? `${index + 1} / ${total}` : `0 / ${total || 0}`

  return (
    <header className="relative z-20 shrink-0 border-b border-white/6 px-4 py-2.5">
      <div className="header-bar">
        <div className="header-brand">
          <LoopMark turn={turn} duration={duration} />
          <h1>Event Loop</h1>
          <button
            type="button"
            className="header-help"
            aria-expanded={help}
            aria-label="Что поддерживается"
            onClick={() => setHelp((open) => !open)}
          >
            ?
          </button>
        </div>

        <div className="header-note" aria-live="polite">
          <p className="header-note-text" title={message}>
            {message}
          </p>
          <p className="header-note-meta">
            {progress}
            <span aria-hidden="true"> · </span>
            t = {time} мс
          </p>
        </div>

        <div className="header-controls">
          <label className="header-field">
            Пример
            <select
              aria-label="Пример"
              value={matched}
              onChange={(event) => {
                const example = EXAMPLES.find((item) => item.id === event.target.value)
                if (example) setCode(example.code)
              }}
            >
              {matched === 'custom' ? <option value="custom">Свой код</option> : null}
              {EXAMPLES.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.title}
                </option>
              ))}
            </select>
          </label>

          <label className="header-field">
            Интервал
            <input
              type="range"
              min={200}
              max={1400}
              step={50}
              value={speed}
              aria-label="Интервал между тиками"
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
            <span className="header-speed">{speed} мс</span>
          </label>

          <div className="header-actions">
            <button type="button" className="toolbar-btn" onClick={reset}>
              Сброс
            </button>
            <button type="button" className="toolbar-btn" onClick={step} title="Следующий тик (Ctrl/⌘ + →)">
              Шаг
            </button>
            <button type="button" className="toolbar-btn toolbar-btn-run" onClick={togglePlay} title="Запуск или пауза (Ctrl/⌘ + Enter)">
              {playing ? 'Пауза' : 'Запуск'}
            </button>
          </div>
        </div>
      </div>

      {help ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Закрыть справку" onClick={() => setHelp(false)} />
          <div className="absolute top-full left-4 z-20 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#141820] p-4 text-sm leading-6 text-[#c5d0e0] shadow-2xl">
            <p className="mb-2 font-medium text-white">Как устроен прогон</p>
            <p>Синхронный код живёт в Call Stack. Таймеры ждут в Web API, промисы и queueMicrotask — в Microtask Queue. Когда стек пустеет, event loop сначала досушивает все микротаски, и только потом берёт одну макротаску.</p>
            <p className="mt-3 font-medium text-white">Что можно писать</p>
            <p>console.log, setTimeout, setInterval, Promise, then/catch/finally, async/await, queueMicrotask, функции, if, for, while, try/catch. Задержка таймера — виртуальное время, а не настоящие миллисекунды.</p>
          </div>
        </>
      ) : null}
    </header>
  )
}
