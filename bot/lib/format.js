function pluralize(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function formatInterval(seconds) {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  if (h === 0 && m === 0) return `${s} ${pluralize(s, 'секунда', 'секунды', 'секунд')}`
  if (h === 0) return `${m} ${pluralize(m, 'минута', 'минуты', 'минут')}`
  if (m === 0) return `${h} ${pluralize(h, 'час', 'часа', 'часов')}`
  return `${h} ${pluralize(h, 'час', 'часа', 'часов')} ${m} ${pluralize(m, 'минута', 'минуты', 'минут')}`
}

export function formatSmokeDateTime(ts) {
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}
