import { useState, useEffect, useCallback } from 'react'
import { addSmokingEvent, getSmokingEvents } from '../lib/supabase'
import { getLocalDateKey } from '../utils/localDate'
import { getElapsedSeconds, getLastSmokedTimestamp } from '../utils/timer'

export { getLocalDateKey } from '../utils/localDate'

const STORAGE_KEY = 'smoke_tracker_events'
const LEGACY_TIMER_KEY = 'smoke_timer_start'

function getStoredEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {}
}

function mergeEvents(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const event of list) {
      if (!event?.id || !event?.timestamp) continue
      const existing = map.get(event.id)
      if (!existing || existing.timestamp < event.timestamp) {
        map.set(event.id, {
          id: Number(event.id),
          timestamp: Number(event.timestamp),
          duration: Number(event.duration ?? 0),
        })
      }
    }
  }
  return [...map.values()].sort((a, b) => a.timestamp - b.timestamp)
}

export function useSmoke({ midnightTick = 0, todayDayKey } = {}) {
  const [events, setEvents] = useState(() => getStoredEvents())
  const [elapsed, setElapsed] = useState(() => getElapsedSeconds(getStoredEvents()))

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_TIMER_KEY)
    } catch {}
  }, [])

  useEffect(() => {
    saveEvents(events)
  }, [events])

  const applyEvents = useCallback((nextEvents) => {
    setEvents(nextEvents)
    setElapsed(getElapsedSeconds(nextEvents))
  }, [])

  const syncFromCloud = useCallback(async () => {
    const local = getStoredEvents()
    const result = await getSmokingEvents()

    if (result.ok) {
      const merged = mergeEvents(local, result.events)
      applyEvents(merged)
      saveEvents(merged)
      return merged
    }

    if (result.error === 'no_user_id') {
      console.warn('[smoke] Cloud sync skipped: Telegram user id not ready')
    }

    if (local.length > 0) {
      applyEvents(local)
    }

    return local
  }, [applyEvents])

  useEffect(() => {
    syncFromCloud()
  }, [syncFromCloud])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        syncFromCloud()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [syncFromCloud])

  useEffect(() => {
    const tick = () => {
      setElapsed(getElapsedSeconds(events))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [events])

  const reset = useCallback(() => {
    const now = Date.now()
    const lastTs = getLastSmokedTimestamp(events)
    const duration = Math.floor((now - lastTs) / 1000)
    const event = { id: now, timestamp: now, duration }

    setEvents(prev => {
      const next = [...prev, event]
      setElapsed(getElapsedSeconds(next))
      return next
    })

    addSmokingEvent(event).then(result => {
      if (!result.ok) {
        console.warn('[smoke] Supabase save failed, using localStorage:', result.error)
        return
      }
      syncFromCloud()
    })

    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {}
  }, [events, syncFromCloud])

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
    reset,
    getTodayCount,
    getEventsForDay,
    midnightTick,
  }
}
