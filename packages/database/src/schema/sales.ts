// ===== packages/database/src/schema/sales.ts =====
import { sql } from 'drizzle-orm'
import { pgTable, bigint, smallint, date, index } from 'drizzle-orm/pg-core'

export const sales = pgTable('data_sales', {
  id: bigint('id', { mode: 'number' }).primaryKey().notNull(),
  quantity: smallint('quantity').notNull(),
  date: date('date').notNull(),
  productId: bigint('product_id', { mode: 'number' }).notNull()
}, (table) => ({
  // Index SUPER CRITIQUES pour les KPIs CA/Marge
  productDateIdx: index('idx_sales_product_date').on(table.productId, table.date),
  dateIdx: index('idx_sales_date').on(table.date),
  // Index pour agrégations temporelles
  dateQuantityIdx: index('idx_sales_date_quantity').on(table.date, table.quantity),
  // Index récent pour queries fréquentes (90 derniers jours)
  recentSalesIdx: index('idx_sales_recent')
    .on(table.productId, table.date, table.quantity)
    .where(sql`date >= CURRENT_DATE - INTERVAL '90 days'`)
}))