// ===== packages/database/src/index.ts (CORRIGÉ) =====
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// Configuration connection pool identique à votre config qui marche
const poolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: {
    rejectUnauthorized: false // Config SSL qui marche
  },
  
  // Pool optimisé pour production
  max: 20,          // Max 20 connections simultanées
  min: 5,           // Min 5 connections maintenues
  acquireTimeoutMillis: 30000,  // 30s timeout
  createTimeoutMillis: 30000,   // 30s timeout création
  destroyTimeoutMillis: 5000,   // 5s timeout destruction
  reapIntervalMillis: 1000,     // 1s interval cleanup
  createRetryIntervalMillis: 200 // 200ms retry interval
}

// Pool PostgreSQL global
const pool = new Pool(poolConfig)

// Gestion erreurs pool (comme dans votre code)
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Instance Drizzle avec schema complet
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
})

// Export du pool pour usage avancé si nécessaire
export { pool }

// Export de tous les schemas pour usage dans l'app
export * from './schema'

// Types utilitaires pour l'application
export type Database = typeof db