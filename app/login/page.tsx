'use client';

import { useState } from 'react';
import { deriveKey } from '@/lib/crypto';
import { createClient } from '@/utils/supabase/client';
import { resetDatabaseInstance } from '@/lib/db';
import { Lock, Unlock, KeyRound, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !email.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Registrar usuario
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error('Error al crear cuenta');
      } else {
        // Iniciar sesión
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (signInError) throw signInError;
        if (!data.user) throw new Error('Usuario no encontrado');
      }

      // El ID del usuario en Supabase será el nombre de la DB local para aislamiento
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        localStorage.setItem('cualidoso_active_user', session.user.id);
        
        // La contraseña sigue siendo la semilla para cifrar la BD local (E2EE)
        await deriveKey(password);
        
        // Reiniciamos la instancia de la DB para que use el nuevo ID de usuario
        resetDatabaseInstance();

        // Ahora podemos usar window.location.href porque la llave persiste en sessionStorage
        window.location.href = '/';
      } else {
        // Probablemente requiere confirmación de email
        if (isSignUp) {
          setError('¡Cuenta creada! Por favor, verifica tu correo electrónico para activar tu cuenta e iniciar sesión.');
        } else {
          setError('No se pudo iniciar sesión. Verifica tus credenciales.');
        }
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la autenticación.');
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-8 shadow-2xl flex flex-col items-center">
        
        <div className="w-16 h-16 rounded-full bg-[var(--surface-hover)] flex items-center justify-center mb-6">
          {isSignUp ? <KeyRound size={32} style={{ color: 'var(--accent)' }}/> : <Lock size={32} style={{ color: 'var(--accent)' }}/>}
        </div>

        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {isSignUp ? 'Crear Cuenta' : 'Desbloquear Cualidoso'}
        </h1>
        
        <p className="text-sm text-center mb-8" style={{ color: 'var(--text-secondary)' }}>
          Autenticación segura con Supabase. Los datos de la investigación se mantendrán cifrados localmente.
        </p>

        <form onSubmit={handleAuth} className="w-full space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (Llave de Cifrado Local)"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: 'var(--rose)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || !email}
            className="w-full rounded-lg py-3 flex items-center justify-center gap-2 font-medium transition-colors"
            style={{ 
              backgroundColor: 'var(--accent)', 
              color: '#fff',
              opacity: loading || !password || !email ? 0.7 : 1 
            }}
          >
            {loading ? 'Cargando...' : isSignUp ? 'Registrarse y Cifrar' : 'Desbloquear'}
            {!loading && !isSignUp && <Unlock size={18} />}
          </button>
        </form>

        <div className="mt-4">
           <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs text-blue-500 hover:underline">
             {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
           </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <h3 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
            <Mail size={12}/> ¿No recibiste el correo o tienes problemas?
          </h3>
          <ul className="text-[10px] text-blue-700 space-y-1 list-disc pl-3 leading-tight">
            <li>Revisa la carpeta de <b>Spam</b> o Correo no deseado.</li>
            <li>Si eres el administrador, desactiva <b>"Confirm Email"</b> en el panel de Supabase (Auth {'>'} Settings) para permitir acceso inmediato.</li>
            <li>Asegúrate de que las <b>Variables de Entorno</b> en Vercel no tengan espacios extra.</li>
            <li>Si el error persiste, intenta abrir la página en modo <b>Incógnito</b>.</li>
          </ul>
        </div>

        <div className="mt-6 text-xs text-center flex flex-col gap-1" style={{ color: 'var(--text-muted)' }}>
          <span>☁️ Autenticación Cloud (Supabase)</span>
          <span>🔒 Cifrado Local (WebCrypto)</span>
        </div>
      </div>
    </div>
  );
}
