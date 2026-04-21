'use client';

import type { LenteType, Project } from '@/types';
import GroundedMentor from './GroundedMentor';
import PhenomMentor from './PhenomMentor';
import EthnoMentor from './EthnoMentor';
import IAPMentor from './IAPMentor';
import BreilhMentor from './BreilhMentor';
import { Layers, FlaskConical, Users, BookOpen, Microscope } from 'lucide-react';

const LENTE_META: Record<LenteType, { label: string; color: string; icon: React.ReactNode }> = {
  grounded:      { label: 'Teoría Fundamentada', color: '#7c6af7', icon: <Layers size={13}/> },
  phenomenology: { label: 'Fenomenología',        color: '#14b8a6', icon: <FlaskConical size={13}/> },
  ethnography:   { label: 'Etnografía',           color: '#f59e0b', icon: <Users size={13}/> },
  iap:           { label: 'IAP (Fals Borda)',     color: '#10b981', icon: <BookOpen size={13}/> },
  breilh:        { label: 'Metacrítica (Breilh)', color: '#ef4444', icon: <Microscope size={13}/> },
};

interface Props {
  project: Project;
  selectedAnnotationId?: number;
}

export default function MentorPanel({ project, selectedAnnotationId }: Props) {
  const meta = LENTE_META[project.lente];

  const MentorComponent = {
    grounded:      GroundedMentor,
    phenomenology: PhenomMentor,
    ethnography:   EthnoMentor,
    iap:           IAPMentor,
    breilh:        BreilhMentor,
  }[project.lente];

  return (
    <aside className="sidebar-right flex flex-col h-full">
      {/* Header del mentor */}
      <div className="section-header flex-shrink-0">
        <div className="flex items-center gap-2">
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <span>Mentor — {meta.label}</span>
        </div>
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: meta.color }}
          title="Mentor activo"
        />
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
