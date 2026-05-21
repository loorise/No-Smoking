import { useState, useEffect, useCallback } from 'react'
import { addSmokingEvent, getSmokingEvents } from '../lib/supabase'
import { getLocalDateKey } from '../utils/localDate'

export { getLocalDateKey } from '../utils/localDate'

const STORAGE_KEY = 'smoke_tracker_events'
const TIMER_KEY = 'smoke_timer_start'

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
  const [timerStart, setTimerStart] = useState(() => {
    const stored = localStorage.getItem(TIMER_KEY)
    return stored ? Number(stored) : Date.now()
  })
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    saveEvents(events)
  }, [events])

  useEffect(() => {
    let cancelled = false

    async function syncFromCloud() {
      const local = getStoredEvents()
      const result = await getSmokingEvents()

      if (cancelled) return

      if (result.ok) {
        const merged = mergeEvents(local, result.events)
        setEvents(merged)
        saveEvents(merged)
      } else if (local.length > 0) {
        setEvents(local)
      }

    }

    syncFromCloud()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timerStart) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [timerStart])

  const reset = useCallback(() => {
    const now = Date.now()
    const duration = Math.floor((now - timerStart) / 1000)
    const event = { id: now, timestamp: now, duration }

    setEvents(prev => [...prev, event])
    setTimerStart(now)
    setElapsed(0)
    localStorage.setItem(TIMER_KEY, String(now))

    addSmokingEvent(event).then(result => {
      if (!result.ok) {
        console.warn('[smoke] Supabase save failed, using localStorage:', result.error)
      }
    })

    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {}
  }, [timerStart])

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
