import { getStartOfLocalDay } from './localDate'

/** Timestamp последней сигареты; без записей — начало локального дня */
export function getLastSmokedTimestamp(events) {
  if (!events?.length) {
    return getStartOfLocalDay().getTime()
  }

  let max = 0
  for (const event of events) {
    const ts = Number(event.timestamp)
    if (ts > max) max = ts
  }
  return max
}

export function getElapsedSeconds(events, now = Date.now()) {
  const lastTs = getLastSmokedTimestamp(events)
  return Math.max(0, Math.floor((now - lastTs) / 1000))
}
