import { createClient } from '@supabase/supabase-js'
import { waitForUserId } from './telegramAuth'

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

export async function addSmokingEvent(event) {
  if (!supabase) {
    return { ok: false, error: 'not_configured' }
  }

  const userId = await waitForUserId({ maxWaitMs: 3000 })
  if (!userId) {
    return { ok: false, error: 'no_user_id' }
  }

  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        id: event.id,
        user_id: userId,
        timestamp: event.timestamp,
        duration: event.duration ?? 0,
      },
      { onConflict: 'id' },
    )

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, userId }
  } catch (err) {
    return { ok: false, error: err?.message ?? 'unknown_error' }
  }
}

export async function getLastSmokingEvent() {
  if (!supabase) {
    return { ok: false, event: null, error: 'not_configured' }
  }

  const userId = await waitForUserId({ maxWaitMs: 5000 })
  if (!userId) {
    return { ok: false, event: null, error: 'no_user_id' }
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, timestamp, duration')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return { ok: false, event: null, error: error.message }
    }

    return {
      ok: true,
      event: data ? normalizeEvent(data) : null,
      userId,
    }
  } catch (err) {
    return {
      ok: false,
      event: null,
      error: err?.message ?? 'unknown_error',
    }
  }
}

export async function getSmokingEvents() {
  if (!supabase) {
    return { ok: false, events: [], error: 'not_configured' }
  }

  const userId = await waitForUserId({ maxWaitMs: 5000 })
  if (!userId) {
    return { ok: false, events: [], error: 'no_user_id' }
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, timestamp, duration')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })

    if (error) {
      return { ok: false, events: [], error: error.message }
    }

    return {
      ok: true,
      events: (data ?? []).map(normalizeEvent),
      userId,
    }
  } catch (err) {
    return {
      ok: false,
      events: [],
      error: err?.message ?? 'unknown_error',
    }
  }
}
