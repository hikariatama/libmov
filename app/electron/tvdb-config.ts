import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })

export const tvdbApiKey = process.env.TVDB_API_KEY?.trim() ?? ''
