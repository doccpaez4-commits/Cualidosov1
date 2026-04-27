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
    <div className="flex h-screen w-screen items-center justify-center p-4 relative bg-slate-50 overflow-hidden">
      {/* Fondo Dinámico Académico */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(143,32,61,0.03)_0%,_transparent_40%),_radial-gradient(circle_at_80%_80%,_rgba(15,118,110,0.03)_0%,_transparent_40%)]" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-teal-600 to-accent opacity-50" style={{ backgroundColor: 'var(--accent)' }} />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] flex flex-col items-center relative z-10">
        
        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 rotate-3 shadow-sm">
          <div className="-rotate-3">
            {isSignUp ? <KeyRound size={40} style={{ color: 'var(--accent)' }}/> : <Lock size={40} style={{ color: 'var(--accent)' }}/>}
          </div>
        </div>

        <h1 className="text-3xl font-black mb-2 tracking-tight text-slate-900">
          {isSignUp ? 'Crear Cuenta' : 'Acceso Seguro'}
        </h1>
        
        <p className="text-sm text-center mb-10 text-slate-500 leading-relaxed">
          Los datos de tu investigación se mantienen <span className="text-slate-800 font-semibold">cifrados localmente</span> y bajo tu total control.
        </p>

        <form onSubmit={handleAuth} className="w-full space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identidad</label>
            <div className="relative group">
              <Mail size={18} className="absolute left-4 top-3.5 transition-colors group-focus-within:text-accent" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@institucion.edu"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/5"
                style={{ color: 'var(--text-primary)' }}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Llave de Cifrado</label>
            <div className="relative group">
              <Lock size={18} className="absolute left-4 top-3.5 transition-colors group-focus-within:text-accent" style={{ color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña personal"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all focus:bg-white focus:border-accent focus:ring-4 focus:ring-accent/5"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg animate-pulse">
              <p className="text-xs text-center text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password || !email}
            className="w-full rounded-xl py-4 flex items-center justify-center gap-3 font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
            style={{ 
              backgroundColor: 'var(--accent)', 
              color: '#fff',
              opacity: loading || !password || !email ? 0.7 : 1 
            }}
          >
            {loading ? 'Validando...' : isSignUp ? 'Registrar y Activar Cifrado' : 'Desbloquear Acceso'}
            {!loading && !isSignUp && <Unlock size={20} />}
          </button>
        </form>

        <div className="mt-8">
           <button onClick={() => setIsSignUp(!isSignUp)} className="text-xs font-semibold text-accent hover:underline opacity-80 transition-opacity hover:opacity-100" style={{ color: 'var(--accent)' }}>
             {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
           </button>
        </div>

        <div className="mt-10 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Mail size={14}/> Centro de Ayuda
          </h3>
          <ul className="text-[11px] text-slate-500 space-y-2 leading-tight">
            <li className="flex gap-2"><span>•</span> Revisa tu carpeta de <b>Spam</b> para el correo de activación.</li>
            <li className="flex gap-2"><span>•</span> Si eres administrador, desactiva <b>"Confirm Email"</b> en Supabase.</li>
            <li className="flex gap-2"><span>•</span> Usa el modo <b>Incógnito</b> si tienes problemas de caché.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
