import { pgTable, uuid, varchar, numeric, integer, text, index } from 'drizzle-orm/pg-core'

export const pharmacy = pgTable('data_pharmacy', {
  id: uuid('id').primaryKey().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  ca: numeric('ca', { precision: 12, scale: 2 }),
  area: varchar('area', { length: 100 }),
  employeesCount: integer('employees_count'),
  address: text('address')
}, (table) => ({
  // Index pour optimiser les requêtes de recherche
  nameIdx: index('idx_pharmacy_name').on(table.name),
  areaIdx: index('idx_pharmacy_area').on(table.area)
}))