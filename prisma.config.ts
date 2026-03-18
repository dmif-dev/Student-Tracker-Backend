// backend/prisma.config.ts
import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env file from the correct path
dotenv.config({ path: path.resolve(__dirname, '.env') })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL, // This should now work
  },
})