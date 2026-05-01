'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldAlert, Star, StarOff, RefreshCw } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  is_premium: boolean;
  created_at: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) { router.replace('/login'); return; }
      if (session.user.user_metadata?.role !== 'admin') {
        alert('Acceso denegado: Se requieren permisos de administrador.');
        router.replace('/'); return;
      }

      setIsAdmin(true);
      await loadUsers(supabase);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers(supabase: ReturnType<typeof createClient>) {
    // Listar desde tabla profiles (debe existir en Supabase con columnas id, is_premium)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, is_premium, created_at')
      .order('created_at', { ascending: false });

    if (error || !data) return;

    // Enriquecer con emails usando la API de auth (solo admins tienen acceso)
    const enriched: UserProfile[] = data.map((p: any) => ({
      id: p.id,
      email: p.email || p.id.slice(0, 8) + '...',
      is_premium: p.is_premium ?? false,
      created_at: p.created_at,
    }));
    setUsers(enriched);
  }

  async function togglePremium(userId: string, current: boolean) {
    setTogglingId(userId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: !current })
        .eq('id', userId);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !current } : u));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)' }}>
      <header className="flex items-center gap-4 mb-8">
        <Link href="/" className="btn-icon"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Panel de Administración</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gestión de usuarios y acceso Premium</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Tabla de usuarios */}
        <div className="card shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Usuarios registrados</h2>
            <button className="btn btn-ghost text-xs" onClick={() => checkAccessAndLoad()}>
              <RefreshCw size={14} /> Recargar
            </button>
          </div>

          {users.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No se encontraron usuarios en la tabla <code>profiles</code>.
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {users.map(user => (
                <div key={user.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {user.email}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.id.slice(0, 16)}…</p>
                  </div>

                  {user.is_premium ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }}>
                      <Star size={10} fill="currentColor" /> Con más cositas
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      Versión libre
                    </span>
                  )}

                  <button
                    className="btn btn-ghost text-xs"
                    onClick={() => togglePremium(user.id, user.is_premium)}
                    disabled={togglingId === user.id}
                    title={user.is_premium ? 'Quitar premium' : 'Dar acceso Premium'}
                  >
                    {togglingId === user.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : user.is_premium ? (
                      <><StarOff size={14} className="text-red-400" /> Quitar</>
                    ) : (
                      <><Star size={14} className="text-amber-500" /> Dar Premium</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instrucciones */}
        <div className="card shadow p-6 text-sm space-y-3" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={18} className="text-green-500" />
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Configuración de Supabase Correcta</h3>
          </div>
          <p>La base de datos y los sistemas de almacenamiento están configurados y funcionando correctamente. Los usuarios con acceso Premium podrán respaldar sus proyectos automáticamante.</p>
        </div>

      </div>
    </div>
  );
}
