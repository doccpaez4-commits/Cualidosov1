'use client';

import { useState, useEffect } from 'react';
import { useProjectContext } from '@/components/ProjectProvider';
import Link from 'next/link';
import { ArrowLeft, Grid, BarChart2, Cloud, GitBranch } from 'lucide-react';
import ConcurrenceMatrix from '@/components/dashboard/ConcurrenceMatrix';
import HierarchyTreemap from '@/components/dashboard/HierarchyTreemap';
import WordCloud from '@/components/dashboard/WordCloud';
import SankeyBreilh from '@/components/dashboard/SankeyBreilh';
import VerbatimList from '@/components/ui/VerbatimList';
import type { VerbatimResult } from '@/types';
import { getAllVerbatims } from '@/lib/db';

type DashView = 'matrix' | 'treemap' | 'wordcloud' | 'sankey';

export default function DashboardPage() {
  const { project } = useProjectContext();
  const [activeView, setActiveView] = useState<DashView>('matrix');
  const [verbatims, setVerbatims] = useState<VerbatimResult[]>([]);
  const [selectedVerbatims, setSelectedVerbatims] = useState<VerbatimResult[]>([]);

  useEffect(() => {
    if (!project?.id) return;
    getAllVerbatims(project.id).then(v => setVerbatims(v as VerbatimResult[]));
  }, [project?.id]);

  if (!project) return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  const views: { id: DashView; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'matrix',    label: 'Concurrencia',   icon: <Grid size={14}/>,     show: true },
    { id: 'treemap',   label: 'Jerarquía',       icon: <BarChart2 size={14}/>, show: true },
    { id: 'wordcloud', label: 'Nube de Palabras', icon: <Cloud size={14}/>,   show: true },
    { id: 'sankey',   label: 'Flujo Breilh',     icon: <GitBranch size={14}/>, show: project.lente === 'breilh' },
  ].filter(v => v.show);

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="app-header flex-shrink-0">
        <Link href={`/project/${project.id}`} className="btn-icon" title="Volver al análisis">
          <ArrowLeft size={16}/>
        </Link>
        <div className="w-px h-5" style={{ background: 'var(--border)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Dashboard — {project.name}
        </span>
        <div className="flex-1"/>
        {/* Tabs de vistas */}
        <nav className="flex gap-1">
          {views.map(v => (
            <button key={v.id}
              className={`tab ${activeView === v.id ? 'active' : ''} flex items-center gap-1.5 text-xs`}
              onClick={() => setActiveView(v.id)}
              style={{ borderBottom: 'none' }}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main chart */}
        <div className="flex-1 overflow-auto p-4">
          <div className="h-full w-full">
            {activeView === 'matrix' && (
              <ConcurrenceMatrix projectId={project.id!} onSelect={setSelectedVerbatims} verbatims={verbatims} />
            )}
            {activeView === 'treemap' && (
              <HierarchyTreemap projectId={project.id!} onSelect={setSelectedVerbatims} verbatims={verbatims} />
            )}
            {activeView === 'wordcloud' && (
              <WordCloud projectId={project.id!} stopwords={project.stopwords ?? []} verbatims={verbatims} />
            )}
            {activeView === 'sankey' && (
              <SankeyBreilh projectId={project.id!} onSelect={setSelectedVerbatims} verbatims={verbatims} />
            )}
          </div>
        </div>

        {/* Verbatim sidebar */}
        {selectedVerbatims.length > 0 && (
          <div className="w-80 flex-shrink-0 border-l overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <VerbatimList verbatims={selectedVerbatims} onClose={() => setSelectedVerbatims([])} />
          </div>
        )}
      </div>
    </div>
  );
}
