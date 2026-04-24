'use client';

import { useState, useEffect } from 'react';
import { db, getAllProjects } from '@/lib/db';
import { createClient } from '@/utils/supabase/client';
import type { Project, LenteType } from '@/types';
import LenteSelector from '@/components/ui/LenteSelector';
import UsageModal from '@/components/ui/UsageModal';
import {
  Plus, FolderOpen, Trash2, Clock, FlaskConical,
  BookOpen, Users, Layers, Microscope, ChevronRight, Upload, Download, Pencil,
  LogOut, Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { exportProject } from '@/lib/exportProject';

const LENTE_META: Record<LenteType, { label: string; color: string; icon: React.ReactNode }> = {
  free:          { label: 'Práctica Libre',       color: '#64748b', icon: <Pencil size={14}/> },
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
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  
  // Terms and usage tracking
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean>(true); // Se inicia en true para evitar flasheos

  useEffect(() => {
    const accepted = localStorage.getItem('cualidoso_terms_accepted') === 'true';
    if (!accepted) setHasAcceptedTerms(false);

    // Show usage modal on 2nd use (not first, not if already registered)
    const alreadyRegistered = localStorage.getItem('cualidoso_usage_registered') === 'true';
    const skipCount = parseInt(localStorage.getItem('cualidoso_usage_skip_count') || '0');
    const useCount = parseInt(localStorage.getItem('cualidoso_use_count') || '0');
    const nextCount = useCount + 1;
    localStorage.setItem('cualidoso_use_count', String(nextCount));
    if (!alreadyRegistered && nextCount >= 2 && skipCount < 3) {
      setShowUsageModal(true);
    }

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUsername(session.user.email || 'Investigador');
        // Verificamos el rol en los metadatos del usuario de Supabase
        if (session.user.user_metadata?.role === 'admin') {
          setIsAdmin(true);
        }
      }
    });

    loadProjects();
  }, []);

  async function loadProjects() {
    const all = await getAllProjects();
    setProjects(all);
    setLoading(false);
  }

  function acceptTerms() {
    localStorage.setItem('cualidoso_terms_accepted', 'true');
    setHasAcceptedTerms(true);
  }

  async function createProject(lente: LenteType) {
    if (!isAdmin && projects.length >= 3) {
      alert('Has alcanzado el límite de 3 proyectos para tu cuenta de investigador. Contacta al administrador para más capacidad.');
      return;
    }

    const name = newProjectName.trim() || `Proyecto ${new Date().toLocaleDateString('es-CO')}`;
    const now = new Date();
    const projectId = await db.projects.add({
      name,
      lente,
      createdAt: now,
      updatedAt: now,
      stopwords: DEFAULT_STOPWORDS,
    });

    // (Se eliminó la creación de códigos por defecto para Metacrítica de Breilh a solicitud del usuario)

    router.push(`/project?id=${projectId}`);
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

  async function downloadProject(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    await exportProject(id);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem('cualidoso_active_user');
    window.location.href = '/login';
  }

  // ==== VISTA DE TÉRMINOS Y BIENVENIDA ====
  if (!hasAcceptedTerms) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 relative" style={{ background: 'var(--bg-secondary)' }}>
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--bg-hover)_0%,_transparent_100%)] opacity-50" />
        <div className="card max-w-2xl w-full p-10 relative z-10 shadow-2xl animate-fade-in text-center flex flex-col items-center">
          
          <img src="/cualidoso.png" alt="Cualidoso Logo" className="w-48 h-auto object-contain mb-8 mix-blend-multiply drop-shadow-md" />
          
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--accent)' }}>Bienvenido a Cualidoso</h1>
          <p className="text-sm font-semibold uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>Versión v1.0.0</p>
          
          <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
            <strong>Proyecto de Código Abierto para investigación cualitativa</strong> para democratizar el conocimiento y trabajar en pro de la soberanía sanitaria. Desarrollado por: <i>(Autores)</i>.
          </p>

          <div className="text-left bg-white p-6 rounded-xl border mb-8 text-sm" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>📚 Usos y Utilidades</h3>
            <ul className="list-disc pl-5 mb-4 space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>Análisis de relatos, textos y narrativas para Teoría Fundamentada, Fenomenología, Etnografía e IAP.</li>
              <li>Módulo analítico exclusivo para Metacrítica (Breilh).</li>
              <li>Generación de matrices de concurrencia, jerarquías conceptuales e inferencia multinivel.</li>
              <li>Exportación de gráficos apta para artículos científicos.</li>
            </ul>

            <h3 className="font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>🔒 Confidencialidad y Seguridad Local</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Para garantizar la confidencialidad absoluta de la información de sus <strong>personas</strong> e interlocutores, <strong>los datos NO se guardan en la nube ni viajan por internet</strong>. Cualidoso funciona 100% a nivel local en la memoria de su navegador. Si desea usar su proyecto en otra computadora, deberá descargarlo manualmente.
            </p>
          </div>

          <button className="btn btn-primary text-base px-8 py-3 w-full" onClick={acceptTerms}>
            Aceptar Términos de Referencia e Iniciar Uso
          </button>
        </div>
      </div>
    );
  }

  // ==== VISTA NORMAL ====
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', background: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/cualidoso.png" alt="Cualidoso" className="w-12 h-auto object-contain mix-blend-multiply" />
            <div>
              <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Cualidoso <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>v1.0.0</span></h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Análisis Cualitativo para la Soberanía Sanitaria</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full font-medium hidden sm:block" style={{ background: '#fdf3f5', color: 'var(--accent)', border: '1px solid rgba(143,32,61,0.2)' }}>
              ● Entorno Local Seguro
            </span>
            <div className="w-px h-6 mx-2" style={{ background: 'var(--border)' }} />
            <span className="text-xs font-semibold mr-2" style={{ color: 'var(--text-secondary)' }}>
              Hola, <span style={{ color: 'var(--accent)' }}>{username}</span>
            </span>
            {isAdmin && (
              <button className="btn btn-ghost text-xs" onClick={() => router.push('/admin')}>
                <Shield size={14} /> Admin
              </button>
            )}
            <button className="btn btn-ghost text-xs" onClick={handleLogout} title="Cerrar sesión">
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        
        {/* Actions Row */}
        <div className="flex flex-wrap items-end gap-6 mb-8">
          {/* Nuevo proyecto */}
          <div className="flex-1 min-w-[300px]">
             <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Nuevo proyecto
            </p>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Nombre de la investigación..."
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setShowLenteSelector(true)}
              />
              <button className="btn btn-primary whitespace-nowrap" onClick={() => setShowLenteSelector(true)}>
                <Plus size={16} /> Crear Proyecto
              </button>
            </div>
          </div>

          <div className="w-px h-10 hidden md:block" style={{ background: 'var(--border)' }} />

          {/* Restaurar Proyecto */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-right" style={{ color: 'var(--text-muted)' }}>
              Restaurar Copia
            </p>
            <button className="btn btn-ghost" onClick={() => alert('Función de importación en desarrollo.')}>
              <Upload size={16} /> Importar Proyecto (.research)
            </button>
          </div>
        </div>

        {/* Lista de proyectos */}
        <div className="bg-white rounded-xl shadow-sm border p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Mis Proyectos
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-600">
              {projects.length} totales
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-70">
              <FolderOpen size={48} className="mb-4 text-gray-300" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No hay investigaciones activas.</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Crea un nuevo proyecto para comenzar a codificar.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map(project => {
                const meta = LENTE_META[project.lente];
                return (
                  <div
                    key={project.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group p-4 rounded-xl transition-all"
                    style={{ border: '1px solid var(--border)', '--hover-bg': 'var(--bg-hover)' } as React.CSSProperties}
                    onClick={() => router.push(`/project?id=${project.id}`)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(143,32,61,0.4)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Ícono del lente */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}>
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-lg truncate mb-1" style={{ color: 'var(--text-primary)' }}>
                        {project.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs px-2.5 py-1 rounded-md font-medium"
                          style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}>
                          {meta.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={12} /> Actualizado el {new Date(project.updatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 mt-3 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn btn-ghost text-xs hidden sm:flex" title="Descargar Copia" onClick={e => downloadProject(e, project.id!)}>
                        <Download size={14} /> Exportar
                      </button>
                      <button className="btn-icon" title="Eliminar proyecto" onClick={e => deleteProject(e, project.id!)}>
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                      <ChevronRight size={20} className="hidden sm:block text-gray-400 ml-2" />
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

      {/* Modal de impacto / seguimiento de uso */}
      {showUsageModal && (
        <UsageModal onClose={() => setShowUsageModal(false)} />
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
