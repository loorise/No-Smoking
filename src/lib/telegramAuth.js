export const FALLBACK_USER_ID = 'test_user'

export function initTelegramWebApp() {
  const tg = window.Telegram?.WebApp
  if (!tg) return null

  tg.ready()
  tg.expand()
  return tg
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null
}

export function getTelegramUser() {
  const user = getTelegramWebApp()?.initDataUnsafe?.user
  if (!user || user.id == null) return null
  return user
}

export function isInTelegram() {
  return getTelegramUser() !== null
}

/** user_id для Supabase: Telegram user id или test_user вне Telegram */
export function getUserId() {
  const tgUserId = getTelegramUser()?.id
  if (tgUserId != null) return String(tgUserId)
  return FALLBACK_USER_ID
}

export function getAuthInfo() {
  const user = getTelegramUser()
  return {
    userId: getUserId(),
    isTelegram: isInTelegram(),
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
