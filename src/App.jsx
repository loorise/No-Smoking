import { useState, useCallback } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useSmoke } from './hooks/useSmoke'
import { useMidnightReset } from './hooks/useMidnightReset'
import { useTheme } from './hooks/useTheme'
import { getStartOfLocalDay } from './utils/localDate'
import PageTransition from './components/PageTransition'
import Home from './pages/Home'
import History from './pages/History'
import './App.css'

export default function App() {
  useTheme()
  const location = useLocation()

  const [selectedDate, setSelectedDate] = useState(() => getStartOfLocalDay())

  const onMidnight = useCallback(() => {
    setSelectedDate(getStartOfLocalDay())
  }, [])

  const { dayKey, tick } = useMidnightReset({ onMidnight })

  const smokeCtx = useSmoke({ midnightTick: tick, todayDayKey: dayKey })

  return (
    <div className="app">
      <div className="page-container">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <Home {...smokeCtx} dayKey={dayKey} />
                </PageTransition>
              }
            />
            <Route
              path="/history"
              element={
                <PageTransition>
                  <History
                    {...smokeCtx}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    dayKey={dayKey}
                    midnightTick={tick}
                  />
                </PageTransition>
              }
            />
          </Routes>
        </AnimatePresence>
      </div>

      <nav className="tab-bar">
        <NavLink to="/" end className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <span className="tab-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="tab-label">Главная</span>
        </NavLink>

        <NavLink to="/history" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <span className="tab-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="tab-label">История</span>
        </NavLink>
      </nav>
    </div>
  )
}
