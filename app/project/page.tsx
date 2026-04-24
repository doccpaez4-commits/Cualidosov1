'use client';

import { useState, useEffect } from 'react';
import { useProjectContext } from '@/components/ProjectProvider';
import CorpusSidebar from '@/components/sidebar/CorpusSidebar';
import CodeTree from '@/components/sidebar/CodeTree';
import WorkCanvas from '@/components/canvas/WorkCanvas';
import MentorPanel from '@/components/mentor/MentorPanel';
import Link from 'next/link';
import {
  ArrowLeft, BarChart2, Layers, FlaskConical,
  Users, BookOpen, Microscope, Download, Pencil
} from 'lucide-react';
import { exportProject } from '@/lib/exportProject';

const LENTE_ICONS: Record<string, React.ReactNode> = {
  free:          <Pencil size={13}/>,
  grounded:      <Layers size={13}/>,
  phenomenology: <FlaskConical size={13}/>,
  ethnography:   <Users size={13}/>,
  iap:           <BookOpen size={13}/>,
  breilh:        <Microscope size={13}/>,
};

const LENTE_COLORS: Record<string, string> = {
  free: '#64748b', grounded: '#7c6af7', phenomenology: '#14b8a6',
  ethnography: '#f59e0b', iap: '#10b981', breilh: '#ef4444',
};

const LENTE_LABELS: Record<string, string> = {
  free: 'Práctica Libre', grounded: 'Teoría Fundamentada',
  phenomenology: 'Fenomenología', ethnography: 'Etnografía',
  iap: 'IAP', breilh: 'Metacrítica',
};

export default function ProjectPage() {
  const { project, selectedAnnotationId } = useProjectContext();

  // Persistir preferencia del mentor en localStorage
  const [mentorOpen, setMentorOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('cualidoso_mentor_open');
    return saved === null ? true : saved === 'true';
  });

  // Track last export
  const [daysSinceExport, setDaysSinceExport] = useState<number>(0);

  useEffect(() => {
    if (!project) return;
    const stored = localStorage.getItem(`cualidoso_last_export_${project.id}`);
    if (stored) {
      const date = new Date(stored);
      const diffTime = Math.abs(new Date().getTime() - date.getTime());
      setDaysSinceExport(Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    } else {
      setDaysSinceExport(999);
    }
  }, [project]);

  function toggleMentor() {
    setMentorOpen(prev => {
      const next = !prev;
      localStorage.setItem('cualidoso_mentor_open', String(next));
      return next;
    });
  }

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
    if (!project) return;
    await exportProject(project.id!);
    localStorage.setItem(`cualidoso_last_export_${project.id}`, new Date().toISOString());
    setDaysSinceExport(0);
  }

  return (
    <div
      className="app-layout"
      style={{
        // Grid dinámico: cuando el mentor está cerrado, columna derecha es mínima (36px)
        gridTemplateColumns: mentorOpen
          ? '280px 1fr 340px'
          : '280px 1fr 36px',
        transition: 'grid-template-columns 0.25s ease',
      }}
    >
      {/* Header */}
      <header className="app-header">
        <Link href="/" className="btn-icon" title="Volver a proyectos">
          <ArrowLeft size={16}/>
        </Link>

        <div className="w-px h-5" style={{ background: 'var(--border)' }} />

        {/* Nombre del proyecto */}
        <h1 className="font-semibold text-lg truncate max-w-xs" style={{ color: 'var(--text-primary)' }}>
          {project?.name || 'Cargando...'}
        </h1>

        {/* Badge del lente */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs flex-shrink-0"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
          {LENTE_ICONS[lente]} {LENTE_LABELS[lente]}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dashboard */}
        <Link
          href={`/project/dashboard?id=${project.id}`}
          className="btn btn-ghost text-xs"
        >
          <BarChart2 size={14}/> Dashboard
        </Link>

        {/* Exportar */}
        <div className="relative">
          <button 
            className="btn text-xs font-semibold" 
            style={{ 
              background: daysSinceExport > 3 ? 'var(--rose)' : 'transparent',
              color: daysSinceExport > 3 ? '#fff' : 'var(--text-secondary)',
              border: daysSinceExport > 3 ? 'none' : '1px solid var(--border)'
            }}
            onClick={handleExport} 
            title="Exportar proyecto como .research"
          >
            <Download size={14}/> Exportar
          </button>
          {daysSinceExport > 3 && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          )}
        </div>
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

      {/* Right: Mentor con toggle */}
      <MentorPanel
        project={project}
        selectedAnnotationId={selectedAnnotationId ?? undefined}
        isOpen={mentorOpen}
        onToggle={toggleMentor}
      />
    </div>
  );
}
