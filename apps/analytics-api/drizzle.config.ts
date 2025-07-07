// ===== apps/analytics-api/drizzle.config.ts =====
import type { Config } from 'drizzle-kit'

export default {
  schema: '../../packages/database/src/schema/index.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  },
  verbose: true,
  strict: true
} satisfies Config