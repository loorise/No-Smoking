import { motion } from 'framer-motion'
import { formatInterval } from '../utils/dayStats'
import './DayStatsCard.css'

function StatItem({ label, value, highlight }) {
  return (
    <div className={`stats-item ${highlight ? 'highlight' : ''}`}>
      <span className="stats-value">{value}</span>
      <span className="stats-label">{label}</span>
    </div>
  )
}

export default function DayStatsCard({ stats, dayKey }) {
  const cigaretteLabel =
    stats.count === 1
      ? 'сигарета'
      : stats.count >= 2 && stats.count <= 4
        ? 'сигареты'
        : 'сигарет'

  return (
    <motion.section
      key={dayKey}
      className="day-stats-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      aria-label="Статистика за день"
    >
      <div className="stats-card-glow" aria-hidden />
      <h3 className="stats-card-title">Статистика за день</h3>
      <div className="stats-grid">
        <StatItem
          label="Сигарет"
          value={stats.count}
          highlight
        />
        <StatItem
          label="Средний интервал"
          value={formatInterval(stats.avgInterval)}
        />
        <StatItem
          label="Макс. без сигарет"
          value={formatInterval(stats.maxInterval)}
        />
        <StatItem
          label="Всего без сигарет"
          value={formatInterval(stats.totalSmokeFree)}
        />
      </div>
      <p className="stats-card-foot">
        {stats.count > 0
          ? `${stats.count} ${cigaretteLabel} за выбранный день`
          : 'Чистый день — без записей'}
      </p>
    </motion.section>
  )
}
