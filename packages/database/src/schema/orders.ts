// ===== packages/database/src/schema/orders.ts =====
import { pgTable, uuid, bigint, smallint, date, index } from 'drizzle-orm/pg-core'
import { pharmacy } from './pharmacy'
import { internalProduct } from './products'

export const order = pgTable('data_order', {
  id: uuid('id').primaryKey().notNull(),
  internalId: bigint('internal_id', { mode: 'number' }).notNull(),
  step: smallint('step').notNull(),
  sentDate: date('sent_date'),
  deliveryDate: date('delivery_date'),
  pharmacyId: uuid('pharmacy_id').notNull().references(() => pharmacy.id)
}, (table) => ({
  // Index pour suivi commandes par pharmacie
  pharmacyStepIdx: index('idx_order_pharmacy_step').on(table.pharmacyId, table.step),
  pharmacyDateIdx: index('idx_order_pharmacy_date').on(table.pharmacyId, table.sentDate),
  deliveryDateIdx: index('idx_order_delivery_date').on(table.deliveryDate)
}))

export const productOrder = pgTable('data_productorder', {
  id: uuid('id').primaryKey().notNull(),
  qte: smallint('qte').notNull(),
  qteR: smallint('qte_r'),
  qteA: smallint('qte_a'),  
  qteUg: smallint('qte_ug'),
  orderId: uuid('order_id').notNull().references(() => order.id),
  productId: uuid('product_id').notNull().references(() => internalProduct.id)
}, (table) => ({
  // Index pour analyses commandes
  orderProductIdx: index('idx_productorder_order_product').on(table.orderId, table.productId),
  productIdx: index('idx_productorder_product').on(table.productId)
}))