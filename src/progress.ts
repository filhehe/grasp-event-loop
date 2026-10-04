const KEY = 'grasp-event-loop-done'

export function readCompleted(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function rememberExample(id: string, current: string[]) {
  if (current.includes(id)) return current
  const next = [...current, id]
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    return current
  }
  return next
}
