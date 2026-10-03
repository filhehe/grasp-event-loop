import { useLayoutEffect, useRef, useState } from 'react'
import { isDequeue } from '../flights.ts'
import { useVisualizer } from '../store.ts'

export function flightDuration(speed: number) {
  return Math.round(Math.min(560, Math.max(180, speed * 0.8)))
}

export function useLoopTurn() {
  const index = useVisualizer((state) => state.index)
  const message = useVisualizer((state) => (state.index >= 0 ? state.steps[state.index].message : ''))
  const speed = useVisualizer((state) => state.speed)
  const [turn, setTurn] = useState(0)
  const indexRef = useRef(index)

  useLayoutEffect(() => {
    if (index === indexRef.current) return
    const previous = indexRef.current
    indexRef.current = index
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced && index === previous + 1 && isDequeue(message)) setTurn((value) => value + 1)
  }, [index, message])

  return { turn, duration: flightDuration(speed) }
}
