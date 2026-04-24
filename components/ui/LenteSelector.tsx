'use client';

import type { LenteType } from '@/types';
import { X, Layers, FlaskConical, Users, BookOpen, Microscope, Pencil } from 'lucide-react';

interface LenteConfig {
  id: LenteType;
  label: string;
  author: string;
  description: string;
  tools: string[];
  color: string;
  icon: React.ReactNode;
}

const LENTES: LenteConfig[] = [
  {
    id: 'free',
    label: 'Práctica Libre',
    author: 'Sin metodología predefinida',
    description:
      'Espacio abierto para codificar y analizar sin restricciones metodológicas. Ideal para exploración inicial, práctica de codificación o proyectos interdisciplinarios que no siguen un paradigma único.',
    tools: ['Codificación libre', 'Categorías personalizadas', 'Matriz de concurrencia', 'Nube de palabras'],
    color: '#64748b',
    icon: <Pencil size={28} />,
  },
  {
    id: 'grounded',
    label: 'Teoría Fundamentada',
    author: 'Kathy Charmaz · Glaser & Strauss',
    description:
      'Construye teoría emergente desde los datos. El sistema te guiará por las fases de codificación Abierta, Axial y Selectiva con prompts de comparación constante.',
    tools: ['Codificación Abierta / Axial / Selectiva', 'Comparación constante', 'Memo teórico', 'Categoría central'],
    color: '#7c6af7',
    icon: <Layers size={28} />,
  },
  {
    id: 'phenomenology',
    label: 'Fenomenología',
    author: 'Edmund Husserl · Max van Manen',
    description:
      'Captura la esencia de la experiencia vivida. Incluye un espacio de Epojé (reducción fenomenológica) y herramientas para identificar Unidades de Significado.',
    tools: ['Unidades de Significado', 'Diario de Epojé', 'Reducción eidética', 'Descripción densa'],
    color: '#14b8a6',
    icon: <FlaskConical size={28} />,
  },
  {
    id: 'ethnography',
    label: 'Etnografía',
    author: 'Clifford Geertz · James Spradley',
    description:
      'Documenta prácticas culturales con descripción densa. Vincula fotos con notas de campo y codifica áreas de imágenes con polígonos (etnografía visual).',
    tools: ['Descripción densa', 'Notas de campo', 'Etnografía visual', 'Mapeo cultural'],
    color: '#f59e0b',
    icon: <Users size={28} />,
  },
  {
    id: 'iap',
    label: 'IAP (Fals Borda)',
    author: 'Orlando Fals Borda · Paulo Freire',
    description:
      'Investigación-Acción Participativa. Sigue los ciclos de Acción-Reflexión y mapea los actores del territorio para transformar la realidad colectivamente.',
    tools: ['Ciclos Acción-Reflexión', 'Mapeo de actores', 'Triangulación comunitaria', 'Sistematización'],
    color: '#10b981',
    icon: <BookOpen size={28} />,
  },
  {
    id: 'breilh',
    label: 'Metacrítica (Breilh)',
    author: 'Jaime Breilh · Epidemiología Crítica',
    description:
      'Clasifica cada código en los tres dominios de determinación: General (Sociedad/Estado), Particular (Modos de vida) y Singular (Individuo). Genera flujos Sankey y Matrices de Procesos Críticos.',
    tools: ['Triple Determinación', 'Dominios G-P-S', 'Procesos protectores/malsanos', 'Sankey de determinación'],
    color: '#ef4444',
    icon: <Microscope size={28} />,
  },
];

interface Props {
  onSelect: (lente: LenteType) => void;
  onClose: () => void;
}

export default function LenteSelector({ onSelect, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '720px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Elige tu Lente Metodológico
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Define el paradigma que guiará tu análisis y activará el Mentor correspondiente.
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Free practice highlighted at top */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Exploración
          </p>
          {LENTES.filter(l => l.id === 'free').map(lente => (
            <button
              key={lente.id}
              onClick={() => onSelect(lente.id)}
              className="text-left w-full rounded-xl p-4 transition-all duration-150 group border-2 border-dashed"
              style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = lente.color;
                e.currentTarget.style.background = `${lente.color}08`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#f8fafc';
              }}
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${lente.color}20`, color: lente.color }}>
                  {lente.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{lente.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Sin metodología</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: lente.color }}>{lente.author}</p>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{lente.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lente.tools.map(tool => (
                      <span key={tool} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${lente.color}15`, color: lente.color }}>{tool}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Methodological lentes */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          Paradigmas metodológicos
        </p>
        <div className="grid gap-3">
          {LENTES.filter(l => l.id !== 'free').map(lente => (
            <button
              key={lente.id}
              onClick={() => onSelect(lente.id)}
              className="text-left w-full rounded-xl p-4 transition-all duration-150 group"
              style={{ background: 'var(--bg-primary)', border: `1px solid var(--border)` }}
              onMouseEnter={e => {
                e.currentTarget.style.border = `1px solid ${lente.color}60`;
                e.currentTarget.style.background = `${lente.color}08`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid var(--border)';
                e.currentTarget.style.background = 'var(--bg-primary)';
              }}
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all" style={{ background: `${lente.color}20`, color: lente.color }}>
                  {lente.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{lente.label}</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: lente.color }}>{lente.author}</p>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{lente.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lente.tools.map(tool => (
                      <span key={tool} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${lente.color}15`, color: lente.color }}>{tool}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
