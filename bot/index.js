import { createBot } from './lib/bot.js'

const bot = createBot()

async function start() {
  await bot.launch()
  console.info('[bot] started (polling)')
}

async function shutdown(signal) {
  console.info(`[bot] shutting down (${signal})`)
  bot.stop(signal)
  process.exit(0)
}

start().catch(err => {
  console.error('[bot] failed to start:', err)
  process.exit(1)
})

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
