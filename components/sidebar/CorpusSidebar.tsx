'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useProjectContext } from '@/components/ProjectProvider';
import { db } from '@/lib/db';
import { processFile, ACCEPTED_FILE_TYPES } from '@/lib/fileProcessor';
import {
  FileText, Image, Upload, Trash2, File,
  ChevronDown, ChevronRight, Loader
} from 'lucide-react';
import type { Document } from '@/types';

export default function CorpusSidebar() {
  const { documents, activeDocumentId, setActiveDocumentId, refreshDocuments, project } = useProjectContext();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!project) return;
    setUploading(true); setUploadError(null);
    try {
      for (const file of acceptedFiles) {
        const result = await processFile(file);
        const doc: Omit<Document, 'id'> = {
          projectId: project.id!,
          name: file.name,
          type: result.type,
          content: result.content,
          blobData: result.blobData,
          mimeType: result.mimeType,
          size: result.size,
          createdAt: new Date(),
        };
        await db.documents.add(doc);
      }
      await refreshDocuments();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }, [project, refreshDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    multiple: true,
  });

  async function deleteDocument(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm('¿Eliminar este documento y todas sus anotaciones?')) return;
    await db.annotations.where('documentId').equals(id).delete();
    await db.documents.delete(id);
    await refreshDocuments();
    if (activeDocumentId === id) setActiveDocumentId(null);
  }

  const txtDocs = documents.filter(d => d.type === 'txt' || d.type === 'pdf');
  const imgDocs = documents.filter(d => d.type === 'image');

  return (
    <aside className="sidebar-left flex flex-col h-full">
      {/* Header */}
      <div className="section-header flex-shrink-0">
        <span>Corpus</span>
        <span style={{ color: 'var(--text-muted)' }}>{documents.length} archivos</span>
      </div>

      {/* Dropzone */}
      <div className="p-2 flex-shrink-0">
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-xs">Procesando archivos...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={20} />
              <span className="text-xs">
                {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra TXT, PDF o imágenes'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>o haz clic para seleccionar</span>
            </div>
          )}
        </div>
        {uploadError && (
          <p className="text-xs mt-1 px-1" style={{ color: 'var(--rose)' }}>{uploadError}</p>
        )}
      </div>

      {/* Lista de documentos */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {/* Textos */}
        {txtDocs.length > 0 && (
          <div>
            <button
              className="flex items-center gap-1 w-full py-1 text-xs font-semibold"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              TEXTOS ({txtDocs.length})
            </button>
            {expanded && txtDocs.map(doc => (
              <DocItem key={doc.id} doc={doc}
                active={activeDocumentId === doc.id}
                onClick={() => setActiveDocumentId(doc.id!)}
                onDelete={e => deleteDocument(e, doc.id!)} />
            ))}
          </div>
        )}

        {/* Imágenes */}
        {imgDocs.length > 0 && (
          <div>
            <div className="flex items-center gap-1 py-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              <Image size={12}/> IMÁGENES ({imgDocs.length})
            </div>
            {imgDocs.map(doc => (
              <DocItem key={doc.id} doc={doc}
                active={activeDocumentId === doc.id}
                onClick={() => setActiveDocumentId(doc.id!)}
                onDelete={e => deleteDocument(e, doc.id!)} />
            ))}
          </div>
        )}

        {/* Empty */}
        {documents.length === 0 && (
          <div className="empty-state">
            <File size={32} />
            <p className="text-xs">Importa tu primer documento</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function DocItem({ doc, active, onClick, onDelete }: {
  doc: Document; active: boolean;
  onClick: () => void; onDelete: (e: React.MouseEvent) => void;
}) {
  const isImage = doc.type === 'image';
  return (
    <div
      className={`code-tree-item group ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {isImage
        ? <Image size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        : <FileText size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      }
      <span className="flex-1 truncate text-xs" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {doc.name}
      </span>
      {doc.size && (
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {Math.round(doc.size / 1024)}kb
        </span>
      )}
      <button className="btn-icon opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={onDelete}>
        <Trash2 size={12} style={{ color: 'var(--rose)' }} />
      </button>
    </div>
  );
}
