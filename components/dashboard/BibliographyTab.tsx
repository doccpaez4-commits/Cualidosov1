'use client';

import { useState } from 'react';
import type { LenteType } from '@/types';
import { BookOpen, ExternalLink, Search, Star, Filter } from 'lucide-react';

interface BibEntry {
  id: string;
  lentes: LenteType[];
  type: 'libro' | 'artículo' | 'capítulo' | 'manual';
  author: string;
  year: number;
  title: string;
  journal?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  tags: string[];
  relevance: 'fundamental' | 'complementaria';
  note?: string;
}

const BIBLIOGRAPHY: BibEntry[] = [
  // ── Teoría Fundamentada ──
  {
    id: 'charmaz2006',
    lentes: ['grounded'],
    type: 'libro',
    author: 'Charmaz, K.',
    year: 2006,
    title: 'Constructing Grounded Theory: A Practical Guide Through Qualitative Analysis',
    publisher: 'SAGE Publications',
    relevance: 'fundamental',
    tags: ['codificación', 'teoría fundamentada', 'constructivismo'],
    note: 'El texto de referencia para la versión constructivista de la TF. Esencial para la codificación Abierta y Axial.',
  },
  {
    id: 'glaser1967',
    lentes: ['grounded'],
    type: 'libro',
    author: 'Glaser, B. & Strauss, A.',
    year: 1967,
    title: 'The Discovery of Grounded Theory: Strategies for Qualitative Research',
    publisher: 'Aldine',
    relevance: 'fundamental',
    tags: ['comparación constante', 'saturación teórica'],
    note: 'Texto fundacional de la Teoría Fundamentada. Introduce el método de comparación constante.',
  },
  {
    id: 'strauss1990',
    lentes: ['grounded'],
    type: 'libro',
    author: 'Strauss, A. & Corbin, J.',
    year: 1990,
    title: 'Basics of Qualitative Research: Grounded Theory Procedures and Techniques',
    publisher: 'SAGE',
    relevance: 'complementaria',
    tags: ['codificación axial', 'paradigma de codificación'],
  },
  // ── Fenomenología ──
  {
    id: 'vanmanen1990',
    lentes: ['phenomenology'],
    type: 'libro',
    author: 'van Manen, M.',
    year: 1990,
    title: 'Researching Lived Experience: Human Science for an Action Sensitive Pedagogy',
    publisher: 'State University of New York Press',
    relevance: 'fundamental',
    tags: ['fenomenología hermenéutica', 'descripción densa', 'epojé'],
    note: 'La guía práctica de referencia para la fenomenología hermenéutica aplicada a las ciencias sociales y la salud.',
  },
  {
    id: 'moustakas1994',
    lentes: ['phenomenology'],
    type: 'libro',
    author: 'Moustakas, C.',
    year: 1994,
    title: 'Phenomenological Research Methods',
    publisher: 'SAGE Publications',
    relevance: 'fundamental',
    tags: ['reducción eidética', 'síntesis textural-estructural'],
    note: 'Describe el proceso de reducción eidética y la síntesis textural-estructural. Clave para el análisis de significado.',
  },
  {
    id: 'giorgi1985',
    lentes: ['phenomenology'],
    type: 'libro',
    author: 'Giorgi, A.',
    year: 1985,
    title: 'Phenomenology and Psychological Research',
    publisher: 'Duquesne University Press',
    relevance: 'complementaria',
    tags: ['psicología fenomenológica', 'unidades de significado'],
  },
  // ── Etnografía ──
  {
    id: 'geertz1973',
    lentes: ['ethnography'],
    type: 'libro',
    author: 'Geertz, C.',
    year: 1973,
    title: 'The Interpretation of Cultures',
    publisher: 'Basic Books',
    relevance: 'fundamental',
    tags: ['descripción densa', 'cultura', 'símbolo'],
    note: 'Introduce el concepto de "descripción densa". La base epistemológica de la etnografía interpretativa.',
  },
  {
    id: 'spradley1980',
    lentes: ['ethnography'],
    type: 'libro',
    author: 'Spradley, J.',
    year: 1980,
    title: 'Participant Observation',
    publisher: 'Holt, Rinehart & Winston',
    relevance: 'fundamental',
    tags: ['observación participante', 'notas de campo', 'mapeo cultural'],
    note: 'Manual metodológico esencial para la observación participante y el análisis de dominios culturales.',
  },
  // ── IAP ──
  {
    id: 'falsborda1987',
    lentes: ['iap'],
    type: 'libro',
    author: 'Fals Borda, O.',
    year: 1987,
    title: 'The Application of Participatory Action Research in Latin America',
    journal: 'International Sociology',
    relevance: 'fundamental',
    tags: ['IAP', 'conocimiento popular', 'transformación social'],
    note: 'El artículo fundacional de la IAP latinoamericana. Define los principios del "conocimiento popular" y la investigación comprometida.',
  },
  {
    id: 'kemmis2005',
    lentes: ['iap'],
    type: 'capítulo',
    author: 'Kemmis, S. & McTaggart, R.',
    year: 2005,
    title: 'Participatory Action Research: Communicative Action and the Public Sphere',
    journal: 'SAGE Handbook of Qualitative Research (3rd ed.)',
    publisher: 'SAGE',
    relevance: 'fundamental',
    tags: ['espiral de acción', 'ciclos de reflexión', 'esfera pública'],
    note: 'Define el espiral de acción-reflexión. Es la referencia para el diseño de ciclos IAP.',
  },
  {
    id: 'reason2008',
    lentes: ['iap'],
    type: 'libro',
    author: 'Reason, P. & Bradbury, H.',
    year: 2008,
    title: 'The SAGE Handbook of Action Research: Participative Inquiry and Practice',
    publisher: 'SAGE Publications',
    relevance: 'complementaria',
    tags: ['handbook', 'criterios de calidad', 'co-investigación'],
  },
  // ── Breilh / Metacrítica ──
  {
    id: 'breilh2010',
    lentes: ['breilh'],
    type: 'libro',
    author: 'Breilh, J.',
    year: 2010,
    title: 'La Epidemiología Crítica: una nueva forma de mirar la salud en el espacio urbano',
    journal: 'Salud Colectiva',
    relevance: 'fundamental',
    tags: ['determinación social', 'dominios G-P-S', 'procesos críticos'],
    note: 'Define los tres dominios de determinación social (General, Particular, Singular) y los procesos protectores/malsanos.',
  },
  {
    id: 'breilh2003',
    lentes: ['breilh'],
    type: 'libro',
    author: 'Breilh, J.',
    year: 2003,
    title: 'Epidemiología Crítica: Ciencia Emancipadora e Interculturalidad',
    publisher: 'Lugar Editorial',
    relevance: 'fundamental',
    tags: ['epidemiología crítica', '4S', 'soberanía sanitaria'],
    note: 'Desarrolla la epistemología de la Epidemiología Crítica y el concepto de las 4S (Seguridad, Soberanía, Solidaridad, Sustentabilidad).',
  },
  // ── General / Metodología Cualitativa ──
  {
    id: 'creswell2018',
    lentes: ['grounded', 'phenomenology', 'ethnography', 'iap', 'breilh', 'free'],
    type: 'libro',
    author: 'Creswell, J. & Poth, C.',
    year: 2018,
    title: 'Qualitative Inquiry and Research Design: Choosing Among Five Approaches (4th ed.)',
    publisher: 'SAGE Publications',
    relevance: 'complementaria',
    tags: ['metodología mixta', 'diseño cualitativo', 'comparación de métodos'],
  },
  {
    id: 'lincoln1985',
    lentes: ['grounded', 'phenomenology', 'ethnography', 'iap', 'breilh', 'free'],
    type: 'libro',
    author: 'Lincoln, Y. & Guba, E.',
    year: 1985,
    title: 'Naturalistic Inquiry',
    publisher: 'SAGE Publications',
    relevance: 'fundamental',
    tags: ['credibilidad', 'transferibilidad', 'rigor cualitativo'],
    note: 'Define los criterios de rigor en investigación naturalista (credibilidad, transferibilidad, dependabilidad, confirmabilidad).',
  },
];

const TYPE_COLOR: Record<string, string> = {
  'libro': '#7c3aed',
  'artículo': '#0284c7',
  'capítulo': '#d97706',
  'manual': '#059669',
};

const RELEVANCE_COLOR: Record<string, string> = {
  fundamental: '#dc2626',
  complementaria: '#2563eb',
};

interface Props {
  lente?: LenteType;
}

export default function BibliographyTab({ lente }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'fundamental' | 'complementaria'>('all');

  const filtered = BIBLIOGRAPHY.filter(b => {
    const matchLente = !lente || lente === 'free' || b.lentes.includes(lente);
    const matchSearch = !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || b.relevance === filter;
    return matchLente && matchSearch && matchFilter;
  });

  const fundamentales = filtered.filter(b => b.relevance === 'fundamental');
  const complementarias = filtered.filter(b => b.relevance === 'complementaria');

  return (
    <div className="w-full h-full overflow-auto pb-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Bibliografía Metodológica
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Referencias pedagógicas organizadas por metodología y nivel de relevancia para tu análisis.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input pl-9 w-full text-sm"
            placeholder="Buscar autor, título, concepto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} style={{ color: 'var(--text-muted)' }} />
          {(['all', 'fundamental', 'complementaria'] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all capitalize"
              style={{
                background: filter === f ? 'var(--accent)' : 'var(--bg-secondary)',
                color: filter === f ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              {f === 'all' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} referencia{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Fundamentales */}
      {fundamentales.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-red-500" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Referencias Fundamentales
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {fundamentales.length}
            </span>
          </div>
          <div className="space-y-3">
            {fundamentales.map(b => <BibCard key={b.id} entry={b} />)}
          </div>
        </div>
      )}

      {/* Complementarias */}
      {complementarias.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Referencias Complementarias
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
              {complementarias.length}
            </span>
          </div>
          <div className="space-y-3">
            {complementarias.map(b => <BibCard key={b.id} entry={b} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="empty-state mt-10">
          <p className="text-xl">📚</p>
          <p>No se encontraron referencias con esos criterios.</p>
        </div>
      )}
    </div>
  );
}

function BibCard({ entry }: { entry: BibEntry }) {
  const typeColor = TYPE_COLOR[entry.type] ?? '#475569';

  return (
    <div className="rounded-xl p-4 border transition-all hover:shadow-sm"
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border)',
        borderLeft: `3px solid ${entry.relevance === 'fundamental' ? '#dc2626' : '#2563eb'}`,
      }}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
            style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
            {entry.type}
          </span>
          <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{entry.year}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug mb-0.5" style={{ color: 'var(--text-primary)' }}>
            {entry.title}
          </p>
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            {entry.author}
            {entry.publisher && <span className="opacity-60"> · {entry.publisher}</span>}
            {entry.journal && <span className="opacity-60"> · {entry.journal}</span>}
          </p>

          {entry.note && (
            <p className="text-xs italic leading-relaxed mb-2 p-2 rounded-lg"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderLeft: '2px solid var(--border)' }}>
              {entry.note}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {entry.tags.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {t}
              </span>
            ))}
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] flex items-center gap-1 font-medium"
                style={{ color: 'var(--accent)' }}>
                <ExternalLink size={10} /> Ver fuente
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
