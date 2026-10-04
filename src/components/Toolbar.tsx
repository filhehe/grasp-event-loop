import { track } from '@vercel/analytics/react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { EXAMPLE_NOTES, LEVELS, type LevelFilter } from '../exampleNotes.ts'
import { EXAMPLES } from '../examples.ts'
import { useVisualizer } from '../store.ts'
import { Select } from './Select.tsx'
import { useLoopTurn } from './useLoopTurn.ts'

const LOGO_FROM = '#5eead4'
const LOGO_TO = '#7dd3fc'

function randomHue() {
  return Math.floor(Math.random() * 360)
}

function Logo({ turn, duration }: { turn: number; duration: number }) {
  const rawId = useId().replace(/:/g, '')
  const spinRef = useRef<HTMLSpanElement>(null)
  const [hover, setHover] = useState(0)
  const [from, setFrom] = useState(LOGO_FROM)
  const [to, setTo] = useState(LOGO_TO)

  function onEnter() {
    const hue = randomHue()
    setFrom(`hsl(${hue} 82% 64%)`)
    setTo(`hsl(${(hue + 36) % 360} 88% 72%)`)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setHover((value) => value + 1)
  }

  useLayoutEffect(() => {
    const node = spinRef.current
    if (!node || hover === 0) return
    node.style.animationName = 'none'
    void node.offsetWidth
    node.style.removeProperty('animation-name')
  }, [hover])

  return (
    <span className="logo" onMouseEnter={onEnter}>
      <span ref={spinRef} className={hover > 0 ? 'logo-spin' : undefined}>
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
        <path
          fill={`url(#${rawId})`}
          d="M7.68 17.41A17.6 17.6 0 0 1 39.24 15.2l2.69-1.55-1.16 10.6-9.76-4.3 2.69-1.55A11.2 11.2 0 0 0 13.62 19.8Z"
        />
        <path
          fill={`url(#${rawId})`}
          d="M7.68 17.41A17.6 17.6 0 0 1 39.24 15.2l2.69-1.55-1.16 10.6-9.76-4.3 2.69-1.55A11.2 11.2 0 0 0 13.62 19.8Z"
          transform="rotate(180 24 24)"
        />
        <defs>
          <linearGradient id={rawId} gradientUnits="userSpaceOnUse" x1="8" y1="40" x2="40" y2="8">
            <stop stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
      </svg>
      </span>
      <h1>Grasp Event Loop</h1>
    </span>
  )
}

export function Toolbar() {
  const [help, setHelp] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)
  const [level, setLevel] = useState<LevelFilter>('all')
  const code = useVisualizer((state) => state.code)
  const setCode = useVisualizer((state) => state.setCode)
  const status = useVisualizer((state) => state.status)
  const speed = useVisualizer((state) => state.speed)
  const setSpeed = useVisualizer((state) => state.setSpeed)
  const togglePlay = useVisualizer((state) => state.togglePlay)
  const step = useVisualizer((state) => state.step)
  const reset = useVisualizer((state) => state.reset)
  const playing = status === 'playing'
  const runLabel = playing ? 'Пауза' : status === 'paused' ? 'Продолжить' : 'Запуск'
  const { turn, duration } = useLoopTurn()
  const matched = EXAMPLES.find((example) => example.code === code)?.id ?? 'custom'
  const visible = EXAMPLES.filter((example) => example.id === matched || level === 'all' || EXAMPLE_NOTES[example.id]?.level === level)

  useEffect(() => {
    if (!menu) return
    function onPointer(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (menuRef.current?.contains(target) || burgerRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('.ui-select, .ui-select-menu')) return
      setMenu(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  return (
    <header className="app-header relative z-20 shrink-0 border-b border-white/6 px-4 py-2.5">
      <div className="header-bar">
        <div className="header-brand">
          <Logo turn={turn} duration={duration} />
          <button
            type="button"
            className="header-help"
            aria-expanded={help}
            aria-label="Что поддерживается"
            onClick={() => {
              setMenu(false)
              setHelp((open) => !open)
            }}
          >
            ?
          </button>
        </div>

        <a
          className="toolbar-btn header-thanks"
          href="https://pay.cloudtips.ru/p/02f62c5c"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('Say thanks')}
        >
          Сказать спасибо
        </a>

        <button
          ref={burgerRef}
          type="button"
          className={`header-burger ${menu ? 'is-open' : ''}`}
          aria-expanded={menu}
          aria-controls="header-menu"
          aria-label="Пример, уровень и интервал"
          onClick={() => {
            setHelp(false)
            setMenu((open) => !open)
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {menu ? (
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <div className="header-controls">
          <div ref={menuRef} id="header-menu" className={`header-menu ${menu ? 'is-open' : ''}`}>
          <label className="header-field header-field-level">
            Уровень
            <Select
              className="ui-select-level"
              ariaLabel="Уровень"
              value={level}
              options={LEVELS.map((item) => ({ value: item.id, label: item.label }))}
              onChange={(next) => setLevel(next as LevelFilter)}
            />
          </label>

          <label className="header-field header-field-example">
            Пример
            <Select
              className="ui-select-example"
              ariaLabel="Пример"
              value={matched}
              options={[
                ...(matched === 'custom' ? [{ value: 'custom', label: 'Свой код' }] : []),
                ...visible.map((example) => ({ value: example.id, label: example.title })),
              ]}
              onChange={(next) => {
                const example = EXAMPLES.find((item) => item.id === next)
                if (example) setCode(example.code)
              }}
            />
          </label>

          <label className="header-field header-field-speed">
            Интервал
            <span className="header-speed-control">
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
            </span>
          </label>
          </div>

          <div className="header-actions">
            <button type="button" className="toolbar-btn" onClick={reset}>
              Сброс
            </button>
            <button type="button" className="toolbar-btn" onClick={step} title="Следующий тик (Ctrl/⌘ + →)">
              Шаг
            </button>
            <button type="button" className="toolbar-btn toolbar-btn-run" onClick={togglePlay} title={`${runLabel} (Ctrl/⌘ + Enter)`}>
              {runLabel}
            </button>
          </div>
        </div>
      </div>

      {help ? (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Закрыть справку" onClick={() => setHelp(false)} />
          <div className="absolute top-full left-4 z-20 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#141820] p-4 text-sm leading-6 text-[#c5d0e0] shadow-2xl">
            <p className="mb-2 font-medium text-white">Как устроен прогон</p>
            <p>Синхронный код живёт в Call Stack. Таймеры ждут в Web API, промисы и queueMicrotask — в Microtask Queue. Когда стек пустеет, event loop сначала разбирает все микрозадачи и только потом берёт одну макротаску.</p>
            <p className="mt-3 font-medium text-white">Что можно писать</p>
            <p>console.log, setTimeout, setInterval, Promise, then/catch/finally, Promise.all, Promise.race, Promise.allSettled, async/await, queueMicrotask, функции, if, for, while, try/catch. Задержка таймера — виртуальное время, а не настоящие миллисекунды.</p>
          </div>
        </>
      ) : null}
    </header>
  )
}
