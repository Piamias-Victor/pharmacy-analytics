import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema/index.ts',
  out: './src/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  },
  verbose: true,
  strict: true
} satisfies Config