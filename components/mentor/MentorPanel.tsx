'use client';

import type { LenteType, Project } from '@/types';
import GroundedMentor from './GroundedMentor';
import PhenomMentor from './PhenomMentor';
import EthnoMentor from './EthnoMentor';
import IAPMentor from './IAPMentor';
import BreilhMentor from './BreilhMentor';
import { Layers, FlaskConical, Users, BookOpen, Microscope, Pencil, ChevronRight, ChevronLeft } from 'lucide-react';

const LENTE_META: Record<LenteType, { label: string; color: string; icon: React.ReactNode }> = {
  free:          { label: 'Práctica Libre',       color: '#64748b', icon: <Pencil size={13}/> },
  grounded:      { label: 'Teoría Fundamentada', color: '#7c6af7', icon: <Layers size={13}/> },
  phenomenology: { label: 'Fenomenología',        color: '#14b8a6', icon: <FlaskConical size={13}/> },
  ethnography:   { label: 'Etnografía',           color: '#f59e0b', icon: <Users size={13}/> },
  iap:           { label: 'IAP (Fals Borda)',     color: '#10b981', icon: <BookOpen size={13}/> },
  breilh:        { label: 'Metacrítica (Breilh)', color: '#ef4444', icon: <Microscope size={13}/> },
};

// Mentor genérico para práctica libre
function FreeMentor({ project }: { project: Project; selectedAnnotationId?: number }) {
  return (
    <div className="space-y-4 p-1">
      <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#64748b' }}>
          ✏️ Práctica Libre
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
          Estás en modo de <strong>práctica libre</strong> — sin restricciones metodológicas.
          Puedes crear códigos, categorías y anotaciones libremente.
        </p>
      </div>
      <div className="rounded-xl p-4" style={{ background: '#fafafa', border: '1px dashed #cbd5e1' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>💡 Sugerencias</p>
        <ul className="text-xs space-y-1.5" style={{ color: '#64748b' }}>
          <li>• Empieza codificando pasajes relevantes del corpus.</li>
          <li>• Agrupa códigos en categorías cuando emerjan patrones.</li>
          <li>• Usa el Dashboard para explorar la matriz de concurrencia.</li>
          <li>• Si tu análisis toma forma metodológica, crea un nuevo proyecto con el lente apropiado.</li>
        </ul>
      </div>
    </div>
  );
}

interface Props {
  project: Project;
  selectedAnnotationId?: number;
  isOpen: boolean;
  onToggle: () => void;
}

export default function MentorPanel({ project, selectedAnnotationId, isOpen, onToggle }: Props) {
  const meta = LENTE_META[project.lente] ?? LENTE_META.free;

  const MENTOR_MAP: Partial<Record<LenteType, React.ComponentType<{ project: Project; selectedAnnotationId?: number }>>> = {
    grounded:      GroundedMentor,
    phenomenology: PhenomMentor,
    ethnography:   EthnoMentor,
    iap:           IAPMentor,
    breilh:        BreilhMentor,
    free:          FreeMentor,
  };

  const MentorComponent = MENTOR_MAP[project.lente] ?? FreeMentor;

  // Panel colapsado: solo muestra la pestaña vertical con el botón
  if (!isOpen) {
    return (
      <div
        className="flex flex-col items-center justify-start border-l py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{
          width: 36,
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
        }}
        onClick={onToggle}
        title="Abrir Mentor"
      >
        {/* Botón expandir */}
        <button
          className="w-7 h-7 flex items-center justify-center rounded-full mb-3 transition-all"
          style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
        >
          <ChevronLeft size={14} />
        </button>
        {/* Icono rotado del lente */}
        <div
          className="text-[10px] font-bold uppercase tracking-widest mt-2"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            color: meta.color,
            opacity: 0.6,
            userSelect: 'none',
            letterSpacing: '0.15em',
          }}
        >
          Mentor
        </div>
        <div className="mt-3" style={{ color: meta.color, opacity: 0.5 }}>
          {meta.icon}
        </div>
      </div>
    );
  }

  return (
    <aside className="sidebar-right flex flex-col h-full" style={{ minWidth: 280, maxWidth: 380 }}>
      {/* Header del mentor */}
      <div className="section-header flex-shrink-0">
        <div className="flex items-center gap-2">
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <span>Mentor — {meta.label}</span>
          <div
            className="w-2 h-2 rounded-full animate-pulse ml-1"
            style={{ background: meta.color }}
            title="Mentor activo"
          />
        </div>
        {/* Botón cerrar */}
        <button
          className="btn-icon"
          onClick={onToggle}
          title="Ocultar Mentor"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Contenido dinámico del mentor */}
      <div className="flex-1 overflow-y-auto p-3">
        <MentorComponent
          project={project}
          selectedAnnotationId={selectedAnnotationId}
        />
      </div>
    </aside>
  );
}
