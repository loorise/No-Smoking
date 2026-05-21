/**
 * Telegram showConfirm (callback или Promise) с fallback на window.confirm.
 * Для UI в приложении предпочтительнее ConfirmDialog.
 */
export function confirmAction(message) {
  const tg = window.Telegram?.WebApp

  if (typeof tg?.showConfirm === 'function') {
    try {
      const maybePromise = tg.showConfirm(message)
      if (maybePromise != null && typeof maybePromise.then === 'function') {
        return maybePromise.then(ok => Boolean(ok))
      }
    } catch {
      /* callback API below */
    }

    return new Promise(resolve => {
      let settled = false
      const finish = ok => {
        if (settled) return
        settled = true
        resolve(Boolean(ok))
      }

      try {
        tg.showConfirm(message, finish)
      } catch {
        finish(window.confirm(message))
      }
    })
  }

  return Promise.resolve(window.confirm(message))
}
