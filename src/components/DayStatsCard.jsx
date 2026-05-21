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

export default function DayStatsCard({ stats }) {
  const cigaretteLabel =
    stats.count === 1
      ? 'сигарета'
      : stats.count >= 2 && stats.count <= 4
        ? 'сигареты'
        : 'сигарет'

  return (
    <section className="day-stats-card" aria-label="Статистика за день">
      <h3 className="stats-card-title">Статистика за день</h3>
      <div className="stats-grid">
        <StatItem label="Сигарет" value={stats.count} highlight />
        <StatItem label="Средний интервал" value={formatInterval(stats.avgInterval)} />
        <StatItem label="Макс. без сигарет" value={formatInterval(stats.maxInterval)} />
        <StatItem label="Всего без сигарет" value={formatInterval(stats.totalSmokeFree)} />
      </div>
      <p className="stats-card-foot">
        {stats.count > 0
          ? `${stats.count} ${cigaretteLabel} за выбранный день`
          : 'Чистый день — без записей'}
      </p>
    </section>
  )
}
