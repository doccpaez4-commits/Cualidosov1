'use client';

import { useProjectContext } from '@/components/ProjectProvider';
import CorpusSidebar from '@/components/sidebar/CorpusSidebar';
import CodeTree from '@/components/sidebar/CodeTree';
import WorkCanvas from '@/components/canvas/WorkCanvas';
import MentorPanel from '@/components/mentor/MentorPanel';
import Link from 'next/link';
import {
  ArrowLeft, BarChart2, Layers, FlaskConical,
  Users, BookOpen, Microscope, Save, Download
} from 'lucide-react';
import { exportProject } from '@/lib/exportProject';

const LENTE_ICONS = {
  grounded: <Layers size={13}/>,
  phenomenology: <FlaskConical size={13}/>,
  ethnography: <Users size={13}/>,
  iap: <BookOpen size={13}/>,
  breilh: <Microscope size={13}/>,
};

const LENTE_COLORS = {
  grounded: '#7c6af7', phenomenology: '#14b8a6', ethnography: '#f59e0b',
  iap: '#10b981', breilh: '#ef4444',
};

const LENTE_LABELS = {
  grounded: 'Teoría Fundamentada', phenomenology: 'Fenomenología',
  ethnography: 'Etnografía', iap: 'IAP', breilh: 'Metacrítica',
};

export default function ProjectPage() {
  const { project, selectedAnnotationId } = useProjectContext();

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const lente = project.lente;
  const color = LENTE_COLORS[lente];

  async function handleExport() {
    await exportProject(project.id!);
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <Link href="/" className="btn-icon" title="Volver a proyectos">
          <ArrowLeft size={16}/>
        </Link>

        <div className="w-px h-5" style={{ background: 'var(--border)' }} />

        {/* Nombre del proyecto */}
        <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)', maxWidth: 240 }}>
          {project.name}
        </span>

        {/* Badge del lente */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
          {LENTE_ICONS[lente]} {LENTE_LABELS[lente]}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dashboard */}
        <Link
          href={`/project/${project.id}/dashboard`}
          className="btn btn-ghost text-xs"
        >
          <BarChart2 size={14}/> Dashboard
        </Link>

        {/* Exportar */}
        <button className="btn btn-ghost text-xs" onClick={handleExport} title="Exportar proyecto como .research">
          <Download size={14}/> Exportar
        </button>
      </header>

      {/* Left sidebar: Corpus + Codes */}
      <div className="sidebar-left flex flex-col" style={{ overflow: 'hidden' }}>
        {/* Corpus (top half) */}
        <div style={{ flex: '0 0 auto', maxHeight: '45%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CorpusSidebar />
        </div>

        {/* Divider */}
        <div className="flex-shrink-0 h-px" style={{ background: 'var(--border)' }} />

        {/* Codes (bottom half) */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CodeTree />
        </div>
      </div>

      {/* Central canvas */}
      <WorkCanvas />

      {/* Right: Mentor */}
      <MentorPanel project={project} selectedAnnotationId={selectedAnnotationId ?? undefined} />
    </div>
  );
}
