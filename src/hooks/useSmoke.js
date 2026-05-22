import { useState, useEffect, useCallback, useRef } from 'react'
import {
  addSmokingEvent,
  deleteSmokingEvent,
  fetchEvents,
  isSupabaseConfigured,
} from '../lib/supabase'
import {
  clearLegacyStorage,
  loadOfflineEvents,
  saveOfflineCache,
  saveOfflineEvents,
} from '../lib/eventStorage'
import { getLocalDateKey } from '../utils/localDate'
import {
  getElapsedSeconds,
  getLastSmokedTimestamp,
  normalizeEventDurations,
  sortEventsByTimestamp,
} from '../utils/timer'

export { getLocalDateKey } from '../utils/localDate'

const useCloud = isSupabaseConfigured

function applyNormalizedEvents(rawEvents, { eventsRef, setEvents, setElapsed }) {
  const normalized = normalizeEventDurations(sortEventsByTimestamp(rawEvents))
  eventsRef.current = normalized
  setEvents(normalized)
  setElapsed(getElapsedSeconds(normalized))

  if (useCloud) {
    saveOfflineCache(normalized)
  } else {
    saveOfflineEvents(normalized)
  }

  return normalized
}

export function useSmoke({ midnightTick = 0, todayDayKey } = {}) {
  const [events, setEvents] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [isHydrated, setIsHydrated] = useState(!useCloud)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const eventsRef = useRef([])
  const isMountedRef = useRef(true)
  const isDeletingRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

 const isLoadingRef = useRef(false)

const loadEvents = useCallback(async () => {
  if (isLoadingRef.current) {
    console.log('[smoke] loadEvents skipped — already loading')
    return { ok: false, error: 'busy' }
  }

  isLoadingRef.current = true
  try {
    if (!useCloud) {
      const local = loadOfflineEvents()
      applyNormalizedEvents(local, { eventsRef, setEvents, setElapsed })
      return { ok: true, events: local }
    }

    const result = await fetchEvents()
    if (!result.ok) {
      console.warn('[smoke] loadEvents failed', result.error)
      return { ok: false, error: result.error }
    }

    clearLegacyStorage()
    applyNormalizedEvents(result.events, { eventsRef, setEvents, setElapsed })
    console.log('[smoke] loadEvents success', result.events.length)
    return { ok: true, events: result.events }
  } finally {
    isLoadingRef.current = false
  }
}, [])

  // Текущий код уже корректно проверяет result.error !== 'no_user_id'
// Нужно только убедиться что userId стабилен до первого bootstrap

useEffect(() => {
  let cancelled = false

  async function bootstrap() {
    // Ждём userId один раз до начала цикла
    const { waitForUserId } = await import('../lib/telegramAuth')
    const userId = await waitForUserId({ maxWaitMs: 10000 })
    
    if (!userId) {
      console.warn('[smoke] No userId after wait — skip bootstrap')
      if (isMountedRef.current) setIsHydrated(true) // разблокировать UI
      return
    }

    for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
      const result = await loadEvents()
      if (result.ok) {
        if (isMountedRef.current) setIsHydrated(true)
        return
      }
      if (result.error !== 'no_user_id') break
      await new Promise(r => setTimeout(r, 300))
    }
    
    if (isMountedRef.current) setIsHydrated(true)
  }

  bootstrap()
  return () => { cancelled = true }
}, [loadEvents])

  useEffect(() => {
    if (!isHydrated) return undefined

    const tick = () => {
      setElapsed(getElapsedSeconds(eventsRef.current))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isHydrated])

  const deleteEvent = useCallback(
  async (eventId) => {
    const id = Number(eventId)
    if (!Number.isFinite(id)) return { ok: false, error: 'invalid_id' }
    if (isDeletingRef.current) return { ok: false, error: 'busy' }

    console.log('[smoke] delete started', id)
    isDeletingRef.current = true
    setIsDeleting(true)
    setDeleteError(null)

    // Optimistic: убираем из UI немедленно
    const snapshot = eventsRef.current
    applyNormalizedEvents(
      snapshot.filter(e => Number(e.id) !== id),
      { eventsRef, setEvents, setElapsed },
    )

    try {
      if (useCloud) {
        const del = await deleteSmokingEvent(id)
        if (!del.ok) throw new Error(del.error ?? 'delete_failed')
        console.log('[smoke] delete confirmed', id)
      } else {
        const local = loadOfflineEvents().filter(e => Number(e.id) !== id)
        saveOfflineEvents(local)
      }

      // Refetch для синхронизации с сервером
      const loaded = await loadEvents()
      if (!loaded.ok) {
        // Refetch упал — не критично, optimistic уже применён
        console.warn('[smoke] refetch after delete failed', loaded.error)
      }

      return { ok: true }
    } catch (err) {
      const message = err?.message ?? 'delete_failed'
      console.warn('[smoke] delete failed, rolling back', id, message)

      // Rollback к snapshot
      applyNormalizedEvents(snapshot, { eventsRef, setEvents, setElapsed })

      if (isMountedRef.current) setDeleteError(message)
      return { ok: false, error: message }
    } finally {
      isDeletingRef.current = false
      if (isMountedRef.current) setIsDeleting(false)
    }
  },
  [loadEvents],
)

  const reset = useCallback(async () => {
    const now = Date.now()
    const lastTs = getLastSmokedTimestamp(eventsRef.current)
    const duration = Math.floor((now - lastTs) / 1000)
    const event = { id: now, timestamp: now, duration }

    if (!useCloud) {
      const next = [...eventsRef.current, event]
      applyNormalizedEvents(next, { eventsRef, setEvents, setElapsed })
      saveOfflineEvents(eventsRef.current)
      return true
    }

    const result = await addSmokingEvent(event)
    if (!result.ok) return false

    await loadEvents()

    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {}

    return true
  }, [loadEvents])

  const getTodayCount = useCallback(() => {
    const todayKey = todayDayKey ?? getLocalDateKey(new Date())
    return events.filter(e => getLocalDateKey(new Date(e.timestamp)) === todayKey).length
  }, [events, midnightTick, todayDayKey])

  const getEventsForDay = useCallback((date) => {
    const key = getLocalDateKey(date)
    return events
      .filter(e => getLocalDateKey(new Date(e.timestamp)) === key)
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [events])

  return {
    events,
    elapsed,
    isHydrated,
    isDeleting,
    deleteError,
    deleteEvent,
    removeEvent: deleteEvent,
    reset,
    getTodayCount,
    getEventsForDay,
    midnightTick,
    refresh: loadEvents,
  }
}