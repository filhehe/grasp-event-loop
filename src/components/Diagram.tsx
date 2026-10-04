import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type AnimationEvent, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { CardSpot, CardZone, Flight, Rect } from '../flights.ts'
import { isDequeue, planFlights } from '../flights.ts'
import type { FrameCard, Zone } from '../engine/simulate.ts'
import { useVisualizer } from '../store.ts'
import { BlockHelp } from './BlockHelp.tsx'
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
      width="68"
      height="68"
      viewBox="0 0 48 48"
      fill="none"
      data-loop-glyph=""
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
          <stop stopColor="#5eead4" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function TaskCard({
  item,
  hot,
  zone,
  hidden,
  still,
  row,
}: {
  item: FrameCard
  hot: boolean
  zone: CardZone
  hidden: boolean
  still: boolean
  row?: boolean
}) {
  const code = useVisualizer((state) => state.code)
  const setHover = useVisualizer((state) => state.setHover)
  const source = item.start != null && item.end != null ? code.slice(item.start, item.end) : item.label

  return (
    <div
      className={`task-card ${row ? 'queue-card' : ''} ${hot ? 'task-card-hot' : ''} ${still ? 'task-card-still' : ''}`}
      data-card-id={item.id}
      data-card-zone={zone}
      data-card-label={item.label}
      data-card-meta={item.meta ?? ''}
      data-card-hot={hot ? '1' : '0'}
      style={hidden ? { opacity: 0 } : undefined}
      title={source}
      onMouseEnter={
        row
          ? () => setHover({ id: item.id, line: item.line, start: item.start, end: item.end })
          : undefined
      }
      onMouseLeave={row ? () => setHover(null) : undefined}
    >
      {row ? (
        <span className="queue-card-code">
          () <span className="queue-card-arrow">=&gt;</span> {'{'}
          <span className="queue-card-ellipsis"> ... </span>
          {'}'}
        </span>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[#e8edf7]">{item.label}</span>
          {item.meta ? <span className="shrink-0 font-mono text-[11px] text-[#93a0b8]">{item.meta}</span> : null}
        </>
      )}
    </div>
  )
}

function ZoneFrame({
  title,
  hint,
  href,
  tone,
  active,
  pinBottom,
  className,
  children,
}: {
  title: string
  hint: string
  href: string
  tone: 'stack' | 'web' | 'macro' | 'micro' | 'loop'
  active: boolean
  pinBottom?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`zone zone-${tone} ${active ? 'zone-active' : ''} ${className ?? ''}`} aria-label={title}>
      <h2 className="zone-label">
        {title}
        <BlockHelp label={title} text={hint} href={href} />
      </h2>
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
  row,
}: {
  items: FrameCard[]
  active: boolean
  pinBottom?: boolean
  zone: CardZone
  hidden: Set<string>
  still: Set<string>
  row?: boolean
}) {
  if (!items.length) return null
  return (
    <div className={row ? 'queue-cards' : `flex flex-col gap-2 ${pinBottom ? 'mt-auto' : ''}`}>
      {items.map((item, index) => (
        <TaskCard
          key={item.id}
          item={item}
          zone={zone}
          row={row}
          hidden={hidden.has(item.id)}
          still={still.has(item.id)}
          hot={active && index === 0}
        />
      ))}
    </div>
  )
}

const HANDOFF_HOP = 420
const HANDOFF_BEAT = 500

function QueueFace() {
  return (
    <span className="queue-card-code">
      () <span className="queue-card-arrow">=&gt;</span> {'{'}
      <span className="queue-card-ellipsis"> ... </span>
      {'}'}
    </span>
  )
}

function centerOf(target: Rect, size: Rect): Rect {
  return {
    left: target.left + target.width / 2 - size.width / 2,
    top: target.top + target.height / 2 - size.height / 2,
    width: size.width,
    height: size.height,
  }
}

function HandoffCard({
  flight,
  lead,
  onSpin,
  onDone,
}: {
  flight: Flight
  lead: boolean
  onSpin: () => void
  onDone: (id: string) => void
}) {
  const [phase, setPhase] = useState<'in' | 'rest' | 'out'>('in')
  const done = useRef(false)
  const onDoneRef = useRef(onDone)
  const onSpinRef = useRef(onSpin)
  onDoneRef.current = onDone
  onSpinRef.current = onSpin
  const via = flight.via ?? flight.from
  const landing = centerOf(flight.to, via)
  const origin = phase === 'out' ? via : flight.from
  const dest = phase === 'out' ? landing : via
  const dx = origin.left + origin.width / 2 - (dest.left + dest.width / 2)
  const dy = origin.top + origin.height / 2 - (dest.top + dest.height / 2)

  function finish() {
    if (done.current) return
    done.current = true
    const target = document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(flight.hideId)}"]`)
    if (target) target.style.opacity = '1'
    requestAnimationFrame(() => onDoneRef.current(flight.id))
  }

  function onAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.animationName !== 'flight-move') return
    if (phase === 'in') setPhase('rest')
    else finish()
  }

  useEffect(() => {
    if (phase === 'rest') return
    const timer = window.setTimeout(() => {
      if (phase === 'in') setPhase('rest')
      else finish()
    }, HANDOFF_HOP + 80)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'rest') return
    const spinTimer = lead ? window.setTimeout(() => onSpinRef.current(), HANDOFF_BEAT) : 0
    const flyTimer = window.setTimeout(() => setPhase('out'), HANDOFF_BEAT * 2)
    return () => {
      if (spinTimer) window.clearTimeout(spinTimer)
      window.clearTimeout(flyTimer)
    }
  }, [phase, lead])

  const style = {
    left: dest.left,
    top: dest.top,
    width: dest.width,
    height: dest.height,
    '--flight-x': `${dx}px`,
    '--flight-y': `${dy}px`,
    '--flight-ms': `${HANDOFF_HOP}ms`,
  } as CSSProperties

  return (
    <div
      key={phase}
      className={`task-card queue-card flight-card queue-card-${flight.fromZone} ${phase === 'rest' ? 'flight-card-rest' : ''}`}
      style={style}
      onAnimationEnd={onAnimationEnd}
      aria-hidden="true"
    >
      <QueueFace />
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
  const queued = flight.fromZone === 'stack' && (flight.toZone === 'macro' || flight.toZone === 'micro')

  return (
    <div
      className={
        queued
          ? `task-card queue-card flight-card queue-card-${flight.toZone}`
          : `task-card flight-card ${flight.hot ? 'task-card-hot' : ''}`
      }
      style={style}
      onAnimationEnd={finish}
      aria-hidden="true"
    >
      {queued ? (
        <QueueFace />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[#e8edf7]">{flight.label}</span>
          {flight.meta ? <span className="shrink-0 font-mono text-[11px] text-[#93a0b8]">{flight.meta}</span> : null}
        </>
      )}
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

function slideQueue(previous: CardSpot[], next: CardSpot[]) {
  const nodes: HTMLElement[] = []
  for (const spot of next) {
    if (spot.zone !== 'macro' && spot.zone !== 'micro') continue
    const prev = previous.find((item) => item.id === spot.id)
    if (!prev) continue
    const dx = prev.rect.left - spot.rect.left
    const dy = prev.rect.top - spot.rect.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
    const node = document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(spot.id)}"]`)
    if (!node) continue
    node.style.transition = 'none'
    node.style.transform = `translate(${dx}px, ${dy}px)`
    nodes.push(node)
  }
  if (!nodes.length) return
  for (const node of nodes) void node.offsetWidth
  for (const node of nodes) {
    node.style.transition = `transform ${HANDOFF_HOP}ms cubic-bezier(0.22, 0.7, 0.2, 1)`
    node.style.transform = 'translate(0px, 0px)'
    const clear = (event?: TransitionEvent) => {
      if (event && event.propertyName !== 'transform') return
      node.style.transition = ''
      node.style.transform = ''
      node.removeEventListener('transitionend', clear)
    }
    node.addEventListener('transitionend', clear)
    window.setTimeout(() => clear(), HANDOFF_HOP + 80)
  }
}

function readSpots(): CardSpot[] {
  return [...document.querySelectorAll<HTMLElement>('[data-card-id]')].map((node) => {
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

export function Diagram({
  stackHost,
  loopHost,
}: {
  stackHost: RefObject<HTMLDivElement | null>
  loopHost: RefObject<HTMLDivElement | null>
}) {
  const step = useVisualizer((state) => (state.index >= 0 ? state.steps[state.index] : null))
  const index = useVisualizer((state) => state.index)
  const speed = useVisualizer((state) => state.speed)
  const hoverId = useVisualizer((state) => state.hover?.id ?? null)
  const setHover = useVisualizer((state) => state.setHover)
  const setHold = useVisualizer((state) => state.setHold)
  const { turn, spin } = useLoopTurn()
  const rootRef = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const [loopNode, setLoopNode] = useState<HTMLDivElement | null>(null)
  const [phone, setPhone] = useState(false)
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

  useEffect(() => {
    if (!hoverId) return
    const alive =
      step?.macrotasks.some((item) => item.id === hoverId) || step?.microtasks.some((item) => item.id === hoverId)
    if (!alive) setHover(null)
  }, [hoverId, step, setHover])

  useLayoutEffect(() => {
    const node = stackHost.current
    setHost((current) => (current === node ? current : node))
  }, [stackHost])

  useLayoutEffect(() => {
    const node = loopHost.current
    setLoopNode((current) => (current === node ? current : node))
  }, [loopHost])

  useLayoutEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const apply = () => setPhone(query.matches)
    apply()
    query.addEventListener('change', apply)
    window.addEventListener('resize', apply)
    return () => {
      query.removeEventListener('change', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])

  useLayoutEffect(() => {
    const spots = readSpots()
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
    const planned = sequential ? planFlights(previous, spots) : []
    const glyph = document.querySelector<HTMLElement>('[data-loop-glyph]')
    const glyphRect = glyph?.getBoundingClientRect()
    let handoffIndex = 0
    const nextFlights = planned.map((flight) => {
      const queued = flight.fromZone === 'macro' || flight.fromZone === 'micro'
      if (!queued || flight.toZone !== 'stack' || !glyphRect) return flight
      const width = flight.from.width
      const height = flight.from.height
      const shift = handoffIndex * 16
      handoffIndex += 1
      return {
        ...flight,
        handoff: true,
        via: {
          left: glyphRect.left + glyphRect.width / 2 - width / 2 + shift,
          top: glyphRect.top - height - 8,
          width,
          height,
        },
      }
    })
    if (sequential) slideQueue(previous, spots)
    const message = step?.message ?? ''
    if (sequential && isDequeue(message) && !nextFlights.some((flight) => flight.handoff)) spin()
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
  }, [index, step, host, phone, spin])

  useEffect(() => {
    setHold(flights.some((flight) => flight.handoff))
  }, [flights, setHold])

  const loopZone = (
    <ZoneFrame
      title="Event Loop"
      hint="Связывает стек с очередями. Когда стек пуст, сначала забирает все микрозадачи, затем одну макрозадачу. Карточка залетает сюда, стрелки делают оборот, и только потом она уходит в Call Stack."
      href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model#job_queue_and_event_loop"
      tone="loop"
      active={is('loop')}
      className={phone ? 'h-full' : 'min-h-28'}
    >
      <div className="grid h-full place-items-center">
        <LoopGlyph turn={turn} duration={HANDOFF_BEAT} />
      </div>
    </ZoneFrame>
  )

  const callStackZone = (
    <ZoneFrame
      title="Call Stack"
      hint="Стек вызовов. Синхронный код выполняется здесь: вызов функции кладётся сверху и снимается, когда функция завершается. Пока стек не пуст, event loop не берёт задачи из очередей."
      href="https://developer.mozilla.org/en-US/docs/Glossary/Call_stack"
      tone="stack"
      pinBottom
      active={is('stack') || (is('loop') && callStack.length > 0)}
      className="h-full min-h-[148px]"
    >
      <Cards items={callStack} zone="stack" pinBottom hidden={hidden} still={still} active={is('stack') || (is('loop') && callStack.length > 0)} />
    </ZoneFrame>
  )

  return (
    <>
      {phone && host ? createPortal(callStackZone, host) : null}
      {phone && loopNode ? createPortal(loopZone, loopNode) : null}
      <div ref={rootRef} className="diagram grid min-h-0 min-w-0 gap-5 xl:grid-rows-[minmax(0,1.15fr)_minmax(0,0.9fr)]">
        <div className="grid min-h-56 grid-cols-1 gap-5 sm:grid-cols-2">
          {phone ? null : callStackZone}
          <ZoneFrame
            title="Web API"
            hint="Браузерные операции вне стека: setTimeout и setInterval ждут здесь, пока не истечёт задержка. Так таймер не блокирует остальной код."
            href="https://developer.mozilla.org/en-US/docs/Web/API"
            tone="web"
            active={is('webapi')}
          >
            <Cards items={step?.webApis ?? EMPTY} zone="web" hidden={hidden} still={still} active={is('webapi')} />
          </ZoneFrame>
        </div>
        <div className="grid min-h-56 grid-cols-1 gap-5 sm:grid-cols-[132px_minmax(0,1fr)]">
        {phone ? null : loopZone}
        <div className="grid min-h-0 gap-5 sm:grid-rows-2">
          <ZoneFrame
            title="Macrotask Queue"
            hint="Очередь макрозадач: колбэки setTimeout и setInterval. Event loop берёт отсюда одну задачу за проход и только после того, как микрозадач уже не осталось."
            href="https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide#tasks"
            tone="macro"
            active={is('macro')}
          >
            <Cards items={step?.macrotasks ?? EMPTY} zone="macro" hidden={hidden} still={still} active={is('macro')} row />
          </ZoneFrame>
          <ZoneFrame
            title="Microtask Queue"
            hint="Очередь микрозадач: then, catch, finally и queueMicrotask. Они выполняются сразу после текущего кода, все подряд, раньше любой макрозадачи."
            href="https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide#microtasks"
            tone="micro"
            active={is('micro')}
          >
            <Cards items={step?.microtasks ?? EMPTY} zone="micro" hidden={hidden} still={still} active={is('micro')} row />
          </ZoneFrame>
        </div>
      </div>
      {flights.length
        ? createPortal(
            flights.map((flight, flightIndex) =>
              flight.handoff && flight.via ? (
                <HandoffCard
                  key={flight.id}
                  flight={flight}
                  lead={flights.findIndex((item) => item.handoff) === flightIndex}
                  onSpin={spin}
                  onDone={removeFlight}
                />
              ) : (
                <FlightCard key={flight.id} flight={flight} duration={motion} onDone={removeFlight} />
              ),
            ),
            document.body,
          )
        : null}
    </div>
    </>
  )
}
