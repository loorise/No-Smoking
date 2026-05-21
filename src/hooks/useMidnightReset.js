import { useState, useEffect, useRef, useCallback } from 'react'
import { getLocalDateKey, getMsUntilNextMidnight, getStartOfLocalDay } from '../utils/localDate'

/**
 * Планирует срабатывание в 00:00 локального времени.
 * @param {object} options
 * @param {(dayKey: string) => void} [options.onMidnight] — колбэк при наступлении нового дня
 * @param {boolean} [options.enabled=true]
 * @returns {{ dayKey: string, tick: number, todayStart: Date }}
 */
export function useMidnightReset({ onMidnight, enabled = true } = {}) {
  const [dayKey, setDayKey] = useState(() => getLocalDateKey(new Date()))
  const [tick, setTick] = useState(0)
  const [todayStart, setTodayStart] = useState(() => getStartOfLocalDay())
  const onMidnightRef = useRef(onMidnight)
  const timeoutRef = useRef(null)

  onMidnightRef.current = onMidnight

  const applyMidnight = useCallback(() => {
    const now = new Date()
    const newKey = getLocalDateKey(now)
    const newStart = getStartOfLocalDay(now)

    setDayKey(newKey)
    setTodayStart(newStart)
    setTick(t => t + 1)
    onMidnightRef.current?.(newKey)
  }, [])

  const scheduleNextMidnight = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const delay = getMsUntilNextMidnight()
    timeoutRef.current = setTimeout(() => {
      applyMidnight()
      scheduleNextMidnight()
    }, delay)
  }, [applyMidnight])

  const syncIfDayChanged = useCallback(() => {
    const currentKey = getLocalDateKey(new Date())
    if (currentKey !== dayKey) {
      applyMidnight()
      scheduleNextMidnight()
    }
  }, [dayKey, applyMidnight, scheduleNextMidnight])

  useEffect(() => {
    if (!enabled) return

    scheduleNextMidnight()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncIfDayChanged()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, scheduleNextMidnight, syncIfDayChanged])

  return { dayKey, tick, todayStart }
}
