import './Home.css'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ]
}

function getTimerClass(elapsed) {
  if (elapsed < 1800) return 'danger'
  if (elapsed < 3600) return 'warning'
  return 'good'
}

export default function Home({ elapsed, isHydrated, reset, getTodayCount, dayKey }) {
  const count = getTodayCount()
  const displayElapsed = isHydrated ? elapsed : 0
  const [hh, mm, ss] = formatTime(displayElapsed)
  const timerClass = isHydrated ? getTimerClass(displayElapsed) : 'good'

  const handleReset = () => {
    reset()
  }

  return (
    <div className="home">
      <header className="home-header">
        <p className="smoke-label">сигарет сегодня</p>
        <div className="smoke-count">
          <span className="count-number" key={`${dayKey}-${count}`}>
            {count}
          </span>
          <span className="count-unit">шт</span>
        </div>
      </header>

      <section className="timer-section">
        <p className="timer-label">без сигарет</p>
        <div className={`timer-display ${timerClass}`} aria-live="polite">
          <span className="time-part">{hh}</span>
          <span className="time-colon">:</span>
          <span className="time-part">{mm}</span>
          <span className="time-colon">:</span>
          <span className="time-part">{ss}</span>
        </div>
        <div className="timer-status">
          {timerClass === 'danger' && (
            <span className="status-text danger">держись!</span>
          )}
          {timerClass === 'warning' && (
            <span className="status-text warning">молодец</span>
          )}
          {timerClass === 'good' && (
            <span className="status-text good">отличный результат</span>
          )}
        </div>
      </section>

      <section className="button-section">
        <button type="button" className="reset-btn" onClick={handleReset}>
          <span className="btn-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V3m0 2a7 7 0 110 14A7 7 0 0112 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 3L9.5 5.5M12 3l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="btn-label">Покурил</span>
        </button>
        <p className="btn-hint">нажми, чтобы сбросить таймер</p>
      </section>
    </div>
  )
}
