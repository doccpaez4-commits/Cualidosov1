'use client';

import { useProjectContext } from '@/components/ProjectProvider';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import TextViewer from '@/components/canvas/TextViewer';
import ImageViewer from '@/components/canvas/ImageViewer';
import type { Document } from '@/types';

export default function WorkCanvas() {
  const { activeDocumentId } = useProjectContext();
  const [doc, setDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (!activeDocumentId) { setDoc(null); return; }
    db.documents.get(activeDocumentId).then(d => setDoc(d ?? null));
  }, [activeDocumentId]);

  if (!activeDocumentId || !doc) {
    return (
      <div className="canvas-area flex-1 flex items-center justify-center">
        <div className="text-center space-y-3" style={{ color: 'var(--text-muted)' }}>
          <div className="text-5xl">📖</div>
          <p className="text-base">Selecciona un documento para comenzar</p>
          <p className="text-xs">o importa uno desde el panel izquierdo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-area h-full w-full flex flex-col overflow-hidden">
      {/* Document title bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{doc.name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: doc.type === 'image' ? 'rgba(245,158,11,0.15)' : 'rgba(124,106,247,0.15)',
                   color: doc.type === 'image' ? '#f59e0b' : '#7c6af7' }}>
          {doc.type.toUpperCase()}
        </span>
      </div>

      {/* Visor según tipo */}
      <div className="flex-1 overflow-hidden">
        {doc.type === 'image' ? <ImageViewer /> : <TextViewer />}
      </div>
    </div>
  );
}
