// ===== packages/database/src/schema/inventory.ts =====
import { pgTable, bigint, date, smallint, numeric, uuid, index } from 'drizzle-orm/pg-core'
import { internalProduct } from './products'
import { sql } from 'drizzle-orm'

export const inventorySnapshot = pgTable('data_inventorysnapshot', {
  id: bigint('id', { mode: 'number' }).primaryKey().notNull(),
  date: date('date').notNull(),
  stock: smallint('stock').notNull().default(0),
  priceWithTax: numeric('price_with_tax', { precision: 10, scale: 2 }).notNull(),
  weightedAveragePrice: numeric('weighted_average_price', { precision: 10, scale: 2 }),
  productId: uuid('product_id').notNull().references(() => internalProduct.id)
}, (table) => ({
  // Index composite CRITIQUE pour performance KPIs
  productDateIdx: index('idx_inventorysnapshot_product_date').on(table.productId, table.date),
  dateIdx: index('idx_inventorysnapshot_date').on(table.date),
  // Index partiel pour stocks non-zéro (optimisation)
  stockNonZeroIdx: index('idx_inventorysnapshot_stock_nonzero')
    .on(table.productId, table.date)
    .where(sql`stock > 0`)
}))
