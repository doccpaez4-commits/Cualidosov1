'use client';

import { Suspense } from 'react';
import { ProjectProvider } from '@/components/ProjectProvider';
import { useSearchParams } from 'next/navigation';

function ProjectLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  const projectId = idParam ? parseInt(idParam, 10) : 0;

  if (!projectId) return <div>ID de proyecto no válido.</div>;

  return (
    <ProjectProvider projectId={projectId}>
      {children}
    </ProjectProvider>
  );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ProjectLayoutInner>{children}</ProjectLayoutInner>
    </Suspense>
  );
}
