'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectContext } from '@/components/ProjectProvider';
import CorpusSidebar from '@/components/sidebar/CorpusSidebar';
import CodeTree from '@/components/sidebar/CodeTree';
import WorkCanvas from '@/components/canvas/WorkCanvas';
import MentorPanel from '@/components/mentor/MentorPanel';
import Link from 'next/link';
import {
  ArrowLeft, BarChart2, Layers, FlaskConical,
  Users, BookOpen, Microscope, Download, Pencil, Cloud
} from 'lucide-react';
import { exportProject } from '@/lib/exportProject';
import BackupReminder from '@/components/ui/BackupReminder';
import { isPremiumUser, uploadProjectToCloud } from '@/lib/supabaseSync';
import { createClient } from '@/utils/supabase/client';

const LENTE_ICONS: Record<string, React.ReactNode> = {
  free:          <Pencil size={13}/>,
  grounded:      <Layers size={13}/>,
  phenomenology: <FlaskConical size={13}/>,
  ethnography:   <Users size={13}/>,
  iap:           <BookOpen size={13}/>,
  breilh:        <Microscope size={13}/>,
};

const LENTE_COLORS: Record<string, string> = {
  free: '#64748b', grounded: '#0358a1', phenomenology: '#0d9488',
  ethnography: '#b45309', iap: '#059669', breilh: '#1e293b',
};

const LENTE_LABELS: Record<string, string> = {
  free: 'Práctica Libre', grounded: 'Teoría Fundamentada',
  phenomenology: 'Fenomenología', ethnography: 'Etnografía',
  iap: 'IAP', breilh: 'Metacrítica',
};

export default function ProjectPage() {
  const { project, selectedAnnotationId } = useProjectContext();

  const [mentorOpen, setMentorOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('cualidoso_mentor_open');
    return saved === null ? true : saved === 'true';
  });

  const [daysSinceExport, setDaysSinceExport] = useState<number>(0);
  const [isPremium, setIsPremium] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        const premium = await isPremiumUser(session.user.id);
        setIsPremium(premium);
      }
    });
  }, []);

  useEffect(() => {
    if (!project?.id || !isPremium || !userId) return;
    
    // Auto save every 5 minutos (300,000 ms)
    const interval = setInterval(async () => {
      setIsAutoSyncing(true);
      try {
        await uploadProjectToCloud(project.id!, userId);
        setLastCloudSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('Auto-sync failed:', err);
      } finally {
        setIsAutoSyncing(false);
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [project, isPremium, userId]);
  // Panel widths in px
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(340);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingLeft = useRef(false);
  const draggingRight = useRef(false);

  const onMouseMoveLeft = useCallback((e: MouseEvent) => {
    if (!draggingLeft.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = Math.max(200, Math.min(480, e.clientX - rect.left));
    setLeftWidth(newWidth);
  }, []);

  const onMouseMoveRight = useCallback((e: MouseEvent) => {
    if (!draggingRight.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = Math.max(240, Math.min(480, rect.right - e.clientX));
    setRightWidth(newWidth);
  }, []);

  const stopDrag = useCallback(() => {
    draggingLeft.current = false;
    draggingRight.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMoveLeft);
    window.addEventListener('mousemove', onMouseMoveRight);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMoveLeft);
      window.removeEventListener('mousemove', onMouseMoveRight);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onMouseMoveLeft, onMouseMoveRight, stopDrag]);

  useEffect(() => {
    if (!project) return;
    const stored = localStorage.getItem(`cualidoso_last_export_${project.id}`);
    if (stored) {
      const diffTime = Math.abs(new Date().getTime() - new Date(stored).getTime());
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
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="app-header h-[60px] flex-shrink-0" style={{ gridColumn: 'unset' }}>
        <Link href="/" className="btn-icon" title="Volver a proyectos">
          <ArrowLeft size={16}/>
        </Link>
        <div className="w-px h-5" style={{ background: 'var(--border)' }} />
        <h1 className="font-semibold text-lg truncate max-w-xs" style={{ color: 'var(--text-primary)' }}>
          {project?.name || 'Cargando...'}
        </h1>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs flex-shrink-0"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
          {LENTE_ICONS[lente]} {LENTE_LABELS[lente]}
        </div>
        <div className="flex-1" />
        <Link href={`/project/dashboard?id=${project.id}`} className="btn btn-ghost text-xs">
          <BarChart2 size={14}/> Dashboard
        </Link>
        <div className="relative flex items-center gap-4 ml-2">
          {isPremium && (
            <div className="flex items-center text-[10px] sm:text-xs mr-2" style={{ color: 'var(--text-muted)' }}>
              {isAutoSyncing ? (
                <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Cloud size={14} className="animate-pulse" /> Guardando...
                </span>
              ) : lastCloudSync ? (
                <span className="flex items-center gap-1.5 text-green-600 font-medium" title="Respaldo automático activo">
                  <Cloud size={14} /> Listo ({lastCloudSync})
                </span>
              ) : (
                <span className="flex items-center gap-1.5 opacity-70 font-medium" title="Autoguardado en la nube cada 5 minutos">
                  <Cloud size={14} /> Auto-Sync ON
                </span>
              )}
            </div>
          )}
          
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
        </div>
      </header>

      {/* Paneles redimensionables */}
      <div ref={containerRef} className="flex-1 overflow-hidden flex select-none">
        {/* Left sidebar */}
        <div style={{ width: leftWidth, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          className="sidebar-left border-r-0">
          <div style={{ flex: '0 0 auto', maxHeight: '45%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <CorpusSidebar />
          </div>
          <div className="flex-shrink-0 h-px" style={{ background: 'var(--border)' }} />
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <CodeTree />
          </div>
        </div>

        {/* Divider izquierdo */}
        <div
          style={{ width: 4, cursor: 'col-resize', background: 'var(--border)', flexShrink: 0, transition: 'background 0.15s' }}
          onMouseDown={() => {
            draggingLeft.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          onMouseEnter={e => { (e.target as HTMLDivElement).style.background = 'var(--accent)'; }}
          onMouseLeave={e => { (e.target as HTMLDivElement).style.background = 'var(--border)'; }}
        />

        {/* Central canvas */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 320, display: 'flex', flexDirection: 'column' }}>
          <WorkCanvas />
        </div>

        {/* Divider derecho (solo si mentor abierto) */}
        {mentorOpen && (
          <div
            style={{ width: 4, cursor: 'col-resize', background: 'var(--border)', flexShrink: 0 }}
            onMouseDown={() => {
              draggingRight.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
            onMouseEnter={e => { (e.target as HTMLDivElement).style.background = 'var(--accent)'; }}
            onMouseLeave={e => { (e.target as HTMLDivElement).style.background = 'var(--border)'; }}
          />
        )}

        {/* Mentor */}
        {mentorOpen ? (
          <div style={{ width: rightWidth, flexShrink: 0, overflow: 'hidden' }}>
            <MentorPanel
              project={project}
              selectedAnnotationId={selectedAnnotationId ?? undefined}
              isOpen={true}
              onToggle={toggleMentor}
            />
          </div>
        ) : (
          <div className="flex-shrink-0 h-full">
            <MentorPanel
              project={project}
              selectedAnnotationId={selectedAnnotationId ?? undefined}
              isOpen={false}
              onToggle={toggleMentor}
            />
          </div>
        )}
      </div>

      <BackupReminder onExport={handleExport} />
    </div>
  );
}

