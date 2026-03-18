// backend/src/config/index.ts
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../../.env') })

interface Config {
  port: number
  nodeEnv: string
  databaseUrl: string
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey: string
  jwtSecret: string
  jwtExpiry: string
  frontendUrl: string
  sendgridApiKey: string
  sendgridFromEmail: string
  maxFileSize: number
  uploadPath: string
}

function getEnvVar(name: string, required: boolean = true): string {
  const value = process.env[name]
  if (required && !value) {
    throw new Error(`Environment variable ${name} is required but not set`)
  }
  return value || ''
}

export const config: Config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: getEnvVar('DATABASE_URL'),
  supabaseUrl: getEnvVar('SUPABASE_URL', false),
  supabaseAnonKey: getEnvVar('SUPABASE_ANON_KEY', false),
  supabaseServiceKey: getEnvVar('SUPABASE_SERVICE_KEY', false),
  jwtSecret: getEnvVar('JWT_SECRET'),
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  sendgridApiKey: getEnvVar('SENDGRID_API_KEY', false),
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@dmif.org',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  uploadPath: process.env.UPLOAD_PATH || './uploads',
}

export default config