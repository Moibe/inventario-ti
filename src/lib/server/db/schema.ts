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

// ── Cuentas ─────────────────────────────────────────────────────────────────
// Mismo patrón que shape_up: scrypt para la contraseña, la sesión vive como el
// SHA-256 de su token, y una cuenta nueva no tiene contraseña hasta que la
// persona la activa con su invitación.
export const usuarios = sqliteTable('usuarios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	usuario: text('usuario').notNull().unique(),
	// scrypt guardado como "salHex:hashHex". NULL mientras no activa su cuenta.
	contrasenaHash: text('contrasena_hash'),
	// El superadmin administra cuentas y descarga los Excel que envían los demás.
	esAdmin: integer('es_admin', { mode: 'boolean' }).notNull().default(false),
	creadoEn: integer('creado_en', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const sesiones = sqliteTable('sesiones', {
	// SHA-256 del token; el token crudo solo existe en la cookie.
	id: text('id').primaryKey(),
	usuarioId: integer('usuario_id')
		.notNull()
		.references(() => usuarios.id, { onDelete: 'cascade' }),
	expiraEn: integer('expira_en').notNull() // unix ms
});

// Liga de un solo uso para que la persona ponga su propia contraseña.
export const invitaciones = sqliteTable('invitaciones', {
	id: text('id').primaryKey(),
	usuarioId: integer('usuario_id')
		.notNull()
		.references(() => usuarios.id, { onDelete: 'cascade' }),
	expiraEn: integer('expira_en').notNull()
});

// ── Excel que manda el capturista a TI ──────────────────────────────────────
// Por ahora el archivo solo se guarda y lo descarga el superadmin; nadie lo lee
// ni lo convierte en colaboradores todavía.
export const envios = sqliteTable('envios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	// Nombre en disco (uuid + extensión) y el nombre original de quien lo mandó.
	archivo: text('archivo').notNull(),
	nombre: text('nombre').notNull(),
	bytes: integer('bytes').notNull(),
	enviadoPor: integer('enviado_por').references(() => usuarios.id, { onDelete: 'set null' }),
	creadoEn: integer('creado_en', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const enviosRelations = relations(envios, ({ one }) => ({
	usuario: one(usuarios, { fields: [envios.enviadoPor], references: [usuarios.id] })
}));

export const colaboradoresRelations = relations(colaboradores, ({ many }) => ({
	equipos: many(equipos)
}));

export const equiposRelations = relations(equipos, ({ one }) => ({
	colaborador: one(colaboradores, {
		fields: [equipos.colaboradorId],
		references: [colaboradores.id]
	})
}));
