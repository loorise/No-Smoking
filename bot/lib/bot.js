import { Telegraf } from 'telegraf'
import { config } from './config.js'
import { mainKeyboard, ACTIONS } from './keyboard.js'
import {
  getUserId,
  addSmokingEvent,
  getLastEvent,
  getElapsedSeconds,
  getTodayEvents,
  getRecentEvents,
} from './events.js'
import { formatInterval, formatSmokeDateTime } from './format.js'

function pluralizeCigarettes(count) {
  const n = count % 100
  const n10 = count % 10
  if (n10 === 1 && n !== 11) return 'сигарета'
  if (n10 >= 2 && n10 <= 4 && (n < 10 || n >= 20)) return 'сигареты'
  return 'сигарет'
}

async function withLoading(ctx, fn) {
  await ctx.answerCbQuery()
  try {
    await fn()
  } catch (err) {
    console.error('[bot] handler error:', err)
    await ctx.reply('Не удалось выполнить действие. Попробуйте позже.', mainKeyboard())
  }
}

export function createBot() {
  const bot = new Telegraf(config.botToken)

  bot.catch((err, ctx) => {
    console.error('[bot] unhandled error:', err?.message ?? err, {
      updateType: ctx.updateType,
      userId: ctx.from?.id,
    })
  })

  bot.start(async ctx => {
    await ctx.reply('Бот запущен', mainKeyboard())
  })

  bot.command('menu', async ctx => {
    await ctx.reply('Меню', mainKeyboard())
  })

  bot.action(ACTIONS.SMOKE, async ctx => {
    await withLoading(ctx, async () => {
      const userId = getUserId(ctx.from.id)
      await addSmokingEvent(userId)
      await ctx.reply('История обновлена', mainKeyboard())
    })
  })

  bot.action(ACTIONS.ELAPSED, async ctx => {
    await withLoading(ctx, async () => {
      const userId = getUserId(ctx.from.id)
      const last = await getLastEvent(userId)
      const elapsed = getElapsedSeconds(last)

      const text = last
        ? `⏱ Без сигарет: ${formatInterval(elapsed)}\n\nПоследняя запись:\n${formatSmokeDateTime(last.timestamp)}`
        : `⏱ Без сигарет: ${formatInterval(elapsed)}\n\nЗаписей пока нет — отсчёт с начала дня.`

      await ctx.reply(text, mainKeyboard())
    })
  })

  bot.action(ACTIONS.HISTORY, async ctx => {
    await withLoading(ctx, async () => {
      const userId = getUserId(ctx.from.id)
      const today = await getTodayEvents(userId)
      const recent = await getRecentEvents(userId, 5)

      const count = today.length
      const header = `📜 Сегодня: ${count} ${pluralizeCigarettes(count)}`

      if (recent.length === 0) {
        await ctx.reply(`${header}\n\nЗаписей пока нет.`, mainKeyboard())
        return
      }

      const lines = recent.map((e, i) => {
        const n = recent.length - i
        return `${n}. Покурил — ${formatSmokeDateTime(e.timestamp)}\n   ${formatInterval(e.duration)}`
      })

      await ctx.reply(`${header}\n\nПоследние события:\n\n${lines.join('\n\n')}`, mainKeyboard())
    })
  })

  return bot
}
