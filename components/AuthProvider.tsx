'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { hasKey } from '@/lib/crypto';
import { Loader } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          console.error('Supabase configuration missing');
          setIsChecking(false);
          if (pathname !== '/login') router.replace('/login');
          return;
        }

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (pathname !== '/login') {
          if (!hasKey() || !session) {
            router.replace('/login');
          } else {
            setIsChecking(false);
          }
        } else {
          if (session && hasKey()) {
             router.replace('/');
          } else {
             setIsChecking(false);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsChecking(false);
        if (pathname !== '/login') router.replace('/login');
      }
    }
    checkAuth();
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-primary)]">
        <Loader className="animate-spin" style={{ color: 'var(--accent)' }} size={32} />
      </div>
    );
  }

  // Si estamos en login o ya tenemos llave, renderizar hijos
  return <>{children}</>;
}
