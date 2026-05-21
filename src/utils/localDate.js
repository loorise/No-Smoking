/** Локальный календарный день без UTC / toISOString */
export function getLocalDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Полночь (00:00:00.000) локального дня */
export function getStartOfLocalDay(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setHours(0, 0, 0, 0)
  return d
}

/** Миллисекунды до следующей локальной полуночи */
export function getMsUntilNextMidnight(now = new Date()) {
  const nextMidnight = getStartOfLocalDay(now)
  nextMidnight.setDate(nextMidnight.getDate() + 1)
  return Math.max(1, nextMidnight.getTime() - now.getTime())
}
