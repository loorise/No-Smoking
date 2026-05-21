import { supabase } from './supabase.js'
import { getLocalDateKey, getStartOfLocalDay } from './localDate.js'

const TABLE = 'smoking_events'

function normalizeRow(row) {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    timestamp: Number(row.timestamp),
    duration: Number(row.duration ?? 0),
  }
}

export function getUserId(telegramUserId) {
  return String(telegramUserId)
}

export async function getLastEvent(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, user_id, timestamp, duration')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? normalizeRow(data) : null
}

export async function getTodayEvents(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, user_id, timestamp, duration')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })

  if (error) throw new Error(error.message)

  const todayKey = getLocalDateKey(new Date())
  return (data ?? [])
    .map(normalizeRow)
    .filter(e => getLocalDateKey(new Date(e.timestamp)) === todayKey)
}

export async function getRecentEvents(userId, limit = 5) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, user_id, timestamp, duration')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map(normalizeRow)
}

export async function addSmokingEvent(userId) {
  const now = Date.now()
  const last = await getLastEvent(userId)
  const anchor = last?.timestamp ?? getStartOfLocalDay()
  const duration = Math.floor((now - anchor) / 1000)

  const event = {
    id: now,
    user_id: userId,
    timestamp: now,
    duration,
  }

  const { error } = await supabase.from(TABLE).upsert(event, { onConflict: 'id' })

  if (error) throw new Error(error.message)

  return normalizeRow(event)
}

export function getElapsedSeconds(lastEvent) {
  const anchor = lastEvent?.timestamp ?? getStartOfLocalDay()
  return Math.max(0, Math.floor((Date.now() - anchor) / 1000))
}
