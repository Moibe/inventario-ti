import Database from 'better-sqlite3';
import { randomBytes, scryptSync } from 'node:crypto';

// Crea SOLO la cuenta de superadmin inicial. Idempotente: si ya hay cuentas no
// hace nada, así que puede correr en cada despliegue sin riesgo.
const url = process.env.DATABASE_URL ?? './local.db';
const db = new Database(url);

const usuario = process.env.ADMIN_USER ?? 'admin';
const contrasena = process.env.ADMIN_PASSWORD ?? 'admin';

// Mismo formato scrypt "sal:hash" que src/lib/server/auth.ts.
const hash = (pw) => {
	const sal = randomBytes(16);
	return `${sal.toString('hex')}:${scryptSync(pw, sal, 64).toString('hex')}`;
};

if (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n === 0) {
	db.prepare('INSERT INTO usuarios (usuario, contrasena_hash, es_admin) VALUES (?, ?, 1)').run(
		usuario,
		hash(contrasena)
	);
	const aviso =
		process.env.ADMIN_PASSWORD
			? '(la contraseña vino de ADMIN_PASSWORD)'
			: '· CÁMBIALA AL ENTRAR, es la de por defecto';
	console.log(`Superadmin creado → usuario: ${usuario} · contraseña: ${contrasena} ${aviso}`);
} else {
	console.log('Ya hay cuentas; no se creó ninguna.');
}

db.close();
