import { getLocalDateKey } from './localDate'

function getDayBounds(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { startMs: start.getTime(), endMs: end.getTime() }
}

export function pluralize(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function formatInterval(seconds) {
  if (seconds == null) return '—'
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)

  if (h === 0 && m === 0) return '0 мин'
  if (h === 0) return `${m} ${pluralize(m, 'минута', 'минуты', 'минут')}`
  if (m === 0) return `${h} ${pluralize(h, 'час', 'часа', 'часов')}`
  return `${h} ${pluralize(h, 'час', 'часа', 'часов')} ${m} ${pluralize(m, 'минута', 'минуты', 'минут')}`
}

/**
 * Статистика за выбранный день на основе smoking_events (timestamp, duration).
 */
export function calcDayStats(events, currentDate, now = Date.now()) {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const { startMs, endMs } = getDayBounds(currentDate)
  const isToday = getLocalDateKey(new Date(now)) === getLocalDateKey(currentDate)
  const effectiveEndMs = isToday ? Math.min(now, endMs) : endMs
  const dayLengthSec = Math.max(0, (effectiveEndMs - startMs) / 1000)

  const count = sorted.length

  if (count === 0) {
    return {
      count: 0,
      avgInterval: null,
      maxInterval: dayLengthSec,
      totalSmokeFree: dayLengthSec,
    }
  }

  const headSec = Math.max(0, (sorted[0].timestamp - startMs) / 1000)
  const tailSec = Math.max(0, (effectiveEndMs - sorted[sorted.length - 1].timestamp) / 1000)
  const betweenDurations = sorted.slice(1).map(e => Number(e.duration ?? 0))

  const avgInterval =
    betweenDurations.length > 0
      ? betweenDurations.reduce((sum, d) => sum + d, 0) / betweenDurations.length
      : null

  const maxInterval = Math.max(
    headSec,
    tailSec,
    ...sorted.map(e => Number(e.duration ?? 0)),
    0,
  )

  const totalSmokeFree =
    headSec + betweenDurations.reduce((sum, d) => sum + d, 0) + tailSec

  return {
    count,
    avgInterval,
    maxInterval,
    totalSmokeFree: Math.min(totalSmokeFree, dayLengthSec),
  }
}
