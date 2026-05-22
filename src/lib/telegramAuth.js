const ANON_USER_KEY = 'smoke_anon_user_id'

function getOrCreateAnonUserId() {
  try {
    const existing = localStorage.getItem(ANON_USER_KEY)
    if (existing) return existing
    const id = 'anon_' + crypto.randomUUID()
    localStorage.setItem(ANON_USER_KEY, id)
    return id
  } catch {
    return null
  }
}
const TG_USER_CACHE_KEY = 'smoke_tg_user_id'
const LEGACY_LOCAL_USER_KEY = 'smoke_tracker_user_id'

export function initTelegramWebApp() {
  const tg = window.Telegram?.WebApp
  if (!tg) return null

  tg.ready()
  tg.expand()

  cacheUserFromInitData(tg)

  if (isTelegramEnv()) {
    try {
      localStorage.removeItem(LEGACY_LOCAL_USER_KEY)
    } catch {}
  }

  return tg
}

function cacheUserFromInitData(tg) {
  const userId = tg?.initDataUnsafe?.user?.id
  if (userId != null) {
    cacheTelegramUserId(String(userId))
  }
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null
}

/** Пользователь из Telegram.WebApp.initDataUnsafe.user */
export function getTelegramUser() {
  const user = getTelegramWebApp()?.initDataUnsafe?.user
  if (!user || user.id == null) return null
  return user
}

/** Приложение открыто внутри Telegram (не браузер) */
export function isTelegramEnv() {
  const tg = getTelegramWebApp()
  if (!tg) return false
  if (typeof tg.initData === 'string' && tg.initData.length > 0) return true
  const platform = tg.platform
  return Boolean(platform && platform !== 'unknown')
}

export function isInTelegram() {
  return isTelegramEnv() && getTelegramUser() !== null
}

function cacheTelegramUserId(id) {
  try {
    sessionStorage.setItem(TG_USER_CACHE_KEY, id)
    localStorage.setItem(TG_USER_CACHE_KEY, id)
  } catch {}
}

function getCachedTelegramUserId() {
  try {
    return sessionStorage.getItem(TG_USER_CACHE_KEY) || localStorage.getItem(TG_USER_CACHE_KEY)
  } catch {
    return null
  }
}

/**
 * Синхронное разрешение user_id.
 * В Telegram — только initDataUnsafe.user.id (или кэш), никогда test_user.
 */
export function resolveUserId() {
  const tgUser = getTelegramUser()
  if (tgUser?.id != null) {
    const id = String(tgUser.id)
    cacheTelegramUserId(id)
    return id
  }

  if (isTelegramEnv()) {
    return getCachedTelegramUserId()
  }

  return null
}

/**
 * user_id для Supabase.
 * Telegram: initDataUnsafe.user.id | кэш
 * Вне Telegram: test_user
 */
export function getUserId() {
  const resolved = resolveUserId()
  if (resolved) return resolved

  // Вне Telegram — анонимный persistent UUID, не test_user
  return getOrCreateAnonUserId()
}

/**
 * Ждёт появления Telegram user id перед синхронизацией с Supabase.
 */
export function waitForUserId({ maxWaitMs = 5000, intervalMs = 100 } = {}) {
  if (!isTelegramEnv()) {
    // Вне Telegram — сразу возвращаем persistent uuid (или null)
    return Promise.resolve(getOrCreateAnonUserId())
  }

  return new Promise(resolve => {
    const deadline = Date.now() + maxWaitMs

    const attempt = () => {
      const tg = getTelegramWebApp()
      cacheUserFromInitData(tg)

      const id = resolveUserId()
      if (id) {
        resolve(id)
        return
      }

      if (Date.now() >= deadline) {
        const cached = getCachedTelegramUserId()
        if (cached) {
          console.warn('[auth] Using cached Telegram user id')
          resolve(cached)
          return
        }
        // В Telegram env без id — не делаем запрос
        console.warn('[auth] Telegram user id not available; sync skipped')
        resolve(null)
        return
      }

      setTimeout(attempt, intervalMs)
    }

    attempt()
  })
}

export function getAuthInfo() {
  const user = getTelegramUser()
  return {
    userId: getUserId(),
    resolvedUserId: resolveUserId(),
    isTelegramEnv: isTelegramEnv(),
    isInTelegram: isInTelegram(),
    cachedUserId: getCachedTelegramUserId(),
    user: user
      ? {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
        }
      : null,
  }
}
