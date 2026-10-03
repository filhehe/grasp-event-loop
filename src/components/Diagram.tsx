import { useCallback, useId, useLayoutEffect, useRef, useState, type AnimationEvent, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { CardSpot, CardZone, Flight } from '../flights.ts'
import { planFlights } from '../flights.ts'
import type { FrameCard, Zone } from '../engine/simulate.ts'
import { useVisualizer } from '../store.ts'
import { flightDuration, useLoopTurn } from './useLoopTurn.ts'

const EMPTY: FrameCard[] = []
const EMPTY_STILL: Set<string> = new Set()

function LoopGlyph({ turn, duration }: { turn: number; duration: number }) {
  const rawId = useId().replace(/:/g, '')
  return (
    <svg
      key={turn}
      className={turn > 0 ? 'loop-turn' : undefined}
      style={turn > 0 ? { animationDuration: `${duration}ms` } : undefined}
      width="54"
      height="54"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path d="M24 7.5a16.5 16.5 0 0 1 14.4 8.3" stroke={`url(#${rawId})`} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M38.6 10.4 39.4 17.6 32.4 16.2" stroke="#67e8f9" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 40.5a16.5 16.5 0 0 1-14.4-8.3" stroke={`url(#${rawId})`} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M9.4 37.6 8.6 30.4 15.6 31.8" stroke="#5eead4" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id={rawId} x1="9" y1="8" x2="39" y2="40">
          <stop stopColor="#5eead4" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TaskCard({ item, hot, zone, hidden, still }: { item: FrameCard; hot: boolean; zone: CardZone; hidden: boolean; still: boolean }) {
  return (
    <div
      className={`task-card ${hot ? 'task-card-hot' : ''} ${still ? 'task-card-still' : ''}`}
      data-card-id={item.id}
      data-card-zone={zone}
      data-card-label={item.label}
      data-card-meta={item.meta ?? ''}
      data-card-hot={hot ? '1' : '0'}
      style={hidden ? { opacity: 0 } : undefined}
      title={item.label}
    >
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[#e8edf7]">{item.label}</span>
      {item.meta ? <span className="shrink-0 font-mono text-[11px] text-[#93a0b8]">{item.meta}</span> : null}
    </div>
  )
}

function ZoneFrame({
  title,
  tone,
  active,
  pinBottom,
  className,
  children,
}: {
  title: string
  tone: 'stack' | 'web' | 'macro' | 'micro' | 'loop'
  active: boolean
  pinBottom?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`zone zone-${tone} ${active ? 'zone-active' : ''} ${className ?? ''}`} aria-label={title}>
      <h2 className="zone-label">{title}</h2>
      <div className={`zone-body ${pinBottom ? 'flex flex-col' : ''}`}>{children}</div>
    </section>
  )
}

function Cards({
  items,
  active,
  pinBottom,
  zone,
  hidden,
  still,
}: {
  items: FrameCard[]
  active: boolean
  pinBottom?: boolean
  zone: CardZone
  hidden: Set<string>
  still: Set<string>
}) {
  if (!items.length) return null
  return (
    <div className={`flex flex-col gap-2 ${pinBottom ? 'mt-auto' : ''}`}>
      {items.map((item, index) => (
        <TaskCard
          key={item.id}
          item={item}
          zone={zone}
          hidden={hidden.has(item.id)}
          still={still.has(item.id)}
          hot={active && index === 0}
        />
      ))}
    </div>
  )
}

function FlightCard({ flight, duration, onDone }: { flight: Flight; duration: number; onDone: (id: string) => void }) {
  const dx = flight.from.left + flight.from.width / 2 - (flight.to.left + flight.to.width / 2)
  const dy = flight.from.top + flight.from.height / 2 - (flight.to.top + flight.to.height / 2)
  const done = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  function finish(event?: AnimationEvent<HTMLDivElement>) {
    if (event && event.animationName !== 'flight-move') return
    if (done.current) return
    done.current = true
    const target = document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(flight.hideId)}"]`)
    if (target) target.style.opacity = '1'
    requestAnimationFrame(() => onDoneRef.current(flight.id))
  }

  useLayoutEffect(() => {
    const timer = window.setTimeout(() => finish(), duration + 60)
    return () => window.clearTimeout(timer)
  }, [duration])

  const style = {
    left: flight.to.left,
    top: flight.to.top,
    width: flight.to.width,
    height: flight.to.height,
    '--flight-x': `${dx}px`,
    '--flight-y': `${dy}px`,
    '--flight-ms': `${duration}ms`,
  } as CSSProperties

  return (
    <div
      className={`task-card flight-card ${flight.hot ? 'task-card-hot' : ''}`}
      style={style}
      onAnimationEnd={finish}
      aria-hidden="true"
    >
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[#e8edf7]">{flight.label}</span>
      {flight.meta ? <span className="shrink-0 font-mono text-[11px] text-[#93a0b8]">{flight.meta}</span> : null}
    </div>
  )
}

function layoutRect(node: HTMLElement) {
  const rect = node.getBoundingClientRect()
  const transform = getComputedStyle(node).transform
  if (!transform || transform === 'none') return rect
  const matrix = transform.match(/matrix\(([^)]+)\)/)
  if (!matrix) return rect
  const parts = matrix[1].split(',').map((part) => Number(part))
  const shiftX = parts[4] || 0
  const shiftY = parts[5] || 0
  return {
    left: rect.left - shiftX,
    top: rect.top - shiftY,
    width: rect.width,
    height: rect.height,
  }
}

function readSpots(root: HTMLElement): CardSpot[] {
  return [...root.querySelectorAll<HTMLElement>('[data-card-id]')].map((node) => {
    const rect = layoutRect(node)
    return {
      id: node.dataset.cardId ?? '',
      label: node.dataset.cardLabel ?? '',
      meta: node.dataset.cardMeta ?? '',
      zone: (node.dataset.cardZone ?? 'stack') as CardZone,
      hot: node.dataset.cardHot === '1',
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    }
  })
}

export function Diagram() {
  const step = useVisualizer((state) => (state.index >= 0 ? state.steps[state.index] : null))
  const index = useVisualizer((state) => state.index)
  const speed = useVisualizer((state) => state.speed)
  const { turn, duration } = useLoopTurn()
  const rootRef = useRef<HTMLDivElement>(null)
  const spotsRef = useRef<CardSpot[]>([])
  const indexRef = useRef(index)
  const [flights, setFlights] = useState<Flight[]>([])
  const [still, setStill] = useState<Set<string>>(EMPTY_STILL)
  const active = step?.active ?? null
  const callStack = step ? [...step.callStack].reverse() : EMPTY
  const is = (zone: Zone) => active === zone
  const hidden = new Set(flights.map((flight) => flight.hideId))
  const motion = flightDuration(speed)

  const removeFlight = useCallback((id: string) => {
    setFlights((current) => (current.some((flight) => flight.id === id) ? current.filter((flight) => flight.id !== id) : current))
  }, [])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const spots = readSpots(root)
    if (index === indexRef.current) {
      spotsRef.current = spots
      return
    }
    const previousIndex = indexRef.current
    const previous = spotsRef.current
    indexRef.current = index
    spotsRef.current = spots
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sequential = !reduced && index === previousIndex + 1
    const nextFlights = sequential ? planFlights(previous, spots) : []
    if (!sequential) setStill((current) => (current.size === 0 ? current : EMPTY_STILL))
    else if (nextFlights.length) {
      setStill((current) => {
        const next = new Set(current)
        let changed = false
        for (const flight of nextFlights) {
          if (!next.has(flight.hideId)) {
            next.add(flight.hideId)
            changed = true
          }
        }
        return changed ? next : current
      })
    }
    setFlights((current) => (nextFlights.length === 0 && current.length === 0 ? current : nextFlights))
  }, [index, step])

  return (
    <div ref={rootRef} className="grid min-h-0 gap-5 xl:grid-rows-[minmax(0,1.15fr)_minmax(0,0.9fr)]">
      <div className="grid min-h-56 grid-cols-1 gap-5 sm:grid-cols-2">
        <ZoneFrame title="Call Stack" tone="stack" pinBottom active={is('stack') || (is('loop') && callStack.length > 0)}>
          <Cards items={callStack} zone="stack" pinBottom hidden={hidden} still={still} active={is('stack') || (is('loop') && callStack.length > 0)} />
        </ZoneFrame>
        <ZoneFrame title="Web API" tone="web" active={is('webapi')}>
          <Cards items={step?.webApis ?? EMPTY} zone="web" hidden={hidden} still={still} active={is('webapi')} />
        </ZoneFrame>
      </div>
      <div className="grid min-h-56 grid-cols-1 gap-5 sm:grid-cols-[104px_minmax(0,1fr)]">
        <ZoneFrame title="Event Loop" tone="loop" active={is('loop')} className="min-h-28">
          <div className="grid h-full place-items-center">
            <LoopGlyph turn={turn} duration={duration} />
          </div>
        </ZoneFrame>
        <div className="grid min-h-0 gap-5 sm:grid-rows-2">
          <ZoneFrame title="Macrotask Queue" tone="macro" active={is('macro')}>
            <Cards items={step?.macrotasks ?? EMPTY} zone="macro" hidden={hidden} still={still} active={is('macro')} />
          </ZoneFrame>
          <ZoneFrame title="Microtask Queue" tone="micro" active={is('micro')}>
            <Cards items={step?.microtasks ?? EMPTY} zone="micro" hidden={hidden} still={still} active={is('micro')} />
          </ZoneFrame>
        </div>
      </div>
      {flights.length
        ? createPortal(
            flights.map((flight) => <FlightCard key={flight.id} flight={flight} duration={motion} onDone={removeFlight} />),
            document.body,
          )
        : null}
    </div>
  )
}
