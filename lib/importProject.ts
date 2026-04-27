import JSZip from 'jszip';
import { db } from './db';
import { encryptText } from './crypto';
import type { ResearchManifest } from '@/types';

/**
 * Importa un proyecto desde un archivo .research (ZIP)
 */
export async function importProject(file: File): Promise<number> {
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('Archivo de manifiesto no encontrado en el paquete.');

  const manifestContent = await manifestFile.async('text');
  const manifest: ResearchManifest = JSON.parse(manifestContent);

  // 1. Crear el proyecto (obtenemos nuevo ID)
  const { id: oldProjectId, ...projectData } = manifest.project;
  const newProjectId = await db.projects.add({
    ...projectData,
    createdAt: new Date(projectData.createdAt),
    updatedAt: new Date(),
  });

  // Mapeos de IDs antiguos a nuevos para mantener relaciones
  const categoryMap = new Map<number, number>();
  const codeMap = new Map<number, number>();
  const docMap = new Map<number, number>();

  // 2. Importar Categorías (primero las de nivel superior, luego hijos si hubiera, pero aquí lo hacemos plano)
  // Nota: Si hubiera jerarquías complejas, habría que ordenar por parentId. 
  // Para este MVP, asumimos que parentId se puede re-mapear.
  for (const cat of manifest.categories) {
    const { id: oldCatId, ...catData } = cat;
    const newCatId = await db.categories.add({
      ...catData,
      projectId: newProjectId,
    });
    categoryMap.set(oldCatId!, newCatId);
  }

  // Actualizar parentIds de categorías si existen
  for (const [oldId, newId] of categoryMap.entries()) {
    const cat = await db.categories.get(newId);
    if (cat?.parentId && categoryMap.has(cat.parentId)) {
      await db.categories.update(newId, { parentId: categoryMap.get(cat.parentId) });
    }
  }

  // 3. Importar Códigos
  for (const code of manifest.codes) {
    const { id: oldCodeId, ...codeData } = code;
    const newCodeId = await db.codes.add({
      ...codeData,
      projectId: newProjectId,
      categoryId: codeData.categoryId ? categoryMap.get(codeData.categoryId) : undefined,
    });
    codeMap.set(oldCodeId!, newCodeId);
  }

  // 4. Importar Documentos y sus Blobs
  for (const doc of manifest.documents) {
    const { id: oldDocId, filename, ...docData } = doc;
    
    let blobData: Blob | undefined = undefined;
    if (filename) {
      // Extraer el blob del ZIP
      const fileInZip = zip.file(filename.replace('files/', 'files/')); // Ya viene con prefijo o no según export
      // Intentar con y sin prefijo por si acaso
      const actualFile = fileInZip || zip.file(doc.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
      if (actualFile) {
        blobData = await actualFile.async('blob');
      }
    }

    const newDocId = await db.documents.add({
      ...docData,
      projectId: newProjectId,
      blobData,
    });
    docMap.set(oldDocId!, newDocId);
  }

  // 5. Importar Anotaciones (RE-CIFRAR)
  const annotationMap = new Map<number, number>();
  for (const ann of manifest.annotations) {
    const { id: oldAnnId, ...annData } = ann;
    const encryptedText = await encryptText(annData.text || '');
    const newAnnId = await db.annotations.add({
      ...annData,
      projectId: newProjectId,
      documentId: docMap.get(annData.documentId)!,
      codeId: codeMap.get(annData.codeId)!,
      text: encryptedText,
    });
    annotationMap.set(oldAnnId!, newAnnId);
  }

  // 6. Importar Memos (RE-CIFRAR)
  for (const memo of manifest.memos) {
    const { id: oldMemoId, ...memoData } = memo;
    const encryptedContent = await encryptText(memoData.content || '');
    await db.memos.add({
      ...memoData,
      projectId: newProjectId,
      documentId: memoData.documentId ? docMap.get(memoData.documentId) : undefined,
      annotationId: memoData.annotationId ? annotationMap.get(memoData.annotationId) : undefined,
      content: encryptedContent,
    });
  }

  // 7. Importar Epojé
  for (const entry of manifest.epojeEntries) {
    const { id, ...entryData } = entry;
    await db.epojeEntries.add({ ...entryData, projectId: newProjectId });
  }

  // 8. Importar Notas de Campo
  for (const note of manifest.fieldNotes) {
    const { id, ...noteData } = note;
    await db.fieldNotes.add({ ...noteData, projectId: newProjectId });
  }

  // 9. Importar Ciclos IAP
  for (const cycle of manifest.iapCycles) {
    const { id, ...cycleData } = cycle;
    await db.iapCycles.add({ ...cycleData, projectId: newProjectId });
  }

  return newProjectId;
}
