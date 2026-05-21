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
const REALTIME_DEBOUNCE_MS = 450
const REALTIME_SUPPRESS_MS = 1200
const REFETCH_TIMEOUT_MS = 12000

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    }),
  ])
}

function logLatest(events, label) {
  const latest = getLatestEvent(events)
  console.log(
    '[smoke/sync]',
    label,
    'latest event id',
    latest?.id ?? null,
    'count',
    events.length,
  )
}

export function useSmoke({ midnightTick = 0, todayDayKey } = {}) {
  const [events, setEvents] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [isHydrated, setIsHydrated] = useState(!useCloud)
  const [deletingEventId, setDeletingEventId] = useState(null)

  const eventsRef = useRef([])
  const isHydratedRef = useRef(!useCloud)
  const isDeletingRef = useRef(false)
  const isMountedRef = useRef(true)
  const refetchChainRef = useRef(Promise.resolve())
  const realtimeTimerRef = useRef(null)
  const suppressRealtimeUntilRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const clearDeletingState = useCallback(() => {
    isDeletingRef.current = false
    if (isMountedRef.current) {
      setDeletingEventId(null)
    }
  }, [])

  const commitEvents = useCallback((rawEvents, source) => {
    if (!isMountedRef.current) {
      eventsRef.current = normalizeEventDurations(sortEventsByTimestamp(rawEvents))
      return eventsRef.current
    }
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

  const runRefetch = useCallback(
    async (source) => {
      if (!useCloud) {
        const local = loadOfflineEvents()
        commitEvents(local, source)
        console.log('[smoke] refetch success', source, '(offline)')
        return true
      }

      const result = await fetchEvents()
      if (!result.ok) {
        console.warn('[smoke] refetch failed', source, result.error)
        return false
      }

      clearLegacyStorage()
      commitEvents(result.events, source)
      console.log('[smoke] refetch success', source, 'count', result.events.length)
      return true
    },
    [commitEvents],
  )

  const enqueueRefetch = useCallback(
    (source, { allowDuringDelete = false } = {}) => {
      if (isDeletingRef.current && !allowDuringDelete) {
        console.log('[smoke] refetch skipped (deleting)', source)
        return Promise.resolve(false)
      }

      const task = refetchChainRef.current
        .then(() => withTimeout(runRefetch(source), REFETCH_TIMEOUT_MS, source))
        .catch(err => {
          console.warn('[smoke] refetch error', source, err)
          return false
        })

      refetchChainRef.current = task
      return task
    },
    [runRefetch],
  )

  const enqueueRefetchRef = useRef(enqueueRefetch)
  enqueueRefetchRef.current = enqueueRefetch

  const scheduleRealtimeReconcile = useCallback(() => {
    if (isDeletingRef.current) {
      console.log('[smoke] realtime ignored (deleting in progress)')
      return
    }

    if (Date.now() < suppressRealtimeUntilRef.current) {
      console.log('[smoke] realtime suppressed (post-delete cooldown)')
      return
    }

    if (realtimeTimerRef.current) {
      clearTimeout(realtimeTimerRef.current)
    }

    realtimeTimerRef.current = setTimeout(() => {
      realtimeTimerRef.current = null
      if (isDeletingRef.current) return
      if (Date.now() < suppressRealtimeUntilRef.current) return
      enqueueRefetchRef.current('realtime')
    }, REALTIME_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    isHydratedRef.current = isHydrated
  }, [isHydrated])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!useCloud) {
        const local = loadOfflineEvents()
        if (!cancelled) {
          commitEvents(local, 'initial-offline')
          setIsHydrated(true)
        }
        return
      }

      for (let attempt = 0; attempt < 50 && !cancelled; attempt += 1) {
        const ok = await enqueueRefetchRef.current('initial', { allowDuringDelete: true })
        if (ok) {
          if (!cancelled) {
            setIsHydrated(true)
            console.log('[smoke/sync] hydration complete', `(attempt ${attempt + 1})`)
          }
          return
        }
        await new Promise(r => setTimeout(r, 300))
      }

      console.error('[smoke/sync] initial fetch failed after retries')
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [commitEvents])

  useEffect(() => {
    if (!useCloud || !isHydrated) return undefined

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        enqueueRefetchRef.current('visibility')
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
            console.log('[smoke] realtime event received', payload.eventType, {
              id: payload.new?.id ?? payload.old?.id,
            })
            scheduleRealtimeReconcile()
          },
        )
        .subscribe()
    }

    subscribe()

    return () => {
      cancelled = true
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current)
      }
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [isHydrated, scheduleRealtimeReconcile])

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
      console.warn('[smoke] add failed', result.error)
      return false
    }

    suppressRealtimeUntilRef.current = Date.now() + REALTIME_SUPPRESS_MS
    await enqueueRefetch('after-add', { allowDuringDelete: true })

    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {}

    return true
  }, [commitEvents, enqueueRefetch])

  const removeEvent = useCallback(
    async (eventId) => {
      const id = Number(eventId)
      if (!Number.isFinite(id)) return false

      if (isDeletingRef.current) {
        console.log('[smoke] delete skipped (already in progress)', id)
        return false
      }

      if (!useCloud) {
        console.log('[smoke] delete started', id, '(offline)')
        if (isMountedRef.current) setDeletingEventId(id)
        isDeletingRef.current = true
        try {
          const next = eventsRef.current.filter(e => Number(e.id) !== id)
          commitEvents(next, 'delete-offline')
          console.log('[smoke] refetch success', 'delete-offline')
          console.log('[smoke] rerender', { eventsLength: next.length })
          return true
        } finally {
          clearDeletingState()
        }
      }

      console.log('[smoke] delete started', id)
      if (isMountedRef.current) setDeletingEventId(id)
      isDeletingRef.current = true
      suppressRealtimeUntilRef.current = Date.now() + REALTIME_SUPPRESS_MS

      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current)
        realtimeTimerRef.current = null
      }

      try {
        const result = await deleteSmokingEvent(id)

        if (!result.ok) {
          console.warn('[smoke] delete failed', id, result.error)
          return false
        }

        console.log('[smoke] delete success', id)

        clearDeletingState()

        const refetched = await enqueueRefetch('after-delete', { allowDuringDelete: true })
        if (!refetched) {
          console.warn('[smoke] refetch failed after delete', id)
          return false
        }

        console.log('[smoke] rerender', {
          eventsLength: eventsRef.current.length,
          latestId: getLatestEvent(eventsRef.current)?.id ?? null,
        })

        suppressRealtimeUntilRef.current = Date.now() + REALTIME_SUPPRESS_MS
        return true
      } catch (err) {
        console.error('[smoke] delete flow error', id, err)
        return false
      } finally {
        clearDeletingState()
      }
    },
    [commitEvents, enqueueRefetch, clearDeletingState],
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
    deletingEventId,
    reset,
    removeEvent,
    getTodayCount,
    getEventsForDay,
    midnightTick,
    refresh: () => enqueueRefetch('manual'),
  }
}
