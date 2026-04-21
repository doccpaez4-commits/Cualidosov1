import Dexie, { Table } from 'dexie';
import type {
  Project,
  Document,
  Category,
  Code,
  Annotation,
  Memo,
  EpojeEntry,
  FieldNote,
  IAPCycle,
} from '@/types';

export class CualidosoDB extends Dexie {
  projects!: Table<Project, number>;
  documents!: Table<Document, number>;
  categories!: Table<Category, number>;
  codes!: Table<Code, number>;
  annotations!: Table<Annotation, number>;
  memos!: Table<Memo, number>;
  epojeEntries!: Table<EpojeEntry, number>;
  fieldNotes!: Table<FieldNote, number>;
  iapCycles!: Table<IAPCycle, number>;

  constructor() {
    super('CualidosoDB');

    this.version(2).stores({
      // Proyectos: índice por nombre
      projects: '++id, name, lente, createdAt, updatedAt',

      // Documentos: índice por proyecto y tipo
      documents: '++id, projectId, name, type, createdAt',

      // Categorías: índice por proyecto, con soporte de jerarquía
      categories: '++id, projectId, parentId, name',

      // Códigos: índice por proyecto, categoría y dominio (Breilh)
      codes: '++id, projectId, categoryId, name, domain, groundedPhase',

      // Anotaciones: índice por documento y código (para concurrencia)
      annotations: '++id, documentId, projectId, codeId, createdAt',

      // Memos: índice por anotación y proyecto
      memos: '++id, annotationId, projectId, documentId, createdAt',

      // Epojé (Fenomenología): por proyecto
      epojeEntries: '++id, projectId, createdAt',

      // Notas de campo (Etnografía): por proyecto e imagen
      fieldNotes: '++id, projectId, imageId, createdAt',

      // Ciclos IAP: por proyecto
      iapCycles: '++id, projectId, phase, createdAt',
    });
  }
}

// Singleton exportado - se usa en toda la app
export const db = new CualidosoDB();

// ─── Helpers de utilidad ──────────────────────────────────────────────────────

/** Obtiene todos los proyectos ordenados por fecha de actualización */
export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray();
}

/** Obtiene todos los documentos de un proyecto */
export async function getProjectDocuments(projectId: number): Promise<Document[]> {
  return db.documents.where('projectId').equals(projectId).toArray();
}

/** Obtiene todos los códigos de un proyecto con conteo de anotaciones */
export async function getCodesWithCount(projectId: number): Promise<Code[]> {
  const codes = await db.codes.where('projectId').equals(projectId).toArray();
  const annotationCounts = await Promise.all(
    codes.map(async (code) => {
      const count = await db.annotations
        .where({ projectId, codeId: code.id! })
        .count();
      return { ...code, annotationCount: count };
    })
  );
  return annotationCounts;
}

/** Obtiene las anotaciones de un documento con sus códigos */
export async function getDocumentAnnotations(documentId: number) {
  const annotations = await db.annotations
    .where('documentId')
    .equals(documentId)
    .toArray();

  const codeIds = Array.from(new Set(annotations.map((a) => a.codeId)));
  const codes = await db.codes.bulkGet(codeIds);
  const codeMap = new Map(codes.filter(Boolean).map((c) => [c!.id!, c!]));

  return annotations.map((a) => ({
    annotation: a,
    code: codeMap.get(a.codeId)!,
  }));
}

/** Obtiene verbatims de un proyecto completo para el dashboard */
export async function getAllVerbatims(projectId: number) {
  const annotations = await db.annotations
    .where('projectId')
    .equals(projectId)
    .toArray();

  const [codes, documents, categories] = await Promise.all([
    db.codes.where('projectId').equals(projectId).toArray(),
    db.documents.where('projectId').equals(projectId).toArray(),
    db.categories.where('projectId').equals(projectId).toArray(),
  ]);

  const codeMap = new Map(codes.map((c) => [c.id!, c]));
  const docMap = new Map(documents.map((d) => [d.id!, d]));
  const catMap = new Map(categories.map((c) => [c.id!, c]));

  return annotations
    .filter((a) => a.text)
    .map((a) => {
      const code = codeMap.get(a.codeId);
      const doc = docMap.get(a.documentId);
      const cat = code?.categoryId ? catMap.get(code.categoryId) : undefined;
      return {
        annotationId: a.id!,
        documentId: a.documentId,
        documentName: doc?.name ?? 'Documento desconocido',
        text: a.text ?? '',
        codeName: code?.name ?? 'Sin código',
        codeColor: code?.color ?? '#888',
        categoryName: cat?.name,
        domain: code?.domain,
      };
    });
}

/** Exporta el proyecto completo a un objeto serializable */
export async function exportProjectData(projectId: number) {
  const [project, documents, categories, codes, annotations, memos, epojeEntries, fieldNotes, iapCycles] =
    await Promise.all([
      db.projects.get(projectId),
      db.documents.where('projectId').equals(projectId).toArray(),
      db.categories.where('projectId').equals(projectId).toArray(),
      db.codes.where('projectId').equals(projectId).toArray(),
      db.annotations.where('projectId').equals(projectId).toArray(),
      db.memos.where('projectId').equals(projectId).toArray(),
      db.epojeEntries.where('projectId').equals(projectId).toArray(),
      db.fieldNotes.where('projectId').equals(projectId).toArray(),
      db.iapCycles.where('projectId').equals(projectId).toArray(),
    ]);

  return { project, documents, categories, codes, annotations, memos, epojeEntries, fieldNotes, iapCycles };
}
