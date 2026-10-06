type Equipo = { principal: boolean; tipo: string; marca: string; modelo: string; serie: string };
type Colaborador = {
	nombre: string;
	area: string;
	departamento: string;
	puesto: string;
	equipos: Equipo[];
};

/** Descarga un CSV (con BOM para que Excel respete los acentos), una fila por equipo. */
export function exportarExcel(colaboradores: Colaborador[], archivo: string) {
	const celda = (v: string) => `"${v.replaceAll('"', '""')}"`;
	const filas = [['Nombre', 'Área', 'Departamento', 'Puesto', 'Tipo', 'Marca', 'Modelo', 'No. Serie']];
	for (const c of colaboradores) {
		const base = [c.nombre, c.area, c.departamento, c.puesto];
		// El CPU primero, luego los periféricos.
		const equipos = [...c.equipos].sort((a, b) => Number(b.principal) - Number(a.principal));
		if (equipos.length === 0) filas.push([...base, '', '', '', '']);
		for (const e of equipos) filas.push([...base, e.tipo, e.marca, e.modelo, e.serie]);
	}
	const csv = '﻿' + filas.map((f) => f.map(celda).join(',')).join('\r\n');
	const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
	const a = document.createElement('a');
	a.href = url;
	a.download = `${archivo}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}
