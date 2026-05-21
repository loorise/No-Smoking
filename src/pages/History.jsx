import { useMemo, useCallback, useState } from 'react'
import { getLocalDateKey } from '../hooks/useSmoke'
import { getStartOfLocalDay } from '../utils/localDate'
import { calcDayStats } from '../utils/dayStats'
import ConfirmDialog from '../components/ConfirmDialog'
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
  deleteEvent,
  isDeleting = false,
  deleteError = null,
  midnightTick = 0,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [confirmMessage, setConfirmMessage] = useState('')

  const safeSelectedDate = useMemo(() => {
    const d = selectedDate instanceof Date ? selectedDate : new Date(selectedDate)
    return Number.isNaN(d.getTime()) ? getStartOfLocalDay() : d
  }, [selectedDate])

  const events = useMemo(() => {
    const key = getLocalDateKey(safeSelectedDate)
    return allEvents
      .filter(e => getLocalDateKey(new Date(e.timestamp)) === key)
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [allEvents, safeSelectedDate, midnightTick])

  const dayKey = getLocalDateKey(safeSelectedDate)
  const isToday = formatDate(safeSelectedDate) === 'Сегодня'
  const canGoForward = !isToday

  const dayStats = useMemo(
    () => calcDayStats(events, safeSelectedDate),
    [events, safeSelectedDate, midnightTick],
  )

  const goBack = () => {
    if (isDeleting) return
    setSelectedDate(prev => {
      const d = new Date(prev instanceof Date ? prev : safeSelectedDate)
      d.setDate(d.getDate() - 1)
      return d
    })
  }

  const goForward = () => {
    if (!canGoForward || isDeleting) return
    setSelectedDate(prev => {
      const d = new Date(prev instanceof Date ? prev : safeSelectedDate)
      d.setDate(d.getDate() + 1)
      return d
    })
  }

  const goToday = () => {
    if (isDeleting) return
    setSelectedDate(getStartOfLocalDay())
  }

  const openDeleteConfirm = useCallback((event, e) => {
    if (isDeleting) return
    e.preventDefault()
    e.stopPropagation()
    setConfirmId(event.id)
    setConfirmMessage(`Удалить запись от ${formatSmokeDateTime(event.timestamp)}?`)
    setConfirmOpen(true)
  }, [isDeleting])

  const closeDeleteConfirm = useCallback(() => {
    if (!isDeleting) {
      setConfirmOpen(false)
      setConfirmId(null)
      setConfirmMessage('')
    }
  }, [isDeleting])

  const confirmDelete = useCallback(async () => {
    if (!confirmId || !deleteEvent || isDeleting) return

    const id = Number(confirmId)
    const result = await deleteEvent(id)

    setConfirmOpen(false)
    setConfirmId(null)
    setConfirmMessage('')

    if (result.ok) {
      try {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      } catch {}
    }
  }, [confirmId, deleteEvent, isDeleting])

  return (
    <div className="history">
      {deleteError && (
        <p className="history-error" role="alert">
          Не удалось удалить: {deleteError}
        </p>
      )}

      <div className="day-nav">
        <button
          type="button"
          className="nav-arrow"
          onClick={goBack}
          disabled={isDeleting}
          aria-label="Предыдущий день"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <button type="button" className="day-title" onClick={goToday} disabled={isDeleting}>
          <span className="day-name">{formatDate(safeSelectedDate)}</span>
          {!isToday && <span className="day-return">↩ сегодня</span>}
        </button>

        <button
          type="button"
          className={`nav-arrow ${!canGoForward ? 'disabled' : ''}`}
          onClick={goForward}
          disabled={!canGoForward || isDeleting}
          aria-label="Следующий день"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="day-summary">
        <span className="summary-count">{events.length}</span>
        <span className="summary-label">
          {events.length === 1 ? 'сигарета' : events.length >= 2 && events.length <= 4 ? 'сигареты' : 'сигарет'}
        </span>
      </div>

      <div className="history-scroll">
        <div className="events-list">
          {events.length === 0 ? (
            <div className="empty-state">
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
            </div>
          ) : (
            <ul className="events-list-inner">
              {events.map((event, i) => (
                <li key={event.id} className="event-item">
                  <span className="event-dot" aria-hidden />
                  <div className="event-content">
                    <span className="event-action">
                      Покурил — {formatSmokeDateTime(event.timestamp)}
                    </span>
                    <span className="event-duration">
                      {formatDuration(event.duration)}
                    </span>
                  </div>
                  <span className="event-index">#{events.length - i}</span>
                  <button
                    type="button"
                    className="event-delete"
                    onClick={e => openDeleteConfirm(event, e)}
                    disabled={isDeleting}
                    aria-label="Удалить запись"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M9 9h6M10 11v6M14 11v6M6 7h12l-1 14H7L6 7zM9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="stats-footer">
        <DayStatsCard stats={dayStats} />
      </footer>

      <ConfirmDialog
        open={confirmOpen}
        message={confirmMessage}
        confirmLabel={isDeleting ? 'Удаление…' : 'Удалить'}
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      />
    </div>
  )
}
