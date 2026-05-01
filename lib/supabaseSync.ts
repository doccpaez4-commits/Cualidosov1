/**
 * supabaseSync.ts
 * Módulo de sincronización con Supabase Storage para usuarios Premium.
 * Los archivos .research se almacenan en: research-projects/<user_id>/<filename>
 */

import { createClient } from '@/utils/supabase/client';
import { exportProjectData } from './db';
import JSZip from 'jszip';
import type { ResearchManifest } from '@/types';

const BUCKET = 'research-projects';

// ─────────────────────────────────────────────────────────────────────────────
// Verificación de estado premium
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica si el usuario autenticado tiene acceso premium.
 * Se consulta la tabla `profiles` en Supabase con la columna `is_premium`.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return data.is_premium === true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exportar proyecto como Blob (sin descargar)
// ─────────────────────────────────────────────────────────────────────────────

async function buildProjectBlob(projectId: number): Promise<{ blob: Blob; filename: string }> {
  const data = await exportProjectData(projectId);
  if (!data.project) throw new Error('Proyecto no encontrado');

  const zip = new JSZip();
  const filesFolder = zip.folder('files')!;

  const docsForManifest = (data.documents ?? []).map(doc => {
    const { blobData, ...rest } = doc as any;
    if (blobData) {
      const safeName = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      filesFolder.file(safeName, blobData);
      return { ...rest, filename: `files/${safeName}` };
    }
    return rest;
  });

  const manifest: ResearchManifest = {
    version: '2.0.0',
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
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const projectName = data.project.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${projectName}_${new Date().toISOString().slice(0, 10)}.research`;
  return { blob, filename };
}

// ─────────────────────────────────────────────────────────────────────────────
// Subir proyecto al cloud
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exporta el proyecto a un .research y lo sube a Supabase Storage.
 * Retorna el path del archivo en el bucket.
 */
export async function uploadProjectToCloud(
  projectId: number,
  userId: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Preparando archivo...');
  const { blob, filename } = await buildProjectBlob(projectId);

  onProgress?.('Subiendo a la nube...');
  const supabase = createClient();
  const path = `${userId}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'application/zip',
      upsert: true, // sobreescribir si existe
    });

  if (error) throw new Error(`Error al subir: ${error.message}`);
  onProgress?.('¡Sincronizado!');
  return path;
}

/**
 * Sube un archivo .research (File) directamente al cloud sin pasar por IndexedDB.
 * Útil para recuperar proyectos exportados manualmente.
 */
export async function uploadFileToCloud(
  file: File,
  userId: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Subiendo archivo a la nube...');
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: 'application/zip',
      upsert: true,
    });

  if (error) throw new Error(`Error al subir archivo: ${error.message}`);
  onProgress?.('¡Archivo subido!');
  return path;
}

// ─────────────────────────────────────────────────────────────────────────────
// Listar proyectos en la nube
// ─────────────────────────────────────────────────────────────────────────────

export interface CloudProject {
  name: string;
  path: string;
  updatedAt: string;
  size: number;
}

/**
 * Lista los archivos .research del usuario en Supabase Storage.
 */
export async function listCloudProjects(userId: string): Promise<CloudProject[]> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(userId, { sortBy: { column: 'updated_at', order: 'desc' } });

  if (error || !data) return [];

  return data
    .filter(f => f.name.endsWith('.research'))
    .map(f => ({
      name: f.name,
      path: `${userId}/${f.name}`,
      updatedAt: f.updated_at ?? f.created_at ?? '',
      size: f.metadata?.size ?? 0,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Descargar proyecto desde la nube
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Descarga un archivo .research desde Supabase Storage y retorna un File.
 */
export async function downloadProjectFromCloud(path: string): Promise<File> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Error al descargar: ${error?.message}`);

  const filename = path.split('/').pop() ?? 'proyecto.research';
  return new File([data], filename, { type: 'application/zip' });
}
