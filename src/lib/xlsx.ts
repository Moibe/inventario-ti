// Generador mínimo de .xlsx, sin dependencias.
//
// Se escribe un Excel de verdad y no un CSV porque Excel reinterpreta el CSV:
// un No. de empleado "007" se vuelve 7, una serie de 16 dígitos se redondea,
// un folio "1-2" se vuelve fecha y una celda que empieza con "=" se ejecuta como
// fórmula. Aquí todas las celdas son texto en línea (inlineStr), así que el
// contenido llega tal cual.

const TEXTO = new TextEncoder();

const CRC_TABLA = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(datos: Uint8Array) {
	let c = 0xffffffff;
	for (let i = 0; i < datos.length; i++) c = CRC_TABLA[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function unir(partes: Uint8Array[]) {
	const salida = new Uint8Array(partes.reduce((n, p) => n + p.length, 0));
	let i = 0;
	for (const p of partes) {
		salida.set(p, i);
		i += p.length;
	}
	return salida;
}

/** ZIP con método "store" (sin comprimir): basta para que Excel lo abra. */
function zip(archivos: { nombre: string; datos: Uint8Array }[]) {
	const cuerpo: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let desplazamiento = 0;

	for (const a of archivos) {
		const nombre = TEXTO.encode(a.nombre);
		const crc = crc32(a.datos);

		const local = new Uint8Array(30 + nombre.length);
		const v = new DataView(local.buffer);
		v.setUint32(0, 0x04034b50, true);
		v.setUint16(4, 20, true); // versión necesaria
		v.setUint16(10, 0x6000, true); // hora fija (los zips no llevan reloj aquí)
		v.setUint16(12, 0x21, true); // fecha fija: 1980-01-01
		v.setUint32(14, crc, true);
		v.setUint32(18, a.datos.length, true);
		v.setUint32(22, a.datos.length, true);
		v.setUint16(26, nombre.length, true);
		local.set(nombre, 30);

		const cen = new Uint8Array(46 + nombre.length);
		const w = new DataView(cen.buffer);
		w.setUint32(0, 0x02014b50, true);
		w.setUint16(4, 20, true); // versión del creador
		w.setUint16(6, 20, true); // versión necesaria
		// 8: banderas y 10: método se quedan en 0 (sin comprimir).
		w.setUint16(12, 0x6000, true); // hora
		w.setUint16(14, 0x21, true); // fecha
		w.setUint32(16, crc, true);
		w.setUint32(20, a.datos.length, true);
		w.setUint32(24, a.datos.length, true);
		w.setUint16(28, nombre.length, true);
		w.setUint32(42, desplazamiento, true);
		cen.set(nombre, 46);

		cuerpo.push(local, a.datos);
		central.push(cen);
		desplazamiento += local.length + a.datos.length;
	}

	const directorio = unir(central);
	const fin = new Uint8Array(22);
	const f = new DataView(fin.buffer);
	f.setUint32(0, 0x06054b50, true);
	f.setUint16(8, archivos.length, true);
	f.setUint16(10, archivos.length, true);
	f.setUint32(12, directorio.length, true);
	f.setUint32(16, desplazamiento, true);

	return unir([...cuerpo, directorio, fin]);
}

// XML 1.0 no admite la mayoría de los caracteres de control.
const escaparXml = (v: string) =>
	v
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');

/** 0 -> A, 25 -> Z, 26 -> AA… */
export function columnaExcel(indice: number) {
	let n = indice + 1;
	let letras = '';
	while (n > 0) {
		const resto = (n - 1) % 26;
		letras = String.fromCharCode(65 + resto) + letras;
		n = Math.floor((n - resto) / 26);
	}
	return letras;
}

const PARTES_FIJAS = [
	{
		nombre: '[Content_Types].xml',
		texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
	},
	{
		nombre: '_rels/.rels',
		texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
	},
	{
		nombre: 'xl/_rels/workbook.xml.rels',
		texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
	},
	{
		nombre: 'xl/styles.xml',
		texto: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`
	}
];

/**
 * Libro de una sola hoja, con la primera fila como encabezado en negritas y fija
 * al desplazarse. `filas[0]` es el encabezado.
 */
export function construirXlsx(filas: string[][], hoja = 'Inventario') {
	const columnas = Math.max(1, ...filas.map((f) => f.length));

	const anchos = Array.from({ length: columnas }, (_, c) => {
		const largo = Math.max(...filas.map((f) => (f[c] ?? '').length), 8);
		return Math.min(46, largo + 3);
	});
	const cols =
		'<cols>' +
		anchos
			.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`)
			.join('') +
		'</cols>';

	const celdas = filas
		.map((fila, f) => {
			const r = f + 1;
			const contenido = fila
				.map((valor, c) => {
					const v = valor ?? '';
					if (v === '') return '';
					const estilo = f === 0 ? ' s="1"' : '';
					return `<c r="${columnaExcel(c)}${r}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escaparXml(v)}</t></is></c>`;
				})
				.join('');
			return `<row r="${r}">${contenido}</row>`;
		})
		.join('');

	const sheet =
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
		`<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
		cols +
		`<sheetData>${celdas}</sheetData></worksheet>`;

	const workbook =
		`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
		`<sheets><sheet name="${escaparXml(hoja).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

	return zip(
		[
			...PARTES_FIJAS,
			{ nombre: 'xl/workbook.xml', texto: workbook },
			{ nombre: 'xl/worksheets/sheet1.xml', texto: sheet }
		].map((p) => ({ nombre: p.nombre, datos: TEXTO.encode(p.texto) }))
	);
}

export const TIPO_XLSX =
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
