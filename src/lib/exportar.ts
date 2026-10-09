import { construirXlsx, TIPO_XLSX } from '$lib/xlsx';

type Equipo = { principal: boolean; tipo: string; marca: string; modelo: string; serie: string };
type Colaborador = {
	nombre: string;
	apellidoPaterno: string;
	apellidoMaterno: string;
	usuario: string;
	numeroEmpleado: string;
	telefonoMovil: string;
	telefonoFijo: string;
	area: string;
	departamento: string;
	puesto: string;
	numeroResponsiva: string;
	responsivaArchivo?: string | null;
	equipos: Equipo[];
};

const ENCABEZADOS = [
	'Nombre',
	'Apellido paterno',
	'Apellido materno',
	'Usuario',
	'No. Empleado',
	'Teléfono móvil',
	'Teléfono fijo',
	'Área',
	'Departamento',
	'Puesto',
	'No. Responsiva',
	'Responsiva escaneada',
	'Tipo',
	'Marca',
	'Modelo',
	'No. Serie'
];

/** Una fila por equipo; la primera es el encabezado. */
export function construirFilas(colaboradores: Colaborador[]) {
	const filas = [ENCABEZADOS];
	for (const c of colaboradores) {
		const base = [
			c.nombre,
			c.apellidoPaterno,
			c.apellidoMaterno,
			c.usuario,
			c.numeroEmpleado,
			c.telefonoMovil,
			c.telefonoFijo,
			c.area,
			c.departamento,
			c.puesto,
			c.numeroResponsiva,
			c.responsivaArchivo ? 'Sí' : 'No'
		].map((v) => v ?? '');
		// El equipo principal primero, luego los periféricos.
		const equipos = [...c.equipos].sort((a, b) => Number(b.principal) - Number(a.principal));
		if (equipos.length === 0) filas.push([...base, '', '', '', '']);
		for (const e of equipos) filas.push([...base, e.tipo, e.marca, e.modelo, e.serie]);
	}
	return filas;
}

/** Descarga el inventario como libro de Excel. */
export function exportarExcel(colaboradores: Colaborador[], archivo: string) {
	const libro = construirXlsx(construirFilas(colaboradores));
	const url = URL.createObjectURL(new Blob([libro as BlobPart], { type: TIPO_XLSX }));
	const a = document.createElement('a');
	a.href = url;
	a.download = `${archivo}.xlsx`;
	a.click();
	URL.revokeObjectURL(url);
}
