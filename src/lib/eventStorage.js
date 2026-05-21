import { isSupabaseConfigured } from './supabase'

/** Legacy key — не читаем при активном Supabase */
export const LEGACY_EVENTS_KEY = 'smoke_tracker_events'
const OFFLINE_CACHE_KEY = 'smoke_offline_cache'
export const LEGACY_TIMER_KEY = 'smoke_timer_start'

/** Удалить устаревшие ключи после перехода на Supabase */
export function clearLegacyStorage() {
  try {
    localStorage.removeItem(LEGACY_EVENTS_KEY)
    localStorage.removeItem(LEGACY_TIMER_KEY)
  } catch {}
}

function parseEvents(raw) {
  if (!raw) return []
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

/** Только offline-режим (Supabase не настроен) */
export function loadOfflineEvents() {
  try {
    return parseEvents(localStorage.getItem(LEGACY_EVENTS_KEY))
  } catch {
    return []
  }
}

export function saveOfflineEvents(events) {
  try {
    localStorage.setItem(LEGACY_EVENTS_KEY, JSON.stringify(events))
  } catch {}
}

/** Кэш последнего успешного ответа Supabase — только fallback при сетевой ошибке */
export function loadOfflineCache() {
  if (!isSupabaseConfigured) return loadOfflineEvents()
  try {
    return parseEvents(localStorage.getItem(OFFLINE_CACHE_KEY))
  } catch {
    return []
  }
}

export function saveOfflineCache(events) {
  if (!isSupabaseConfigured) {
    saveOfflineEvents(events)
    return
  }
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(events))
  } catch {}
}
