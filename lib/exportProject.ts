import JSZip from 'jszip';
import { exportProjectData } from './db';
import type { ResearchManifest } from '@/types';

/**
 * Exporta el proyecto completo como archivo .research (ZIP)
 * - manifest.json: estructura de datos sin blobs
 * - files/: archivos originales (imágenes como BLOBs)
 */
export async function exportProject(projectId: number): Promise<void> {
  const data = await exportProjectData(projectId);
  if (!data.project) throw new Error('Proyecto no encontrado');

  const zip = new JSZip();
  const filesFolder = zip.folder('files')!;

  // Separar blobData de los documentos para el manifest
  const docsForManifest = (data.documents ?? []).map(doc => {
    const { blobData, ...rest } = doc;
    if (blobData) {
      const filename = `files/${doc.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      filesFolder.file(doc.name.replace(/[^a-zA-Z0-9._-]/g, '_'), blobData);
      return { ...rest, filename };
    }
    return rest;
  });

  const manifest: ResearchManifest = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    project: data.project,
    documents: docsForManifest,
    categories: data.categories ?? [],
    codes: data.codes ?? [],
    annotations: data.annotations ?? [],
    memos: data.memos ?? [],
    epojeEntries: data.epojeEntries ?? [],
    fieldNotes: data.fieldNotes ?? [],
    iapCycles: data.iapCycles ?? [],
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Generar el ZIP
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const projectName = data.project.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${projectName}_${new Date().toISOString().slice(0, 10)}.research`;

  // Intentar File System Access API, fallback a descarga
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Proyecto Cualidoso', accept: { 'application/zip': ['.research'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e) {
      // Usuario canceló — fallback silencioso
    }
  }

  // Fallback: anchor download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
