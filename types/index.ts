// ─── Lentes Metodológicos ───────────────────────────────────────────────────
export type LenteType =
  | 'grounded'       // Teoría Fundamentada (Charmaz)
  | 'phenomenology'  // Fenomenología
  | 'ethnography'    // Etnografía (Geertz)
  | 'iap'            // Investigación-Acción Participativa (Fals Borda)
  | 'breilh'         // Metacrítica / Epidemiología Crítica (Breilh)
  | 'free';          // Práctica Libre (sin metodología definida)

// Dominio de clasificación según la Metacrítica de Breilh
export type BreilhDomain = 'general' | 'particular' | 'individual' | 'none';

// Fase de codificación en Teoría Fundamentada
export type GroundedPhase = 'open' | 'axial' | 'selective';

// ─── Entidades de la Base de Datos ──────────────────────────────────────────
export interface Project {
  id?: number;
  name: string;
  description?: string;
  lente: LenteType;
  createdAt: Date;
  updatedAt: Date;
  stopwords?: string[]; // palabras de parada personalizadas
}

export type DocumentType = 'txt' | 'pdf' | 'image';

export interface Document {
  id?: number;
  projectId: number;
  name: string;
  type: DocumentType;
  content?: string;       // texto extraído (TXT o PDF nativo)
  blobData?: ArrayBuffer; // datos binarios para imágenes
  mimeType?: string;
  size?: number;
  createdAt: Date;
}

export interface Category {
  id?: number;
  projectId: number;
  name: string;
  color: string;
  description?: string; // Memo o explicación del autor
  parentId?: number;      // para categorías anidadas
  domain?: BreilhDomain;  // Solo para lente Breilh (Dimensión)
  position?: { x: number; y: number }; // Para persistencia en el mapa d3
}

export interface Code {
  id?: number;
  projectId: number;
  categoryId?: number;
  name: string;
  color: string;          // hex color
  description?: string;
  domain?: BreilhDomain;  // Solo para lente Breilh (Dimensión)
  breilhType?: 'protector' | 'malsano' | 'none'; // Proceso protector/malsano
  sDeLaVida?: 'soberania' | 'sustentabilidad' | 'seguridad' | 'solidaridad' | 'none'; // Las 4 S de la vida
  groundedPhase?: GroundedPhase;    // Solo para lente Grounded
  annotationCount?: number;         // cache de conteo
  position?: { x: number; y: number }; // Para persistencia en el mapa d3
}

export interface Annotation {
  id?: number;
  documentId: number;
  projectId: number;
  codeId: number;
  // Para texto: rango de caracteres
  start?: number;
  end?: number;
  text?: string;          // texto subrayado (verbatim)
  // Para imágenes: polígono
  polygons?: PolygonPoint[][];
  createdAt: Date;
}

export interface PolygonPoint {
  x: number; // porcentaje de ancho (0-100) para escalar con resize
  y: number; // porcentaje de alto (0-100)
}

export interface Memo {
  id?: number;
  annotationId?: number;
  projectId: number;
  documentId?: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Entidades Específicas por Lente ────────────────────────────────────────

// Fenomenología: Diario de Epojé (reducción fenomenológica)
export interface EpojeEntry {
  id?: number;
  projectId: number;
  content: string;
  createdAt: Date;
}

// Etnografía: Notas de campo
export interface FieldNote {
  id?: number;
  projectId: number;
  imageId?: number;       // documento de imagen asociado
  content: string;
  location?: string;
  createdAt: Date;
}

// IAP: Ciclos de Acción-Reflexión (Fals Borda)
export interface IAPCycle {
  id?: number;
  projectId: number;
  name: string;
  phase: 'action' | 'reflection' | 'planning';
  actors: string[];       // actores involucrados
  reflection: string;
  actionPlan?: string;
  createdAt: Date;
}

// ─── UI / Estado en memoria ──────────────────────────────────────────────────
export interface ActiveAnnotation {
  annotation: Annotation;
  code: Code;
}

export interface VerbatimResult {
  annotationId: number;
  documentId: number;
  documentName: string;
  text: string;
  codeId: number;
  codeName: string;
  codeColor: string;
  categoryName?: string;
  domain?: BreilhDomain;
  breilhType?: 'protector' | 'malsano' | 'none';
  sDeLaVida?: 'soberania' | 'sustentabilidad' | 'seguridad' | 'solidaridad' | 'none';
  memos?: Memo[];
}

export interface ConcurrenceCell {
  codeA: number;
  codeB: number;
  codeAName: string;
  codeBName: string;
  count: number;
  annotations: number[];  // annotationIds compartidos
}

export interface TreemapNode {
  name: string;
  value: number;
  color: string;
  categoryId?: number;
  codeId?: number;
  children?: TreemapNode[];
}

export interface SankeyNode {
  id: string;
  name: string;
  domain: BreilhDomain;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  annotations: number[];
}

export interface WordFrequency {
  text: string;
  value: number;
}

// ─── Exportación ─────────────────────────────────────────────────────────────
export interface ResearchManifest {
  version: string;
  exportedAt: string;
  project: Project;
  documents: Array<Omit<Document, 'blobData'> & { filename?: string }>;
  categories: Category[];
  codes: Code[];
  annotations: Annotation[];
  memos: Memo[];
  epojeEntries?: EpojeEntry[];
  fieldNotes?: FieldNote[];
  iapCycles?: IAPCycle[];
}
