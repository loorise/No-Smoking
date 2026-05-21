import { Markup } from 'telegraf'

export const ACTIONS = {
  SMOKE: 'action:smoke',
  ELAPSED: 'action:elapsed',
  HISTORY: 'action:history',
}

export function mainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🚬 Покурил', ACTIONS.SMOKE)],
    [
      Markup.button.callback('⏱ Сколько не курил', ACTIONS.ELAPSED),
      Markup.button.callback('📜 История', ACTIONS.HISTORY),
    ],
  ])
}
