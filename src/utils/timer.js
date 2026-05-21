/** Последняя запись по timestamp */
export function getLatestEvent(events) {
  if (!events?.length) return null

  let latest = events[0]
  for (let i = 1; i < events.length; i += 1) {
    if (Number(events[i].timestamp) > Number(latest.timestamp)) {
      latest = events[i]
    }
  }
  return latest
}

/** Timestamp последней сигареты; без записей — «сейчас» (таймер = 0) */
export function getLastSmokedTimestamp(events) {
  const latest = getLatestEvent(events)
  if (!latest) return Date.now()
  return Number(latest.timestamp)
}

export function getElapsedSeconds(events, now = Date.now()) {
  if (!events?.length) return 0

  const lastTs = getLastSmokedTimestamp(events)
  return Math.max(0, Math.floor((now - lastTs) / 1000))
}

/** Пересчёт duration по timestamp (кроме первой записи в общей ленте) */
export function normalizeEventDurations(events) {
  if (!events?.length) return []

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  return sorted.map((event, index) => ({
    ...event,
    duration:
      index === 0
        ? Number(event.duration ?? 0)
        : Math.floor((event.timestamp - sorted[index - 1].timestamp) / 1000),
  }))
}

export function sortEventsByTimestamp(events) {
  return [...(events ?? [])].sort((a, b) => a.timestamp - b.timestamp)
}
