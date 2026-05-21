import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')

dotenv.config({ path: path.join(rootDir, '.env') })
dotenv.config({ path: path.join(rootDir, 'bot', '.env') })

function requireEnv(name) {
  const value = process.env[name]
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

function env(name, fallbackName) {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

export const config = {
  botToken: requireEnv('BOT_TOKEN'),
  supabaseUrl: env('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  supabaseKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || env('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
}
