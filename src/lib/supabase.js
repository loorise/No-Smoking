import { createClient } from '@supabase/supabase-js'
import { getUserId, waitForUserId } from './telegramAuth'
import { sortEventsByTimestamp } from '../utils/timer'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

const TABLE = 'smoking_events'

function normalizeEvent(row) {
  return {
    id: Number(row.id),
    timestamp: Number(row.timestamp),
    duration: Number(row.duration ?? 0),
  }
}

async function resolveSupabaseUserId(maxWaitMs = 15000) {
  return waitForUserId({ maxWaitMs, intervalMs: 100 })
  // Если null — вызывающий код вернёт { ok: false, error: 'no_user_id' }
  // Никакого fallback на test_user
}

export async function fetchEvents() {
  if (!supabase) {
    return { ok: false, events: [], error: 'not_configured', userId: null }
  }

  const userId = await resolveSupabaseUserId(15000)
  if (!userId) {
    return { ok: false, events: [], error: 'no_user_id', userId: null }
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, timestamp, duration')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })

    if (error) {
      return { ok: false, events: [], error: error.message, userId }
    }

    const events = sortEventsByTimestamp((data ?? []).map(normalizeEvent))

    return { ok: true, events, userId }
  } catch (err) {
    return {
      ok: false,
      events: [],
      error: err?.message ?? 'unknown_error',
      userId,
    }
  }
}

/** @deprecated use fetchEvents */
export const getSmokingEvents = fetchEvents

export async function addSmokingEvent(event) {
  if (!supabase) {
    return { ok: false, error: 'not_configured' }
  }

  const userId = await resolveSupabaseUserId(10000)
  if (!userId) {
    return { ok: false, error: 'no_user_id' }
  }

  try {
    const { error } = await supabase.from(TABLE).insert({
  id: event.id,
  user_id: userId,
  timestamp: event.timestamp,
  duration: event.duration ?? 0,
})

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, userId }
  } catch (err) {
    return { ok: false, error: err?.message ?? 'unknown_error' }
  }
}

export async function deleteSmokingEvent(eventId) {
  if (!supabase) {
    return { ok: false, error: 'not_configured' }
  }

  const userId = await resolveSupabaseUserId(10000)
  if (!userId) {
    return { ok: false, error: 'no_user_id' }
  }

  try {
    const id = Number(eventId)
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')

    if (error) {
      return { ok: false, error: error.message, userId }
    }

    if (!data?.length) {
      return { ok: false, error: 'not_found_or_policy_denied', userId }
    }

    console.log('[smoke] delete success id', id, 'user', userId)
    return { ok: true, userId, deletedId: id }
  } catch (err) {
    return { ok: false, error: err?.message ?? 'unknown_error', userId }
  }
}

export async function getLastSmokingEvent() {
  const result = await fetchEvents()
  if (!result.ok) {
    return { ok: false, event: null, error: result.error }
  }

  const latest = result.events[result.events.length - 1] ?? null
  return { ok: true, event: latest, userId: result.userId }
}
