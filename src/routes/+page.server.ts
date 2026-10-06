import { asc } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { colaboradores } from '#lib/server/db/schema.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const lista = await db.query.colaboradores.findMany({
		columns: { foto: false },
		with: { equipos: true },
		orderBy: asc(colaboradores.nombre)
	});
	return { colaboradores: lista };
};
