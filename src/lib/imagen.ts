/** Reduce la imagen a `maxLado` px por su lado mayor y la regresa como data URL JPEG. */
export function reducirImagen(archivo: File, maxLado: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
			const lienzo = document.createElement('canvas');
			lienzo.width = Math.round(img.width * escala);
			lienzo.height = Math.round(img.height * escala);
			const g = lienzo.getContext('2d')!;
			// El JPEG no guarda transparencia: sin este fondo blanco, un PNG
			// recortado (foto de producto, captura) sale con el fondo en negro.
			g.fillStyle = '#ffffff';
			g.fillRect(0, 0, lienzo.width, lienzo.height);
			g.drawImage(img, 0, 0, lienzo.width, lienzo.height);
			URL.revokeObjectURL(img.src);
			resolve(lienzo.toDataURL('image/jpeg', 0.8));
		};
		img.onerror = () => {
			URL.revokeObjectURL(img.src);
			reject(new Error('No se pudo leer la imagen'));
		};
		img.src = URL.createObjectURL(archivo);
	});
}
