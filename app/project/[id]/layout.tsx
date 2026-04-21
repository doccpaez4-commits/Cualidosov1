import { ProjectProvider } from '@/components/ProjectProvider';

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const projectId = parseInt(params.id, 10);

  return (
    <ProjectProvider projectId={projectId}>
      {children}
    </ProjectProvider>
  );
}
