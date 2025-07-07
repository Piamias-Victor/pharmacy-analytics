import { relations } from 'drizzle-orm'
import { 
  globalProduct, 
  internalProduct, 
  inventorySnapshot, 
  sales, 
  order, 
  productOrder 
} from './index'
import { pharmacy } from './pharmacy'

// Relations Pharmacy
export const pharmacyRelations = relations(pharmacy, ({ many }) => ({
  internalProducts: many(internalProduct),
  orders: many(order)
}))

// Relations Global Product  
export const globalProductRelations = relations(globalProduct, ({ many }) => ({
  internalProducts: many(internalProduct)
}))

// Relations Internal Product (centrale pour tous les KPIs)
export const internalProductRelations = relations(internalProduct, ({ one, many }) => ({
  pharmacy: one(pharmacy, {
    fields: [internalProduct.pharmacyId],
    references: [pharmacy.id]
  }),
  globalProduct: one(globalProduct, {
    fields: [internalProduct.code13RefId],
    references: [globalProduct.code13Ref]
  }),
  inventorySnapshots: many(inventorySnapshot),
  productOrders: many(productOrder)
}))

// Relations Inventory Snapshot
export const inventorySnapshotRelations = relations(inventorySnapshot, ({ one }) => ({
  internalProduct: one(internalProduct, {
    fields: [inventorySnapshot.productId],
    references: [internalProduct.id]
  })
}))

// Relations Order
export const orderRelations = relations(order, ({ one, many }) => ({
  pharmacy: one(pharmacy, {
    fields: [order.pharmacyId],
    references: [pharmacy.id]
  }),
  productOrders: many(productOrder)
}))

// Relations Product Order
export const productOrderRelations = relations(productOrder, ({ one }) => ({
  order: one(order, {
    fields: [productOrder.orderId],
    references: [order.id]
  }),
  internalProduct: one(internalProduct, {
    fields: [productOrder.productId],
    references: [internalProduct.id]
  })
}))