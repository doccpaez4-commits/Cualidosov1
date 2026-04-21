'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useProjectContext } from '@/components/ProjectProvider';
import { db } from '@/lib/db';
import type { Annotation, Code } from '@/types';
import { MessageSquare, X } from 'lucide-react';

interface AnnotationWithCode {
  annotation: Annotation;
  code: Code;
}

interface MemoPopup {
  annotationId: number;
  x: number;
  y: number;
}

export default function TextViewer() {
  const { activeDocumentId, codes, activeCodeId, setSelectedAnnotationId, project } = useProjectContext();
  const [content, setContent] = useState<string>('');
  const [annotations, setAnnotations] = useState<AnnotationWithCode[]>([]);
  const [memoPopup, setMemoPopup] = useState<MemoPopup | null>(null);
  const [memoText, setMemoText] = useState('');
  const [selectionInfo, setSelectionInfo] = useState<{ start: number; end: number; text: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar documento
  useEffect(() => {
    if (!activeDocumentId) return;
    db.documents.get(activeDocumentId).then(doc => {
      if (doc?.content) setContent(doc.content);
    });
  }, [activeDocumentId]);

  // Cargar anotaciones
  const loadAnnotations = useCallback(async () => {
    if (!activeDocumentId) return;
    const anns = await db.annotations.where('documentId').equals(activeDocumentId).toArray();
    const codeIds = Array.from(new Set(anns.map(a => a.codeId)));
    const codeList = await db.codes.bulkGet(codeIds);
    const codeMap = new Map(codeList.filter(Boolean).map(c => [c!.id!, c!]));
    setAnnotations(anns.filter(a => codeMap.has(a.codeId)).map(a => ({
      annotation: a,
      code: codeMap.get(a.codeId)!,
    })));
  }, [activeDocumentId]);

  useEffect(() => { loadAnnotations(); }, [loadAnnotations]);

  // Manejar selección de texto
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !containerRef.current) return;
    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    // Calcular offset dentro del texto completo
    const preRange = document.createRange();
    preRange.setStart(containerRef.current, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const end = start + text.length;

    // Obtener coordenadas para el popup
    const rect = range.getBoundingClientRect();

    setSelectionInfo({ start, end, text, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  }, []);

  // Crear anotación con el código indicado
  async function annotateSelection(codeId: number) {
    if (!selectionInfo || !activeDocumentId || !project) return;

    await db.annotations.add({
      documentId: activeDocumentId,
      projectId: project.id!,
      codeId,
      start: selectionInfo.start,
      end: selectionInfo.end,
      text: selectionInfo.text,
      createdAt: new Date(),
    });
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
    await loadAnnotations();
  }

  async function saveMemo() {
    if (!memoText.trim() || !memoPopup || !project) return;
    await db.memos.add({
      annotationId: memoPopup.annotationId,
      projectId: project.id!,
      content: memoText.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setMemoText('');
    setMemoPopup(null);
  }

  async function deleteAnnotation(id: number) {
    await db.annotations.delete(id);
    await loadAnnotations();
    setMemoPopup(null);
  }

  // Renderizar texto con resaltado multitonos solapado
  const rendered = useMemo(() => {
    if (!content) return null;

    // Construir un mapa de eventos de apertura/cierre para cada posición
    type Event = { pos: number; type: 'open' | 'close'; annotation: AnnotationWithCode };
    const events: Event[] = [];

    annotations.forEach(aw => {
      const { start, end } = aw.annotation;
      if (start == null || end == null) return;
      events.push({ pos: start, type: 'open', annotation: aw });
      events.push({ pos: end, type: 'close', annotation: aw });
    });

    // Ordenar eventos
    events.sort((a, b) => a.pos - b.pos || (a.type === 'close' ? -1 : 1));

    const parts: React.ReactNode[] = [];
    const active: AnnotationWithCode[] = [];
    let cursor = 0;
    let key = 0;

    function flush(end: number) {
      if (cursor >= end) return;
      const chunk = content.slice(cursor, end);
      if (!chunk) return;
      if (active.length === 0) {
        parts.push(<span key={key++}>{chunk}</span>);
      } else {
        // Mezcla de colores para solapamiento
        const colors = active.map(a => a.code.color);
        const bg = colors.length === 1
          ? hexToRgba(colors[0], 0.28)
          : blendColors(colors, 0.28);
        const border = colors[0];
        const titles = active.map(a => a.code.name).join(', ');
        const annotationId = active[active.length - 1].annotation.id!;

        parts.push(
          <mark
            key={key++}
            className="annotation-highlight"
            style={{ background: bg, borderBottom: `2px solid ${border}`, borderRadius: '2px', padding: '0 1px' }}
            title={titles}
            onClick={e => {
              e.stopPropagation();
              setSelectedAnnotationId(annotationId);
              setMemoPopup({ annotationId, x: e.clientX, y: e.clientY });
            }}
          >
            {chunk}
          </mark>
        );
      }
      cursor = end;
    }

    for (const event of events) {
      flush(event.pos);
      if (event.type === 'open') {
        active.push(event.annotation);
      } else {
        const idx = active.findIndex(a => a.annotation.id === event.annotation.annotation.id);
        if (idx !== -1) active.splice(idx, 1);
      }
    }
    flush(content.length);
    return parts;
  }, [content, annotations, setSelectedAnnotationId]);

  const activeCode = codes.find(c => c.id === activeCodeId);

  if (!activeDocumentId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div className="text-center space-y-2">
          <p className="text-lg">📄</p>
          <p>Selecciona un documento del corpus para comenzar</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Visor de Texto</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          (Subraya cualquier parte del texto para codificar)
        </span>
      </div>

      {/* Texto */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-8 py-6 leading-8 text-base outline-none"
        style={{ color: 'var(--text-primary)', userSelect: 'text', fontFamily: 'Georgia, serif', fontSize: '15px' }}
        onMouseUp={handleMouseUp}
      >
        {rendered}
      </div>

      {/* Popup de selección contextual para codificar */}
      {selectionInfo && codes.length > 0 && (
        <div 
          className="fixed z-50 card shadow-2xl animate-scale-in"
          style={{ 
            left: Math.max(10, Math.min(selectionInfo.x - 120, window.innerWidth - 260)), 
            top: selectionInfo.y, 
            width: 260,
            padding: '12px'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">¿Qué código aplicar?</span>
            <button className="btn-icon" onClick={() => { setSelectionInfo(null); window.getSelection()?.removeAllRanges(); }}><X size={13}/></button>
          </div>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
            {codes.map(c => (
              <button key={c.id} 
                className="text-left px-2 py-1.5 rounded text-xs transition-colors hover:bg-gray-100 flex items-center gap-2"
                onClick={() => annotateSelection(c.id!)}>
                <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                <span className="truncate flex-1">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popup de memo sobre anotación */}
      {memoPopup && (
        <div
          className="fixed z-50 card shadow-2xl"
          style={{ left: Math.min(memoPopup.x, window.innerWidth - 280), top: memoPopup.y + 8, width: 260 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold flex items-center gap-1">
              <MessageSquare size={12}/> Memo de anotación
            </span>
            <button className="btn-icon" onClick={() => setMemoPopup(null)}><X size={13}/></button>
          </div>
          <textarea className="input text-xs" rows={3} placeholder="Escribe un memo sobre este fragmento..."
            value={memoText} onChange={e => setMemoText(e.target.value)} autoFocus />
          <div className="flex gap-1 mt-2">
            <button className="btn btn-primary flex-1 text-xs" onClick={saveMemo}>Guardar</button>
            <button className="btn btn-danger text-xs" onClick={() => deleteAnnotation(memoPopup.annotationId)}>
              <X size={12}/> Borrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers de color
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function blendColors(colors: string[], alpha: number): string {
  const rgbs = colors.map(h => ({
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  }));
  const r = Math.round(rgbs.reduce((s, c) => s + c.r, 0) / rgbs.length);
  const g = Math.round(rgbs.reduce((s, c) => s + c.g, 0) / rgbs.length);
  const b = Math.round(rgbs.reduce((s, c) => s + c.b, 0) / rgbs.length);
  return `rgba(${r},${g},${b},${alpha})`;
}
