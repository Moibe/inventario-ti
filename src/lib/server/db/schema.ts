import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const colaboradores = sqliteTable('colaboradores', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	// La columna nació como `apellido` y se quedó así; es el apellido paterno.
	apellidoPaterno: text('apellido').notNull().default(''),
	apellidoMaterno: text('apellido_materno').notNull().default(''),
	// Usuario de red / dominio del colaborador.
	usuario: text('usuario').notNull().default(''),
	// Es la "Clave de usuario" del borrador de James.
	numeroEmpleado: text('numero_empleado').notNull().default(''),
	// Teléfonos del colaborador (dato de la persona, no un equipo asignado).
	telefonoMovil: text('telefono_movil').notNull().default(''),
	telefonoFijo: text('telefono_fijo').notNull().default(''),
	area: text('area').notNull().default(''),
	departamento: text('departamento').notNull().default(''),
	puesto: text('puesto').notNull().default(''),
	// Data URL de la foto, ya reducida en el navegador (~30 KB).
	foto: text('foto'),
	// Foto real del equipo principal, reducida igual en el navegador (~100 KB).
	fotoEquipo: text('foto_equipo'),
	// Folio impreso en la responsiva.
	numeroResponsiva: text('numero_responsiva').notNull().default(''),
	// Responsiva escaneada: el archivo vive en disco (ver $lib/server/responsivas);
	// aquí solo el nombre con el que se guardó y el nombre original que subió James.
	responsivaArchivo: text('responsiva_archivo'),
	responsivaNombre: text('responsiva_nombre'),
	creadoEn: integer('creado_en', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// El equipo principal (tipo "CPU" o "Laptop") y los periféricos viven en la misma
// tabla; el principal es el que trae `principal = true` (uno por colaborador).
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
