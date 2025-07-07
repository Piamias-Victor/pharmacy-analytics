import { inventorySnapshot } from './inventory'
import { order, productOrder } from './orders'
import { pharmacy } from './pharmacy'
import { globalProduct, internalProduct } from './products'
import { sales } from './sales'

export * from './products'
export * from './pharmacy'
export * from './inventory'
export * from './sales'
export * from './orders'
export * from './relations'

// Types inférés automatiquement par Drizzle
export type Pharmacy = typeof pharmacy.$inferSelect
export type NewPharmacy = typeof pharmacy.$inferInsert

export type GlobalProduct = typeof globalProduct.$inferSelect
export type NewGlobalProduct = typeof globalProduct.$inferInsert

export type InternalProduct = typeof internalProduct.$inferSelect
export type NewInternalProduct = typeof internalProduct.$inferInsert

export type InventorySnapshot = typeof inventorySnapshot.$inferSelect
export type NewInventorySnapshot = typeof inventorySnapshot.$inferInsert

export type Sales = typeof sales.$inferSelect
export type NewSales = typeof sales.$inferInsert

export type Order = typeof order.$inferSelect
export type NewOrder = typeof order.$inferInsert

export type ProductOrder = typeof productOrder.$inferSelect
export type NewProductOrder = typeof productOrder.$inferInsert
