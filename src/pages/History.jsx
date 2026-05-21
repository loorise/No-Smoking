import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLocalDateKey } from '../hooks/useSmoke'
import { getStartOfLocalDay } from '../utils/localDate'
import { calcDayStats } from '../utils/dayStats'
import DayStatsCard from '../components/DayStatsCard'
import './History.css'

function formatDate(date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (target.getTime() === today.getTime()) return 'Сегодня'
  if (target.getTime() === yesterday.getTime()) return 'Вчера'

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function formatSmokeDateTime(ts) {
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

function pluralize(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

function formatDuration(seconds) {
  const total = Math.max(0, seconds ?? 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const hoursWord = pluralize(h, 'час', 'часа', 'часов')
  const minutesWord = pluralize(m, 'минута', 'минуты', 'минут')
  return `Ты продержался ${h} ${hoursWord} ${m} ${minutesWord}`
}

export default function History({
  events: allEvents = [],
  selectedDate,
  setSelectedDate,
  midnightTick = 0,
}) {
  const currentDate = selectedDate

  const events = useMemo(() => {
    const key = getLocalDateKey(currentDate)
    return allEvents
      .filter(e => getLocalDateKey(new Date(e.timestamp)) === key)
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [allEvents, currentDate, midnightTick])

  const dayKey = getLocalDateKey(currentDate)
  const isToday = formatDate(currentDate) === 'Сегодня'
  const canGoForward = !isToday

  const dayStats = useMemo(
    () => calcDayStats(events, currentDate),
    [events, currentDate, midnightTick],
  )

  const goBack = () => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }

  const goForward = () => {
    if (canGoForward) {
      setSelectedDate(prev => {
        const d = new Date(prev)
        d.setDate(d.getDate() + 1)
        return d
      })
    }
  }

  const goToday = () => {
    setSelectedDate(getStartOfLocalDay())
  }

  return (
    <div className="history">
      <div className="day-nav">
        <motion.button
          className="nav-arrow"
          onClick={goBack}
          aria-label="Предыдущий день"
          whileTap={{ scale: 0.9 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>

        <motion.button
          className="day-title"
          onClick={goToday}
          whileTap={{ scale: 0.98 }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={dayKey}
              className="day-name"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {formatDate(currentDate)}
            </motion.span>
          </AnimatePresence>
          {!isToday && (
            <span className="day-return">↩ сегодня</span>
          )}
        </motion.button>

        <motion.button
          className={`nav-arrow ${!canGoForward ? 'disabled' : ''}`}
          onClick={goForward}
          disabled={!canGoForward}
          aria-label="Следующий день"
          whileTap={canGoForward ? { scale: 0.9 } : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </div>

      <div className="day-summary">
        <AnimatePresence mode="wait">
          <motion.span
            key={`${dayKey}-${events.length}`}
            className="summary-count"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.25 }}
          >
            {events.length}
          </motion.span>
        </AnimatePresence>
        <span className="summary-label">
          {events.length === 1 ? 'сигарета' : events.length >= 2 && events.length <= 4 ? 'сигареты' : 'сигарет'}
        </span>
      </div>

      <div className="history-scroll">
        <div className="events-list">
        <AnimatePresence mode="wait">
          {events.length === 0 ? (
            <motion.div
              key={`empty-${dayKey}`}
              className="empty-state"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                  <path d="M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                </svg>
              </div>
              <p className="empty-text">
                {isToday ? 'Ни одной сигареты сегодня' : 'Записей за этот день нет'}
              </p>
              {isToday && <p className="empty-sub">так держать!</p>}
            </motion.div>
          ) : (
            <motion.div
              key={`list-${dayKey}`}
              className="events-list-inner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatePresence mode="popLayout">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    className="event-item"
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(i * 0.04, 0.24),
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    <div className="event-dot" />
                    <div className="event-content">
                      <span className="event-action">
                        Покурил — {formatSmokeDateTime(event.timestamp)}
                      </span>
                      <span className="event-duration">
                        {formatDuration(event.duration)}
                      </span>
                    </div>
                    <span className="event-index">#{events.length - i}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      <footer className="stats-footer">
        <DayStatsCard stats={dayStats} dayKey={`${dayKey}-${midnightTick}`} />
      </footer>
    </div>
  )
}
