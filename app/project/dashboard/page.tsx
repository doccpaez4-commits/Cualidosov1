'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectContext } from '@/components/ProjectProvider';
import Link from 'next/link';
import { ArrowLeft, Grid, BarChart2, Cloud, GitBranch, ScatterChart as ScatterIcon, FileText, Table, Layers, FlaskConical, Users, BookOpen, Microscope, ChevronLeft, ChevronRight } from 'lucide-react';
import ConcurrenceMatrix from '@/components/dashboard/ConcurrenceMatrix';
import ConceptMap from '@/components/dashboard/ConceptMap';
import WordCloud from '@/components/dashboard/WordCloud';
import SankeyBreilh from '@/components/dashboard/SankeyBreilh';
import CodeScatter from '@/components/dashboard/CodeScatter';
import SummarySheet from '@/components/dashboard/SummarySheet';
import Matrix4S from '@/components/dashboard/Matrix4S';
import BreilhCircleMap from '@/components/dashboard/BreilhCircleMap';
import BreilhTable from '@/components/dashboard/BreilhTable';
import TrendChart from '@/components/dashboard/TrendChart';
import VerbatimList from '@/components/ui/VerbatimList';

// Paneles metodológicos específicos
import PhenomChart from '@/components/dashboard/PhenomChart';
import EthnoChart from '@/components/dashboard/EthnoChart';
import IAPChart from '@/components/dashboard/IAPChart';
import GroundedChart from '@/components/dashboard/GroundedChart';
import BibliographyTab from '@/components/dashboard/BibliographyTab';

import type { VerbatimResult } from '@/types';
import { getAllVerbatims } from '@/lib/db';

type DashView = 
  | 'matrix' | 'conceptmap' | 'wordcloud' | 'scatter' | 'trend' | 'summary'
  | 'matrix4s' | 'sankey' | 'circlemap' | 'breilhtable'
  | 'phenom' | 'ethno' | 'iap' | 'grounded'
  | 'biblio';

export default function DashboardPage() {
  const { project, codes } = useProjectContext();
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

  // ── Vistas comunes a todos los lentes ──
  const commonViews: { id: DashView; label: string; icon: React.ReactNode }[] = [
    { id: 'matrix',     label: 'Concurrencia',    icon: <Grid size={14}/> },
    { id: 'conceptmap', label: 'Mapa Jerárquico', icon: <BarChart2 size={14}/> },
    { id: 'wordcloud',  label: 'Nube Palabras',   icon: <Cloud size={14}/> },
    { id: 'scatter',    label: 'Saturación',       icon: <ScatterIcon size={14}/> },
    { id: 'trend',      label: 'Acumulación',      icon: <BarChart2 size={14}/> },
    { id: 'summary',    label: 'Resumen',          icon: <FileText size={14}/> },
    { id: 'biblio',     label: 'Bibliografía',     icon: <BookOpen size={14}/> },
  ];

  // ── Vistas específicas por lente ──
  const lenteViews: { id: DashView; label: string; icon: React.ReactNode; lentes: string[] }[] = [
    { id: 'grounded', label: 'Fundament.',   icon: <Layers size={14}/>,     lentes: ['grounded'] },
    { id: 'phenom',   label: 'Fenoménol.',   icon: <FlaskConical size={14}/>, lentes: ['phenomenology'] },
    { id: 'ethno',    label: 'Etnografía',   icon: <Users size={14}/>,         lentes: ['ethnography'] },
    { id: 'iap',      label: 'IAP',          icon: <BookOpen size={14}/>,      lentes: ['iap'] },
    { id: 'matrix4s', label: 'Matriz 4S',    icon: <Table size={14}/>,         lentes: ['breilh'] },
    { id: 'sankey',   label: 'Flujo Breilh', icon: <GitBranch size={14}/>,     lentes: ['breilh'] },
    { id: 'circlemap',label: 'Mapa Jerárquico 4S', icon: <Layers size={14}/>, lentes: ['breilh'] },
    { id: 'breilhtable',label: 'Cuadro Analítico', icon: <FileText size={14}/>, lentes: ['breilh'] },
  ];

  const visibleLenteViews = lenteViews.filter(v => v.lentes.includes(project.lente));
  const allViews = [...commonViews, ...visibleLenteViews];

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 200 : scrollLeft + 200;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="app-header flex-shrink-0 no-print">
        <Link href={`/project?id=${project.id}`} className="btn-icon" title="Volver al análisis">
          <ArrowLeft size={16}/>
        </Link>
        <div className="w-px h-5" style={{ background: 'var(--border)' }} />
        <span className="font-semibold text-sm hidden sm:block" style={{ color: 'var(--text-primary)' }}>
          Dashboard — <span className="opacity-60">{project.name}</span>
        </span>
        <div className="flex-1"/>

        {/* Tabs de vistas con scroll controlado */}
        <div className="relative flex items-center group ml-4" style={{ maxWidth: '65vw' }}>
          <button 
            className="absolute -left-8 p-1.5 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-accent transition-all opacity-0 group-hover:opacity-100 z-10"
            onClick={() => scroll('left')}
            title="Anterior"
          >
            <ChevronLeft size={16} />
          </button>
          
          <nav 
            ref={scrollRef}
            className="flex gap-0.5 overflow-x-auto no-scrollbar scroll-smooth w-full pb-1 px-2"
          >
            {allViews.map(v => (
              <button key={v.id}
                className={`tab ${activeView === v.id ? 'active' : ''} flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs`}
                onClick={() => setActiveView(v.id)}
                style={{ borderBottom: 'none' }}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </nav>

          <button 
            className="absolute -right-8 p-1.5 rounded-full bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-accent transition-all opacity-0 group-hover:opacity-100 z-10"
            onClick={() => scroll('right')}
            title="Siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main chart */}
        <div className="flex-1 overflow-auto p-4">
          <div className="h-full w-full">
            {activeView === 'matrix' && (
              <ConcurrenceMatrix projectId={project.id!} onSelect={setSelectedVerbatims} verbatims={verbatims} />
            )}
            {activeView === 'conceptmap' && (
              <ConceptMap verbatims={verbatims} projectId={project.id!} />
            )}
            {activeView === 'wordcloud' && (
              <WordCloud projectId={project.id!} stopwords={project.stopwords ?? []} verbatims={verbatims} />
            )}
            {activeView === 'sankey' && (
              <SankeyBreilh projectId={project.id!} onSelect={setSelectedVerbatims} verbatims={verbatims} />
            )}
            {activeView === 'scatter' && (
              <CodeScatter verbatims={verbatims} />
            )}
            {activeView === 'trend' && (
              <TrendChart verbatims={verbatims} />
            )}
            {activeView === 'summary' && (
              <SummarySheet verbatims={verbatims} />
            )}
            {activeView === 'matrix4s' && (
              <Matrix4S verbatims={verbatims} />
            )}
            {activeView === 'circlemap' && (
              <BreilhCircleMap verbatims={verbatims} />
            )}
            {activeView === 'breilhtable' && (
              <BreilhTable verbatims={verbatims} />
            )}

            {/* ── Paneles metodológicos específicos ── */}
            {activeView === 'phenom' && (
              <PhenomChart verbatims={verbatims} projectId={project.id!} />
            )}
            {activeView === 'ethno' && (
              <EthnoChart verbatims={verbatims} projectId={project.id!} />
            )}
            {activeView === 'iap' && (
              <IAPChart verbatims={verbatims} projectId={project.id!} />
            )}
            {activeView === 'grounded' && (
              <GroundedChart verbatims={verbatims} codes={codes} />
            )}
            {activeView === 'biblio' && (
              <BibliographyTab lente={project.lente} />
            )}
          </div>
        </div>

        {/* Verbatim sidebar */}
        {selectedVerbatims.length > 0 && activeView !== 'summary' && (
          <div className="w-80 flex-shrink-0 border-l overflow-y-auto no-print"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <VerbatimList verbatims={selectedVerbatims} onClose={() => setSelectedVerbatims([])} />
          </div>
        )}
      </div>
    </div>
  );
}
