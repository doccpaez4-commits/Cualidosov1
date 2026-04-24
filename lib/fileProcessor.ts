/**
 * fileProcessor.ts
 * Procesamiento client-side de archivos:
 * - TXT: lectura directa
 * - PDF: extracción de texto nativa con pdfjs-dist (sin OCR)
 * - Imágenes: conversión a ArrayBuffer para IndexedDB
 */

/** Convierte un File de texto plano a string */
export async function processTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Extrae texto de un PDF nativo (NO escaneado) usando pdfjs-dist.
 * Se carga de forma dinámica para no aumentar el bundle inicial.
 */
export async function processPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Carga dinámica de pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.mjs';

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textPages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    textPages.push(pageText);
  }

  return textPages.join('\n\n');
}

/** 
 * Comprime una imagen usando Canvas.
 * - Max ancho: 1920px
 * - Formato: WebP
 * - Calidad: 0.8
 */
export async function compressImage(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar si es muy grande
        const MAX_WIDTH = 1920;
        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH / width) * height;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              resolve(await blob.arrayBuffer());
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/** Procesa la imagen aplicando compresión antes de retornar el ArrayBuffer */
export async function processImage(file: File): Promise<ArrayBuffer> {
  // Solo comprimimos si el navegador soporta Canvas (siempre en navegadores modernos)
  try {
    return await compressImage(file);
  } catch (e) {
    console.warn('Fallo compresión, guardando original', e);
    return file.arrayBuffer();
  }
}

/** Crea una URL temporal para visualizar un ArrayBuffer de imagen */
export function createImageUrl(buffer: ArrayBuffer, mimeType: string): string {
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Procesa cualquier archivo aceptado y retorna el resultado apropiado.
 * type TXT → content: string
 * type PDF → content: string  
 * type image → blobData: ArrayBuffer
 */
export async function processFile(file: File): Promise<{
  type: 'txt' | 'pdf' | 'image';
  content?: string;
  blobData?: ArrayBuffer;
  mimeType: string;
  size: number;
}> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const size = file.size;
  const mimeType = file.type;

  if (ext === 'txt' || mimeType === 'text/plain') {
    const content = await processTxt(file);
    return { type: 'txt', content, mimeType, size };
  }

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    const content = await processPdf(file);
    return { type: 'pdf', content, mimeType, size };
  }

  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || mimeType.startsWith('image/')) {
    const blobData = await processImage(file);
    return { type: 'image', blobData, mimeType, size };
  }

  throw new Error(`Tipo de archivo no soportado: ${ext}`);
}

/** Tipos de archivo aceptados en la UI */
export const ACCEPTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
