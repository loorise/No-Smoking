import { useState, useEffect, useCallback, useRef } from 'react'
import {
  addSmokingEvent,
  deleteSmokingEvent,
  fetchEvents,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase'
import {
  clearLegacyStorage,
  loadOfflineEvents,
  saveOfflineCache,
  saveOfflineEvents,
} from '../lib/eventStorage'
import { waitForUserId } from '../lib/telegramAuth'
import { getLocalDateKey } from '../utils/localDate'
import {
  getElapsedSeconds,
  getLastSmokedTimestamp,
  getLatestEvent,
  normalizeEventDurations,
  sortEventsByTimestamp,
} from '../utils/timer'

export { getLocalDateKey } from '../utils/localDate'

const useCloud = isSupabaseConfigured
const LOG = '[smoke/sync]'

function logLatest(events, label) {
  const latest = getLatestEvent(events)
  console.log(`${LOG} ${label} latest event id`, latest?.id ?? null, 'count', events.length)
}

export function useSmoke({ midnightTick = 0, todayDayKey } = {}) {
  const [events, setEvents] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [isHydrated, setIsHydrated] = useState(!useCloud)

  const eventsRef = useRef([])
  const syncGenerationRef = useRef(0)
  const isDeletingRef = useRef(false)
  const isHydratedRef = useRef(!useCloud)

  const commitEvents = useCallback((rawEvents, source) => {
    const sorted = sortEventsByTimestamp(rawEvents)
    const normalized = normalizeEventDurations(sorted)

    eventsRef.current = normalized
    setEvents(normalized)
    setElapsed(getElapsedSeconds(normalized))
    logLatest(normalized, source)

    if (useCloud) {
      saveOfflineCache(normalized)
    } else {
      saveOfflineEvents(normalized)
    }

    return normalized
  }, [])

  const pullFromSupabase = useCallback(
    async (source, { force = false } = {}) => {
      if (!useCloud) {
        const local = loadOfflineEvents()
        console.log(`${LOG} ${source} offline events`, local)
        return commitEvents(local, source)
      }

      if (isDeletingRef.current && !force) {
        return eventsRef.current
      }

      const generation = ++syncGenerationRef.current
      const result = await fetchEvents()

      if (generation !== syncGenerationRef.current) {
        return eventsRef.current
      }

      if (!result.ok) {
        console.warn(`${LOG} fetch failed (${source})`, result.error, 'user', result.userId)
        return null
      }

      console.log(`${LOG} ${source} fetched events`, result.events, 'user', result.userId)
      clearLegacyStorage()
      return commitEvents(result.events, source)
    },
    [commitEvents],
  )

  const pullFromSupabaseRef = useRef(pullFromSupabase)
  pullFromSupabaseRef.current = pullFromSupabase

  useEffect(() => {
    isHydratedRef.current = isHydrated
  }, [isHydrated])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!useCloud) {
        const local = loadOfflineEvents()
        console.log(`${LOG} initial offline events`, local)
        if (!cancelled) {
          commitEvents(local, 'initial-offline')
          setIsHydrated(true)
        }
        return
      }

      for (let attempt = 0; attempt < 50 && !cancelled; attempt += 1) {
        const committed = await pullFromSupabaseRef.current('initial', { force: true })

        if (committed != null) {
          if (!cancelled) {
            setIsHydrated(true)
            console.log(`${LOG} hydration complete (attempt ${attempt + 1})`)
          }
          return
        }

        await new Promise(r => setTimeout(r, 300))
      }

      console.error(`${LOG} initial fetch failed after retries`)
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [commitEvents])

  useEffect(() => {
    if (!useCloud || !isHydrated) return undefined

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !isDeletingRef.current) {
        pullFromSupabaseRef.current('visibility')
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isHydrated])

  useEffect(() => {
    if (!useCloud || !supabase || !isHydrated) return undefined

    let channel
    let cancelled = false

    const subscribe = async () => {
      const userId = await waitForUserId({ maxWaitMs: 15000 })
      if (!userId || cancelled) return

      channel = supabase
        .channel(`smoking_events:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'smoking_events',
            filter: `user_id=eq.${userId}`,
          },
          payload => {
            console.log(`${LOG} realtime`, payload.eventType, {
              new: payload.new,
              old: payload.old,
            })

            if (isDeletingRef.current) return

            pullFromSupabaseRef.current('realtime')
          },
        )
        .subscribe()
    }

    subscribe()

    return () => {
      cancelled = true
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [isHydrated])

  useEffect(() => {
    if (!isHydrated) return undefined

    const tick = () => {
      setElapsed(getElapsedSeconds(eventsRef.current))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isHydrated])

  const reset = useCallback(async () => {
    const now = Date.now()
    const lastTs = getLastSmokedTimestamp(eventsRef.current)
    const duration = Math.floor((now - lastTs) / 1000)
    const event = { id: now, timestamp: now, duration }

    if (!useCloud) {
      const next = normalizeEventDurations([...eventsRef.current, event])
      commitEvents(next, 'add-offline')
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      } catch {}
      return true
    }

    const result = await addSmokingEvent(event)
    if (!result.ok) {
      console.warn(`${LOG} add failed`, result.error)
      return false
    }

    await pullFromSupabase('after-add', { force: true })

    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {}

    return true
  }, [commitEvents, pullFromSupabase])

  const removeEvent = useCallback(
    async (eventId) => {
      const id = Number(eventId)
      if (!Number.isFinite(id)) return false

      if (!useCloud) {
        const next = eventsRef.current.filter(e => Number(e.id) !== id)
        commitEvents(next, 'delete-offline')
        return true
      }

      isDeletingRef.current = true
      syncGenerationRef.current += 1

      try {
        const result = await deleteSmokingEvent(id)

        if (!result.ok) {
          console.warn(`${LOG} delete failed id`, id, result.error)
          return false
        }

        const committed = await pullFromSupabase('after-delete', { force: true })
        return committed != null
      } finally {
        isDeletingRef.current = false
      }
    },
    [commitEvents, pullFromSupabase],
  )

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
    reset,
    removeEvent,
    getTodayCount,
    getEventsForDay,
    midnightTick,
    refresh: () => pullFromSupabase('manual', { force: true }),
  }
}
