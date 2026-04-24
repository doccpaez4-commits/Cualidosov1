'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, ShieldAlert } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }
      
      // Verificamos si el usuario tiene el rol de admin en sus metadatos
      if (session.user.user_metadata?.role !== 'admin') {
        alert('Acceso denegado: Se requieren permisos de administrador.');
        router.replace('/');
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        <Link href="/" className="btn-icon">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Panel de Administración Cloud</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gestión centralizada de identidades con Supabase</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        <div className="card shadow-lg p-8 flex flex-col items-center text-center gap-6">
          
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <ShieldAlert size={32} className="text-blue-500" />
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Gestión de Usuarios Migrada a la Nube
            </h2>
            <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              Para garantizar la seguridad y poder revocar accesos en tiempo real, la gestión de investigadores ahora se realiza directamente desde el <strong>Dashboard de Supabase</strong>.
            </p>
          </div>

          <div className="w-full bg-gray-50 border rounded-lg p-6 text-left mt-4">
            <h3 className="font-semibold mb-3">¿Cómo invitar a un nuevo investigador?</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
              <li>Ingresa a tu proyecto en <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">supabase.com</a>.</li>
              <li>Ve a la sección <strong>Authentication &gt; Users</strong>.</li>
              <li>Haz clic en <strong>"Add User"</strong> y selecciona <strong>"Create new user"</strong> o <strong>"Send invitation"</strong>.</li>
              <li>Ingresa el correo del investigador y una contraseña temporal.</li>
              <li><strong>Importante:</strong> Para que sea Admin, haz clic en el usuario creado, busca "User Metadata" y añade <code>"role": "admin"</code>.</li>
            </ol>
          </div>

          <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-6 text-left mt-2">
            <h3 className="font-semibold text-orange-800 mb-2">⚠️ Importante sobre el Cifrado</h3>
            <p className="text-sm text-orange-700">
              La contraseña que asignes servirá como <strong>Llave Maestra de Cifrado</strong> para el espacio de trabajo local del investigador. Si cambian su contraseña en el futuro, perderán acceso a sus proyectos locales anteriores, ya que la llave de descifrado cambiará.
            </p>
          </div>

          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-primary mt-4 flex items-center gap-2 px-6 py-3"
          >
            Ir al Dashboard de Supabase <ExternalLink size={16} />
          </a>

        </div>
      </div>
    </div>
  );
}
