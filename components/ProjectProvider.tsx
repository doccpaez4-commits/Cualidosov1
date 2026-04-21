'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Project, Document, Code, Category } from '@/types';
import { db } from '@/lib/db';

interface ProjectContext {
  project: Project | null;
  documents: Document[];
  codes: Code[];
  categories: Category[];
  activeDocumentId: number | null;
  activeCodeId: number | null;
  selectedAnnotationId: number | null;
  setActiveDocumentId: (id: number | null) => void;
  setActiveCodeId: (id: number | null) => void;
  setSelectedAnnotationId: (id: number | null) => void;
  refreshCodes: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

const ProjectCtx = createContext<ProjectContext>({
  project: null, documents: [], codes: [], categories: [],
  activeDocumentId: null, activeCodeId: null, selectedAnnotationId: null,
  setActiveDocumentId: () => {}, setActiveCodeId: () => {},
  setSelectedAnnotationId: () => {}, refreshCodes: async () => {}, refreshDocuments: async () => {},
});

export function useProjectContext() { return useContext(ProjectCtx); }

export function ProjectProvider({ projectId, children }: { projectId: number; children: React.ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<number | null>(null);
  const [activeCodeId, setActiveCodeId] = useState<number | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null);

  const refreshDocuments = useCallback(async () => {
    const docs = await db.documents.where('projectId').equals(projectId).toArray();
    setDocuments(docs);
    if (docs.length > 0 && !activeDocumentId) setActiveDocumentId(docs[0].id!);
  }, [projectId, activeDocumentId]);

  const refreshCodes = useCallback(async () => {
    const [c, cats] = await Promise.all([
      db.codes.where('projectId').equals(projectId).toArray(),
      db.categories.where('projectId').equals(projectId).toArray(),
    ]);
    setCodes(c); setCategories(cats);
  }, [projectId]);

  useEffect(() => {
    db.projects.get(projectId).then(p => p && setProject(p));
    refreshDocuments();
    refreshCodes();
  }, [projectId, refreshDocuments, refreshCodes]);

  return (
    <ProjectCtx.Provider value={{
      project, documents, codes, categories,
      activeDocumentId, activeCodeId, selectedAnnotationId,
      setActiveDocumentId, setActiveCodeId, setSelectedAnnotationId,
      refreshCodes, refreshDocuments,
    }}>
      {children}
    </ProjectCtx.Provider>
  );
}
