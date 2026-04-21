'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useProjectContext } from '@/components/ProjectProvider';
import { db } from '@/lib/db';
import { createImageUrl } from '@/lib/fileProcessor';
import type { Annotation, Code, PolygonPoint } from '@/types';
import { X, Check } from 'lucide-react';

interface AnnotationWithCode { annotation: Annotation; code: Code; }

export default function ImageViewer() {
  const { activeDocumentId, codes, activeCodeId, setSelectedAnnotationId, project } = useProjectContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  const [annotations, setAnnotations] = useState<AnnotationWithCode[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<PolygonPoint[]>([]);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<number | null>(null);

  // Cargar imagen
  useEffect(() => {
    if (!activeDocumentId) return;
    let url: string;
    db.documents.get(activeDocumentId).then(doc => {
      if (doc?.blobData && doc.mimeType) {
        url = createImageUrl(doc.blobData, doc.mimeType);
        setImageUrl(url);
      }
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [activeDocumentId]);

  const loadAnnotations = useCallback(async () => {
    if (!activeDocumentId) return;
    const anns = await db.annotations
      .where('documentId').equals(activeDocumentId)
      .filter(a => !!a.polygons).toArray();
    const codeList = await db.codes.bulkGet([...new Set(anns.map(a => a.codeId))]);
    const codeMap = new Map(codeList.filter(Boolean).map(c => [c!.id!, c!]));
    setAnnotations(anns.filter(a => codeMap.has(a.codeId)).map(a => ({ annotation: a, code: codeMap.get(a.codeId)! })));
  }, [activeDocumentId]);

  useEffect(() => { loadAnnotations(); }, [loadAnnotations]);

  // Dibujar overlays en canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgDimensions.w) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Polígono en construcción
    if (currentPolygon.length > 0) {
      const activeCode = codes.find(c => c.id === activeCodeId);
      ctx.strokeStyle = activeCode?.color ?? '#7c6af7';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      currentPolygon.forEach((p, i) => {
        const x = (p.x / 100) * canvas.width;
        const y = (p.y / 100) * canvas.height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      currentPolygon.forEach(p => {
        ctx.fillStyle = activeCode?.color ?? '#7c6af7';
        ctx.beginPath();
        ctx.arc((p.x / 100) * canvas.width, (p.y / 100) * canvas.height, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Anotaciones existentes
    annotations.forEach(({ annotation, code }) => {
      if (!annotation.polygons) return;
      annotation.polygons.forEach(polygon => {
        const isHovered = hoveredAnnotation === annotation.id;
        ctx.strokeStyle = code.color;
        ctx.fillStyle = hexToRgba(code.color, isHovered ? 0.4 : 0.2);
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        polygon.forEach((p, i) => {
          const x = (p.x / 100) * canvas.width;
          const y = (p.y / 100) * canvas.height;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    });
  }, [annotations, currentPolygon, activeCodeId, codes, imgDimensions, hoveredAnnotation]);

  function getRelativePoint(e: React.MouseEvent<HTMLCanvasElement>): PolygonPoint {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!activeCodeId) return;
    const pt = getRelativePoint(e);
    // Doble click = cerrar polígono
    if (currentPolygon.length >= 3 && e.detail === 2) {
      savePolygon(); return;
    }
    setCurrentPolygon(prev => [...prev, pt]);
    setDrawing(true);
  }

  async function savePolygon() {
    if (currentPolygon.length < 3 || !activeCodeId || !activeDocumentId || !project) return;
    await db.annotations.add({
      documentId: activeDocumentId,
      projectId: project.id!,
      codeId: activeCodeId,
      polygons: [currentPolygon],
      createdAt: new Date(),
    });
    setCurrentPolygon([]);
    setDrawing(false);
    await loadAnnotations();
  }

  function cancelPolygon() {
    setCurrentPolygon([]);
    setDrawing(false);
  }

  const activeCode = codes.find(c => c.id === activeCodeId);

  if (!imageUrl) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <div className="text-center"><p className="text-2xl mb-2">🖼️</p><p>Cargando imagen...</p></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {activeCode ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: activeCode.color }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {drawing ? `Dibujando polígono (${currentPolygon.length} puntos) — doble clic para cerrar` : `Clic para colocar vértice del polígono`}
            </span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Selecciona un código para codificar áreas</span>
        )}

        {drawing && (
          <div className="ml-auto flex gap-2">
            <button className="btn btn-primary text-xs" onClick={savePolygon}><Check size={13}/> Cerrar polígono</button>
            <button className="btn btn-ghost text-xs" onClick={cancelPolygon}><X size={13}/> Cancelar</button>
          </div>
        )}
      </div>

      {/* Canvas sobre imagen */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Documento visual"
            className="max-w-full rounded-lg"
            style={{ display: 'block', maxHeight: 'calc(100vh - 200px)' }}
            onLoad={e => {
              const img = e.currentTarget;
              setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
              if (canvasRef.current) {
                canvasRef.current.width = img.clientWidth;
                canvasRef.current.height = img.clientHeight;
              }
            }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ cursor: activeCodeId ? 'crosshair' : 'default' }}
            onClick={handleCanvasClick}
            onMouseMove={e => {
              // Detectar hover sobre polígonos existentes
              const pt = getRelativePoint(e);
              const hovered = annotations.find(({ annotation }) =>
                annotation.polygons?.some(poly => isPointInPolygon(pt, poly))
              );
              setHoveredAnnotation(hovered?.annotation.id ?? null);
              if (hovered) {
                setSelectedAnnotationId(hovered.annotation.id!);
              }
            }}
          />
        </div>
      </div>

      {/* Lista de anotaciones de imagen */}
      {annotations.length > 0 && (
        <div className="flex-shrink-0 border-t p-2 flex gap-2 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          {annotations.map(({ annotation, code }) => (
            <div key={annotation.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs flex-shrink-0 cursor-pointer"
              style={{ background: `${code.color}20`, color: code.color, border: `1px solid ${code.color}40` }}
              onMouseEnter={() => setHoveredAnnotation(annotation.id!)}
              onMouseLeave={() => setHoveredAnnotation(null)}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: code.color }} />
              {code.name}
              <button onClick={async () => { await db.annotations.delete(annotation.id!); await loadAnnotations(); }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isPointInPolygon(pt: PolygonPoint, polygon: PolygonPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
