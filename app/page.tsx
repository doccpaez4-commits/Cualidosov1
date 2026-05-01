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
  LogOut, Shield, Cloud, CloudUpload, Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { exportProject } from '@/lib/exportProject';
import { importProject } from '@/lib/importProject';
import { uploadProjectToCloud, uploadFileToCloud, isPremiumUser, listCloudProjects, downloadProjectFromCloud, CloudProject } from '@/lib/supabaseSync';
import { useRef, useMemo } from 'react';

const LENTE_META: Record<LenteType, { label: string; color: string; icon: React.ReactNode }> = {
  free:          { label: 'Práctica Libre',       color: '#64748b', icon: <Pencil size={14}/> },
  grounded:      { label: 'Teoría Fundamentada', color: '#0358a1', icon: <Layers size={14}/> },
  phenomenology: { label: 'Fenomenología',        color: '#0d9488', icon: <FlaskConical size={14}/> },
  ethnography:   { label: 'Etnografía',           color: '#b45309', icon: <Users size={14}/> },
  iap:           { label: 'IAP (Fals Borda)',     color: '#059669', icon: <BookOpen size={14}/> },
  breilh:        { label: 'Metacrítica (Breilh)', color: '#1e293b', icon: <Microscope size={14}/> },
};

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showLenteSelector, setShowLenteSelector] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Show usage modal only once on first visit
    const usageSeen = localStorage.getItem('cualidoso_usage_seen') === 'true';
    if (!usageSeen) {
      setShowUsageModal(true);
    }

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        setUsername(user.email || 'Investigador');
        setUserId(user.id);
        // Verificamos el rol en los metadatos del usuario de Supabase
        if (user.user_metadata?.role === 'admin') {
          setIsAdmin(true);
        }

        // Verificar premium en tabla profiles
        const premium = await isPremiumUser(user.id);
        setIsPremium(premium);

        if (premium) {
          setLoadingCloud(true);
          const cp = await listCloudProjects(user.id);
          setCloudProjects(cp);
          setLoadingCloud(false);
        }

        setIsLoggedIn(true);
        loadProjects();
      } else {
        setIsLoggedIn(false);
        setLoading(false);
      }
    });
  }, []);

  async function loadProjects() {
    const all = await getAllProjects();
    setProjects(all);
    setLoading(false);
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
      stopwords: [],
    });

    router.push(`/project?id=${projectId}`);
  }

  async function confirmDelete(id: number) {
    setLoading(true);
    try {
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
      await loadProjects();
    } finally {
      setDeletingId(null);
      setLoading(false);
    }
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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const newId = await importProject(file);
      // Si es premium, subir también al cloud
      if (isPremium && userId) {
        try {
          await uploadFileToCloud(file, userId);
        } catch {
          // No bloquear si el cloud falla
        }
      }
      await loadProjects();
      alert('Proyecto importado con éxito.' + (isPremium ? ' \u2601️ Copia subida al cloud.' : ''));
    } catch (err: any) {
      alert(`Error al importar: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSyncToCloud(e: React.MouseEvent, projectId: number) {
    e.stopPropagation();
    if (!userId) return;
    setSyncingId(projectId);
    setSyncMsg('Subiendo...');
    try {
      await uploadProjectToCloud(projectId, userId, (msg) => setSyncMsg(msg));
      setSyncMsg('✓ Sincronizado');
    } catch (err: any) {
      setSyncMsg(`Error: ${err.message}`);
    } finally {
      setTimeout(() => { setSyncingId(null); setSyncMsg(''); }, 2500);
    }
  }

  async function handleOpenCloudProject(path: string) {
    if (downloadingPath) return;
    setDownloadingPath(path);
    try {
      const file = await downloadProjectFromCloud(path);
      const newId = await importProject(file);
      router.push(`/project?id=${newId}`);
    } catch (err: any) {
      alert(`Error al descargar de la nube: ${err.message}`);
      setDownloadingPath(null);
    }
  }

  // Agrupar proyectos en la nube para mostrar solo la última versión por nombre de proyecto
  const uniqueCloudProjects = useMemo(() => {
    const map = new Map<string, CloudProject>();
    cloudProjects.forEach(cp => {
      // El nombre del proyecto termina en _YYYY-MM-DD.research
      const baseName = cp.name.replace(/_\d{4}-\d{2}-\d{2}\.research$/, '');
      const existing = map.get(baseName);
      if (!existing || new Date(cp.updatedAt) > new Date(existing.updatedAt)) {
        map.set(baseName, cp);
      }
    });
    return Array.from(map.values());
  }, [cloudProjects]);

  // ==== VISTA DE TÉRMINOS Y BIENVENIDA (Rediseño Centralizado) ====
  if (isLoggedIn === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-y-auto" style={{
        backgroundImage: "url('/fondo-2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}>
        {/* Overlay dark/light para asegurar legibilidad */}
        <div className="absolute inset-0 bg-slate-900/40 z-0" />
        
        <div className="max-w-5xl w-full p-8 relative z-10 flex flex-col md:flex-row gap-12 items-center md:items-stretch mt-12 md:mt-0">
          
          <div className="flex-1 text-center md:text-left flex flex-col justify-center">
            <img src="/logo.png" alt="Cualidoso Logo" className="w-80 md:w-96 h-auto mb-6 mx-auto md:mx-0 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" />
            <h1 className="text-6xl font-black mb-4 tracking-tight text-white drop-shadow-lg">Cualidoso 2.0</h1>
            <p className="text-xl font-medium text-white/90 mb-6 uppercase tracking-wider drop-shadow-md">
              Investigación cualitativa para todos y todas
            </p>
            
            <div className="space-y-4 text-white/90 text-base leading-relaxed max-w-xl mx-auto md:mx-0 bg-black/30 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
              <p>
                Cualidoso es una herramienta de software libre diseñada para democratizar el análisis cualitativo. Nuestro objetivo es brindar a investigadores, estudiantes y comunidades un entorno potente, seguro y accesible para estructurar sus hallazgos, desarrollar teorías y generar impacto social.
              </p>
              <p>
                Ya sea que apliques Teoría Fundamentada, Fenomenología, Etnografía, IAP o Metacrítica, Cualidoso adapta sus herramientas metodológicas a tus necesidades sin perder rigor científico.
              </p>
            </div>
          </div>

          <div className="w-full md:w-[400px] flex flex-col gap-6 flex-shrink-0 justify-center">
            
            {/* Tarjeta Free */}
            <button 
              onClick={() => router.push('/login?tier=free')}
              className="bg-white/95 hover:bg-white backdrop-blur-xl p-8 rounded-[2rem] border border-white/50 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-accent/30 text-left group flex flex-col h-full"
            >
              <h3 className="text-2xl font-black mb-2 text-slate-800 group-hover:text-accent transition-colors">Versión para todos y todas</h3>
              <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">Uso gratuito y privacidad total. Regístrate y envía un correo solicitando autorización para acceder a las funciones avanzadas.</p>
              <ul className="space-y-3 text-sm text-slate-500 mb-8 font-medium flex-1">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-accent transition-colors"/> Todos los lentes metodológicos</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-accent transition-colors"/> Cifrado AES-256 local</li>
                <li className="flex items-center gap-2 text-accent font-bold"><div className="w-1.5 h-1.5 rounded-full bg-accent transition-colors"/> Opción de pedir acceso a la Nube</li>
              </ul>
              <div className="w-full py-4 bg-slate-100 rounded-2xl text-center text-sm font-bold text-slate-600 group-hover:bg-accent group-hover:text-white transition-colors">
                Ingresar a versión libre
              </div>
            </button>

            {/* Tarjeta Premium */}
            <button 
              onClick={() => router.push('/login?tier=premium')}
              className="bg-accent hover:bg-accent-dark backdrop-blur-xl p-8 rounded-[2rem] border border-accent/50 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-accent/50 text-left group flex flex-col h-full relative"
            >
              <div className="absolute -top-4 -right-2 bg-gradient-to-r from-amber-300 to-amber-500 text-amber-950 text-[10px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg transform rotate-6 border border-amber-200">
                Con más cositas
              </div>
              <h3 className="text-2xl font-black mb-2 text-white">Versión Premium</h3>
              <p className="text-sm text-white/80 mb-6 font-medium leading-relaxed">Máxima seguridad con respaldo automático en la nube y sincronización fluida entre equipos para usuarios autorizados.</p>
              <ul className="space-y-3 text-sm text-white/70 mb-8 font-medium flex-1">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-white transition-colors"/> Respaldo en Supabase Cloud</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-white transition-colors"/> Sincronización multi-dispositivo</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/30 group-hover:bg-white transition-colors"/> Soporte prioritario</li>
              </ul>
              <div className="w-full py-4 bg-white/10 rounded-2xl text-center text-sm font-bold text-white border border-white/20 group-hover:bg-white group-hover:text-accent transition-colors">
                Ingresar a versión Premium
              </div>
            </button>

          </div>
        </div>
      </div>
    );
  }

  // ==== VISTA NORMAL ====
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero Header */}
      <header className="border-b sticky top-0 z-50 shadow-sm transition-colors duration-300" 
        style={{ 
          borderColor: isPremium ? 'transparent' : 'var(--border)', 
          background: isPremium ? 'linear-gradient(90deg, #1e293b, #0f172a)' : '#ffffff',
          color: isPremium ? '#ffffff' : 'inherit'
        }}>
        <div className="w-full px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Cualidoso" className="w-28 md:w-32 h-auto object-contain drop-shadow-sm" />
            <div>
              <h1 className="font-bold text-lg" style={{ color: isPremium ? '#fff' : 'var(--text-primary)' }}>Cualidoso <span className="text-xs font-normal opacity-70">v 2.0</span></h1>
              <p className="text-xs" style={{ color: isPremium ? '#94a3b8' : 'var(--text-secondary)' }}>Análisis Cualitativo para la Soberanía Sanitaria</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <span className="text-xs px-3 py-1 rounded-full font-bold hidden sm:flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }}>
                <Star size={11} fill="currentColor"/> Con más cositas
              </span>
            ) : (
              <span className="text-xs px-3 py-1 rounded-full font-medium hidden sm:block" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(3,88,161,0.2)' }}>
                ● Entorno Local Seguro
              </span>
            )}
            <div className="w-px h-6 mx-2" style={{ background: isPremium ? 'rgba(255,255,255,0.2)' : 'var(--border)' }} />
            <span className="text-xs font-semibold mr-2" style={{ color: isPremium ? '#cbd5e1' : 'var(--text-secondary)' }}>
              Hola, <span style={{ color: isPremium ? '#fff' : 'var(--accent)' }}>{username}</span>
            </span>
            {isAdmin && (
              <button 
                className={isPremium ? "flex items-center gap-1.5 px-3 py-2 rounded-md text-white hover:bg-white/10 transition-colors text-xs font-bold" : "btn btn-ghost text-xs"}
                onClick={() => router.push('/admin')}
              >
                <Shield size={14} /> Admin
              </button>
            )}
            <button 
              className={isPremium ? "flex items-center gap-1.5 px-3 py-2 rounded-md text-white hover:bg-red-500/20 hover:text-red-300 transition-colors text-xs font-bold" : "btn btn-ghost text-xs"}
              onClick={handleLogout} title="Cerrar sesión"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full px-8 py-10">
        
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".research"
              className="hidden"
            />
            <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} /> Importar Proyecto (.research)
            </button>
          </div>
        </div>

        {/* Información de Respaldo y Almacenamiento */}
        {isPremium ? (
          <div className="mb-8 p-6 rounded-2xl border flex flex-col md:flex-row items-center gap-6 animate-fade-in shadow-md" 
            style={{ background: 'linear-gradient(135deg, #fef3c7, #fef08a)', borderColor: '#fde68a' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-amber-500 text-white">
              <CloudUpload size={24} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-sm mb-1 text-amber-900">Modo Premium: Nube Cifrada Activa</h3>
              <p className="text-xs leading-relaxed text-amber-800">
                Tu trabajo cuenta con <strong>cifrado AES-256 local</strong> y se almacena bajo el mismo cifrado en la nube de Supabase. 
                Al usar el botón <strong>Sync Cloud</strong>, creas una copia maestra respaldada y protegida. 
                Tus datos mantienen total privacidad.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost text-xs bg-white text-amber-900 hover:bg-amber-50 border border-amber-200" onClick={() => window.open('https://github.com/doccpaez4/Cualidoso', '_blank')}>
                <BookOpen size={14} /> Documentación
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-6 rounded-2xl border flex flex-col md:flex-row items-center gap-6 animate-fade-in" 
            style={{ background: 'var(--accent-light)', borderColor: 'rgba(3,88,161,0.15)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: '#fff', color: 'var(--accent)' }}>
              <Shield size={24} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--accent)' }}>Tu trabajo es privado, cifrado y 100% local</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Para garantizar tu seguridad y tranquilidad, Cualidoso <strong>no guarda datos en la nube</strong>. Todo se almacena exclusivamente en tu navegador mediante <strong>cifrado AES-256</strong>. 
                Es <strong style={{ color: 'var(--accent)' }}>vital descargar el archivo .research</strong> periódicamente como respaldo maestro cifrado.
              </p>
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <button className="btn btn-ghost text-xs bg-white text-slate-700 w-full" onClick={() => window.open('https://github.com/doccpaez4/Cualidoso', '_blank')}>
                <BookOpen size={14} /> Documentación
              </button>
              <button className="btn text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold border-none w-full whitespace-nowrap" onClick={() => window.open('mailto:doccpaez4@gmail.com?subject=Solicitud%20Premium%20Cualidoso')}>
                <Star size={14} fill="currentColor" className="mr-1"/> Quiero más cositas
              </button>
            </div>
          </div>
        )}

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
                    className="flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group p-4 rounded-xl transition-all border border-transparent hover:border-accent/40 hover:bg-slate-50 shadow-sm hover:shadow-md"
                    style={{ border: '1px solid var(--border)' }}
                    onClick={() => router.push(`/project?id=${project.id}`)}
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
                    <div className="flex items-center gap-2 mt-3 sm:mt-0" onClick={e => e.stopPropagation()}>
                      {deletingId === project.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                          <span className="text-[10px] font-bold text-red-600 mr-1 uppercase">¿Seguro?</span>
                          <button 
                            className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 shadow-sm"
                            onClick={() => confirmDelete(project.id!)}
                          >
                            Eliminar
                          </button>
                          <button 
                            className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-200"
                            onClick={() => setDeletingId(null)}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 sm:opacity-40 group-hover:opacity-100 transition-opacity duration-200">
                          {isPremium && (
                            <button
                              className="btn btn-ghost text-xs hidden sm:flex items-center gap-1"
                              title="Sincronizar con la nube"
                              onClick={e => handleSyncToCloud(e, project.id!)}
                              disabled={syncingId === project.id}
                              style={syncingId === project.id ? { color: '#f59e0b' } : {}}
                            >
                              <Cloud size={14} />
                              {syncingId === project.id ? syncMsg || 'Subiendo...' : 'Sync Cloud'}
                            </button>
                          )}
                          <button className="btn btn-ghost text-xs hidden sm:flex" title="Descargar Copia" onClick={e => downloadProject(e, project.id!)}>
                            <Download size={14} /> Exportar
                          </button>
                          <button className="btn-icon text-gray-400 hover:text-red-500 hover:bg-red-50" title="Eliminar proyecto" onClick={() => setDeletingId(project.id!)}>
                            <Trash2 size={16} />
                          </button>
                          <ChevronRight size={20} className="hidden sm:block text-gray-400 ml-2" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Proyectos en la Nube */}
          {isPremium && (uniqueCloudProjects.length > 0 || loadingCloud) && (
            <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold flex items-center gap-2 text-amber-600">
                  <Cloud size={18} /> Respaldos en la Nube
                </h3>
                <span className="text-xs font-medium px-2 py-1 bg-amber-50 text-amber-600 rounded">
                  {uniqueCloudProjects.length} disponibles
                </span>
              </div>

              {loadingCloud ? (
                <div className="py-6 flex justify-center">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid gap-3">
                  {uniqueCloudProjects.map(cp => {
                    const displayName = cp.name.replace(/_\d{4}-\d{2}-\d{2}\.research$/, '').replace(/_/g, ' ') || cp.name;
                    const isDownloading = downloadingPath === cp.path;
                    return (
                      <div
                        key={cp.path}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group p-4 rounded-xl transition-all border border-amber-200 bg-white hover:bg-amber-50"
                        onClick={() => handleOpenCloudProject(cp.path)}
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600 border border-amber-200">
                          <CloudUpload size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg truncate mb-1 text-amber-900">
                            {displayName}
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-amber-100 text-amber-800">
                              Copia de Seguridad
                            </span>
                            <span className="flex items-center gap-1 text-xs text-amber-700/80">
                              <Clock size={12} /> {new Date(cp.updatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 sm:mt-0">
                          {isDownloading ? (
                            <span className="text-sm font-bold text-amber-600 flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> Descargando...
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              Restaurar <ChevronRight size={16} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
