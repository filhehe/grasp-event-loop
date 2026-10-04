import { useVisualizer } from '../store.ts'

export function flightDuration(speed: number) {
  return Math.round(Math.min(560, Math.max(180, speed * 0.8)))
}

export function useLoopTurn() {
  const turn = useVisualizer((state) => state.loopTurn)
  const speed = useVisualizer((state) => state.speed)
  const spin = useVisualizer((state) => state.spinLoop)
  return { turn, duration: flightDuration(speed), spin }
}
