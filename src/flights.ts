export type Rect = { left: number; top: number; width: number; height: number }

export type CardZone = 'stack' | 'web' | 'macro' | 'micro'

export type CardSpot = {
  id: string
  label: string
  meta: string
  zone: CardZone
  rect: Rect
  hot?: boolean
}

export type Flight = {
  id: string
  label: string
  meta: string
  from: Rect
  to: Rect
  fromZone: CardZone
  toZone: CardZone
  hideId: string
  hot: boolean
  handoff?: boolean
  via?: Rect
}

const SCHEDULERS = new Set([
  'setTimeout',
  'setInterval',
  'queueMicrotask',
  '.then',
  '.catch',
  '.finally',
  'Promise.resolve',
  'Promise.reject',
])

function sized(rect: Rect) {
  return rect.width > 1 && rect.height > 1
}

function score(left: string, right: string) {
  if (left === right) return 2
  if (left.length >= 2 && right.length >= 2 && (left.includes(right) || right.includes(left))) return 1
  return 0
}

export function planFlights(prev: CardSpot[], next: CardSpot[]): Flight[] {
  const nextIds = new Set(next.map((spot) => spot.id))
  const prevIds = new Set(prev.map((spot) => spot.id))
  const gone = prev.filter((spot) => !nextIds.has(spot.id) && sized(spot.rect))
  const born = next.filter((spot) => !prevIds.has(spot.id) && sized(spot.rect))
  const taken = new Set<string>()
  const flights: Flight[] = []

  function claim(source: CardSpot, dest: CardSpot) {
    taken.add(dest.id)
    flights.push({
      id: `${source.id}>${dest.id}`,
      label: dest.label,
      meta: dest.meta,
      from: source.rect,
      to: dest.rect,
      fromZone: source.zone,
      toZone: dest.zone,
      hideId: dest.id,
      hot: Boolean(dest.hot),
    })
  }

  for (const source of gone) {
    let best: CardSpot | null = null
    let bestScore = 0
    for (const dest of born) {
      if (taken.has(dest.id) || dest.zone === source.zone) continue
      const value = score(source.label, dest.label)
      if (value > bestScore) {
        best = dest
        bestScore = value
      }
    }
    if (best) claim(source, best)
  }

  for (const dest of born) {
    if (taken.has(dest.id) || dest.zone === 'stack') continue
    const stack = next.filter((spot) => spot.zone === 'stack' && sized(spot.rect))
    const source =
      (dest.zone === 'macro' ? next.find((spot) => spot.zone === 'web' && spot.label === dest.label && sized(spot.rect)) : undefined) ??
      stack.find((spot) => SCHEDULERS.has(spot.label)) ??
      stack[0]
    if (!source || source.id === dest.id) continue
    claim(source, dest)
  }

  return flights
}

export function isDequeue(message: string) {
  return /^Event Loop takes /.test(message) || message.includes('back on the Call Stack')
}
