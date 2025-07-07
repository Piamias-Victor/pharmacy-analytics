import { pgTable, uuid, varchar, bigint, numeric, index } from 'drizzle-orm/pg-core'
import { pharmacy } from './pharmacy'

// Table produits globaux (référentiel)
export const globalProduct = pgTable('data_globalproduct', {
  code13Ref: varchar('code_13_ref', { length: 13 }).primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  universe: varchar('universe', { length: 100 }),
  category: varchar('category', { length: 100 }),
  brandLab: varchar('brand_lab', { length: 255 }),
  tvaPercentage: numeric('tva_percentage', { precision: 5, scale: 2 })
}, (table) => ({
  // Index critiques pour les KPIs
  categoryIdx: index('idx_globalproduct_category').on(table.category),
  universeIdx: index('idx_globalproduct_universe').on(table.universe),
  brandLabIdx: index('idx_globalproduct_brand_lab').on(table.brandLab),
  nameIdx: index('idx_globalproduct_name').on(table.name)
}))

// Table produits internes par pharmacie
export const internalProduct = pgTable('data_internalproduct', {
  id: uuid('id').primaryKey().notNull(),
  internalId: bigint('internal_id', { mode: 'number' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  pharmacyId: uuid('pharmacy_id').notNull().references(() => pharmacy.id),
  code13RefId: varchar('code_13_ref_id', { length: 13 }).references(() => globalProduct.code13Ref)
}, (table) => ({
  // Index composites cruciaux pour performance
  pharmacyProductIdx: index('idx_internalproduct_pharmacy_code').on(table.pharmacyId, table.code13RefId),
  pharmacyIdx: index('idx_internalproduct_pharmacy').on(table.pharmacyId),
  internalIdIdx: index('idx_internalproduct_internal_id').on(table.internalId)
}))