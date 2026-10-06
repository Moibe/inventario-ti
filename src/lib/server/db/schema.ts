import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const colaboradores = sqliteTable('colaboradores', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	area: text('area').notNull().default(''),
	departamento: text('departamento').notNull().default(''),
	puesto: text('puesto').notNull().default(''),
	// Data URL de la foto, ya reducida en el navegador (~30 KB).
	foto: text('foto'),
	creadoEn: integer('creado_en', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// El CPU y los periféricos viven en la misma tabla; el CPU es el que trae
// `principal = true` (uno por colaborador).
export const equipos = sqliteTable('equipos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	colaboradorId: integer('colaborador_id')
		.notNull()
		.references(() => colaboradores.id, { onDelete: 'cascade' }),
	principal: integer('principal', { mode: 'boolean' }).notNull().default(false),
	tipo: text('tipo').notNull().default(''),
	marca: text('marca').notNull().default(''),
	modelo: text('modelo').notNull().default(''),
	serie: text('serie').notNull().default('')
});

export const colaboradoresRelations = relations(colaboradores, ({ many }) => ({
	equipos: many(equipos)
}));

export const equiposRelations = relations(equipos, ({ one }) => ({
	colaborador: one(colaboradores, {
		fields: [equipos.colaboradorId],
		references: [colaboradores.id]
	})
}));
