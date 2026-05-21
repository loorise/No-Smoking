import { useEffect } from 'react'
import { motion, useAnimationControls, AnimatePresence } from 'framer-motion'
import AnimatedTimePart from '../components/AnimatedTimePart'
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

const TIMER_GLOW = {
  danger: [
    '0 0 24px var(--accent-glow), 0 0 48px var(--accent-soft)',
    '0 0 32px var(--accent-glow), 0 0 64px var(--accent-soft)',
    '0 0 24px var(--accent-glow), 0 0 48px var(--accent-soft)',
  ],
  warning: [
    '0 0 20px rgba(255, 179, 71, 0.25), 0 0 40px var(--amber-soft)',
    '0 0 28px rgba(255, 179, 71, 0.35), 0 0 56px var(--amber-soft)',
    '0 0 20px rgba(255, 179, 71, 0.25), 0 0 40px var(--amber-soft)',
  ],
  good: [
    '0 0 20px rgba(93, 223, 138, 0.2), 0 0 40px var(--good-soft)',
    '0 0 28px rgba(93, 223, 138, 0.3), 0 0 56px var(--good-soft)',
    '0 0 20px rgba(93, 223, 138, 0.2), 0 0 40px var(--good-soft)',
  ],
}

export default function Home({ elapsed, reset, getTodayCount, dayKey }) {
  const count = getTodayCount()
  const [hh, mm, ss] = formatTime(elapsed)
  const timerClass = getTimerClass(elapsed)
  const pulseControls = useAnimationControls()

  useEffect(() => {
    pulseControls.start({
      scale: [1, 1.012, 1],
      transition: { duration: 0.38, ease: 'easeOut' },
    })
  }, [elapsed, pulseControls])

  const handleReset = () => {
    reset()
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {}
  }

  return (
    <div className="home">
      <motion.div
        className="home-ambient"
        aria-hidden
        animate={{ opacity: [0.55, 0.85, 0.55], scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="home-header">
        <div className="smoke-label">сигарет сегодня</div>
        <div className="smoke-count">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${dayKey}-${count}`}
              className="count-number"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {count}
            </motion.span>
          </AnimatePresence>
          <span className="count-unit">шт</span>
        </div>
      </div>

      <div className="timer-section">
        <div className="timer-label">без сигарет</div>
        <div className={`timer-display ${timerClass}`}>
          <motion.div
            className="timer-glow-ring"
            aria-hidden
            animate={{
              boxShadow: TIMER_GLOW[timerClass],
              opacity: [0.35, 0.6, 0.35],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="timer-digits"
            animate={{
              textShadow: TIMER_GLOW[timerClass],
            }}
            transition={{
              textShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <motion.div className="timer-digits-row" animate={pulseControls}>
            <AnimatedTimePart value={hh} />
            <motion.span
              className="time-colon"
              animate={{ opacity: [0.35, 0.15, 0.35] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            >
              :
            </motion.span>
            <AnimatedTimePart value={mm} />
            <motion.span
              className="time-colon"
              animate={{ opacity: [0.35, 0.15, 0.35] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
            >
              :
            </motion.span>
            <AnimatedTimePart value={ss} />
            </motion.div>
          </motion.div>
        </div>
        <div className="timer-status">
          <AnimatePresence mode="wait">
            {timerClass === 'danger' && (
              <motion.span
                key="danger"
                className="status-text danger"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                держись!
              </motion.span>
            )}
            {timerClass === 'warning' && (
              <motion.span
                key="warning"
                className="status-text warning"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                молодец
              </motion.span>
            )}
            {timerClass === 'good' && (
              <motion.span
                key="good"
                className="status-text good"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                отличный результат
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="button-section">
        <motion.button
          className="reset-btn"
          onClick={handleReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          animate={{
            boxShadow: [
              'var(--btn-shadow)',
              '0 8px 36px var(--accent-glow), 0 4px 20px var(--accent-soft), var(--btn-shadow)',
              'var(--btn-shadow)',
            ],
          }}
          transition={{
            boxShadow: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
            scale: { type: 'spring', stiffness: 420, damping: 22 },
          }}
        >
          <motion.span
            className="btn-glow"
            aria-hidden
            animate={{ opacity: [0.4, 0.75, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="btn-content">
            <span className="btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V3m0 2a7 7 0 110 14A7 7 0 0112 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 3L9.5 5.5M12 3l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="btn-label">Покурил</span>
          </span>
        </motion.button>
        <p className="btn-hint">нажми, чтобы сбросить таймер</p>
      </div>
    </div>
  )
}
