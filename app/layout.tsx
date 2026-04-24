import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Cualidoso — Análisis Cualitativo',
  description:
    'Plataforma local-first para análisis de datos cualitativos con motor pedagógico metodológico. Sin nube, sin API keys, privacidad total.',
  keywords: ['análisis cualitativo', 'investigación social', 'teoría fundamentada', 'fenomenología', 'etnografía', 'IAP', 'Breilh'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
