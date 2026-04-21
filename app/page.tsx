'use client';

import { useState, useEffect } from 'react';
import { db, getAllProjects } from '@/lib/db';
import type { Project, LenteType } from '@/types';
import LenteSelector from '@/components/ui/LenteSelector';
import {
  Plus, FolderOpen, Trash2, Clock, FlaskConical,
  BookOpen, Users, Layers, Microscope, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const LENTE_META: Record<LenteType, { label: string; color: string; icon: React.ReactNode }> = {
  grounded:      { label: 'Teoría Fundamentada', color: '#7c6af7', icon: <Layers size={14}/> },
  phenomenology: { label: 'Fenomenología',        color: '#14b8a6', icon: <FlaskConical size={14}/> },
  ethnography:   { label: 'Etnografía',           color: '#f59e0b', icon: <Users size={14}/> },
  iap:           { label: 'IAP (Fals Borda)',     color: '#10b981', icon: <BookOpen size={14}/> },
  breilh:        { label: 'Metacrítica (Breilh)', color: '#ef4444', icon: <Microscope size={14}/> },
};

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showLenteSelector, setShowLenteSelector] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const all = await getAllProjects();
    setProjects(all);
    setLoading(false);
  }

  async function createProject(lente: LenteType) {
    const name = newProjectName.trim() || `Proyecto ${new Date().toLocaleDateString('es-CO')}`;
    const now = new Date();
    const id = await db.projects.add({
      name,
      lente,
      createdAt: now,
      updatedAt: now,
      stopwords: DEFAULT_STOPWORDS,
    });
    router.push(`/project/${id}`);
  }

  async function deleteProject(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;
    await Promise.all([
      db.projects.delete(id),
      db.documents.where('projectId').equals(id).delete(),
      db.codes.where('projectId').equals(id).delete(),
      db.categories.where('projectId').equals(id).delete(),
      db.annotations.where('projectId').equals(id).delete(),
      db.memos.where('projectId').equals(id).delete(),
      db.epojeEntries.where('projectId').equals(id).delete(),
      db.fieldNotes.where('projectId').equals(id).delete(),
      db.iapCycles.where('projectId').equals(id).delete(),
    ]);
    loadProjects();
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'var(--accent)' }}>
              C
            </div>
            <div>
              <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Cualidoso</h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Análisis Cualitativo Local-First</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#fdf3f5', color: 'var(--accent)', border: '1px solid rgba(143,32,61,0.2)' }}>
              ● Local — Sin nube
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-4 font-semibold"
            style={{ background: '#fdf3f5', color: 'var(--accent)', border: '1px solid rgba(143,32,61,0.2)' }}>
            <span>Motor Pedagógico Metodológico</span>
          </div>
          <h2 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Tu laboratorio de análisis
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Analiza datos cualitativos con el acompañamiento de los grandes autores de cada método.
            Privacidad total — todo se guarda en tu dispositivo.
          </p>
        </div>

        {/* Nuevo proyecto */}
        <div className="card mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Nuevo proyecto
          </p>
          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="Nombre del proyecto (ej. Entrevistas SIS 2025)..."
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setShowLenteSelector(true)}
            />
            <button className="btn btn-primary" onClick={() => setShowLenteSelector(true)}>
              <Plus size={16} /> Crear
            </button>
          </div>
        </div>

        {/* Lista de proyectos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Proyectos recientes
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={48} />
              <p>No hay proyectos aún.<br />Crea tu primer proyecto arriba.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map(project => {
                const meta = LENTE_META[project.lente];
                return (
                  <div
                    key={project.id}
                    className="card flex items-center gap-4 cursor-pointer group"
                    style={{ transition: 'all 0.15s', '--hover-bg': 'var(--bg-hover)' } as React.CSSProperties}
                    onClick={() => router.push(`/project/${project.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,106,247,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    {/* Ícono del lente */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}>
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {project.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${meta.color}20`, color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={11} />
                          {new Date(project.updatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn-icon" title="Eliminar" onClick={e => deleteProject(e, project.id!)}>
                        <Trash2 size={14} style={{ color: 'var(--rose)' }} />
                      </button>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Selector de lente */}
      {showLenteSelector && (
        <LenteSelector
          onSelect={lente => { setShowLenteSelector(false); createProject(lente); }}
          onClose={() => setShowLenteSelector(false)}
        />
      )}
    </div>
  );
}

const DEFAULT_STOPWORDS = [
  'de','la','que','el','en','y','a','los','del','se','las','un','por','con','una',
  'su','para','es','al','lo','como','más','pero','sus','le','ya','o','fue','este',
  'ha','si','porque','esta','son','entre','cuando','muy','sin','sobre','ser',
  'tiene','también','me','hasta','hay','donde','quien','desde','todo','nos','durante',
  'todos','uno','les','ni','contra','otros','ese','eso','ante','ellos','e','esto',
  'mí','antes','algunos','qué','unos','yo','otro','otras','otra','él','tanto','sa',
  'estos','mucho','quienes','nada','muchos','cual','poco','ella','estar','estas',
  'algunas','algo','nosotros','mi','mis','tú','te','ti','tu','tus','ellas','nosotras',
  'vosotros','vosotras','os','mío','mía','míos','mías','tuyo','tuya','tuyos','tuyas',
  'suyo','suya','suyos','suyas','nuestro','nuestra','nuestros','nuestras','vuestro',
  'vuestra','vuestros','vuestras','esos','esas','estoy','estás','está','estamos',
  'estáis','están','estuve','estuviste','estuvo','estuvimos','estuvisteis','estuvieron',
];
