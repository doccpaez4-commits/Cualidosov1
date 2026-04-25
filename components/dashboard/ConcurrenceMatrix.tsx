'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from '@/lib/db';
import type { VerbatimResult } from '@/types';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Download, RotateCcw } from 'lucide-react';

interface Props {
  projectId: number;
  onSelect: (verbatims: VerbatimResult[]) => void;
  verbatims: VerbatimResult[];
}

interface Cell {
  codeAId: number; codeBId: number;
  codeAName: string; codeBName: string;
  codeAColor: string; codeBColor: string;
  count: number;
}

export default function ConcurrenceMatrix({ projectId, onSelect, verbatims }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [codeNames, setCodeNames] = useState<{ id: number; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cellSize, setCellSize] = useState(72);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string; visible: boolean }>({
    x: 0, y: 0, content: '', visible: false
  });

  const MIN_CELL = 36;
  const MAX_CELL = 120;

  useEffect(() => {
    if (!projectId) return;
    computeMatrix();
  }, [projectId, verbatims]);

  async function computeMatrix() {
    setLoading(true);
    const annotations = await db.annotations.where('projectId').equals(projectId).toArray();
    const codes = await db.codes.where('projectId').equals(projectId).toArray();
    const codeMap = new Map(codes.map(c => [c.id!, c]));

    const byDoc = new Map<number, number[]>();
    annotations.forEach(a => {
      if (!byDoc.has(a.documentId)) byDoc.set(a.documentId, []);
      byDoc.get(a.documentId)!.push(a.codeId);
    });

    const coMatrix = new Map<string, number>();
    byDoc.forEach(codeIds => {
      const unique = Array.from(new Set(codeIds));
      for (let i = 0; i < unique.length; i++) {
        for (let j = i; j < unique.length; j++) {
          const key = `${Math.min(unique[i], unique[j])}_${Math.max(unique[i], unique[j])}`;
          coMatrix.set(key, (coMatrix.get(key) ?? 0) + 1);
        }
      }
    });

    const activeCodeIds = Array.from(new Set(annotations.map(a => a.codeId)));
    const activeCodes = activeCodeIds.map(id => codeMap.get(id)).filter(Boolean) as typeof codes;
    setCodeNames(activeCodes.map(c => ({ id: c.id!, name: c.name, color: c.color })));

    const result: Cell[] = [];
    coMatrix.forEach((count, key) => {
      const [a, b] = key.split('_').map(Number);
      const cA = codeMap.get(a), cB = codeMap.get(b);
      if (!cA || !cB) return;
      result.push({ codeAId: a, codeBId: b, codeAName: cA.name, codeBName: cB.name, codeAColor: cA.color, codeBColor: cB.color, count });
    });

    setCells(result);
    setLoading(false);
  }

  useEffect(() => {
    if (!svgRef.current || codeNames.length === 0) return;
    drawMatrix();
  }, [cells, codeNames, cellSize]);

  function drawMatrix() {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const margin = { top: 130, right: 30, bottom: 20, left: 160 };
    const n = codeNames.length;
    const w = n * cellSize;
    const h = n * cellSize;

    svg
      .attr('width', w + margin.left + margin.right)
      .attr('height', h + margin.top + margin.bottom);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxCount = d3.max(cells, d => d.count) ?? 1;
    const colorScale = d3.scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateRgb('#e0f2fe', '#0c4a6e'));

    const idxMap = new Map(codeNames.map((c, i) => [c.id, i]));

    // Background grid
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        g.append('rect')
          .attr('x', j * cellSize).attr('y', i * cellSize)
          .attr('width', cellSize - 2).attr('height', cellSize - 2)
          .attr('rx', 4)
          .attr('fill', i === j ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.02)')
          .attr('stroke', 'rgba(0,0,0,0.05)')
          .attr('stroke-width', 0.5);
      }
    }

    // Cells
    cells.forEach(cell => {
      const xi = idxMap.get(cell.codeAId) ?? -1;
      const yi = idxMap.get(cell.codeBId) ?? -1;
      if (xi < 0 || yi < 0) return;

      [[xi, yi], [yi, xi]].forEach(([col, row]) => {
        const isDiag = col === row;
        const rect = g.append('rect')
          .attr('x', col * cellSize + 1).attr('y', row * cellSize + 1)
          .attr('width', cellSize - 4).attr('height', cellSize - 4)
          .attr('rx', 6)
          .attr('fill', isDiag ? colorScale(cell.count) : colorScale(cell.count))
          .attr('opacity', isDiag ? 1 : 0.85)
          .style('cursor', 'pointer')
          .style('transition', 'opacity 0.15s, transform 0.15s');

        rect
          .on('mouseenter', function(this: any) {
            d3.select(this)
              .attr('opacity', 1)
              .attr('stroke', '#fff')
              .attr('stroke-width', 2);
            const bbox = (this as SVGRectElement).getBoundingClientRect();
            const containerBbox = containerRef.current?.getBoundingClientRect();
            if (containerBbox) {
              setTooltip({
                x: bbox.left - containerBbox.left + cellSize / 2,
                y: bbox.top - containerBbox.top - 10,
                content: `${cell.codeAName} × ${cell.codeBName}: ${cell.count} co-ocurrencia${cell.count > 1 ? 's' : ''}`,
                visible: true
              });
            }
          })
          .on('mouseleave', function(this: any) {
            d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
            setTooltip(t => ({ ...t, visible: false }));
          })
          .on('click', () => {
            const matching = verbatims.filter(v =>
              v.codeId === cell.codeAId || v.codeId === cell.codeBId
            );
            onSelect(matching);
          });

        // Count text
        if (cellSize >= 48) {
          g.append('text')
            .attr('x', col * cellSize + cellSize / 2)
            .attr('y', row * cellSize + cellSize / 2 + (cellSize >= 64 ? 5 : 4))
            .attr('text-anchor', 'middle')
            .attr('font-size', cellSize >= 64 ? 14 : 11)
            .attr('font-weight', '700')
            .attr('fill', cell.count > maxCount * 0.5 ? '#fff' : '#1e40af')
            .attr('pointer-events', 'none')
            .text(cell.count);
        }

        // Small dots on large cells
        if (cellSize >= 72 && col !== row) {
          g.append('circle')
            .attr('cx', col * cellSize + 10).attr('cy', row * cellSize + 10)
            .attr('r', 4).attr('fill', cell.codeAColor)
            .attr('opacity', 0.7).attr('pointer-events', 'none');
          g.append('circle')
            .attr('cx', col * cellSize + cellSize - 10).attr('cy', row * cellSize + 10)
            .attr('r', 4).attr('fill', cell.codeBColor)
            .attr('opacity', 0.7).attr('pointer-events', 'none');
        }
      });
    });

    // Column labels (top, rotated)
    g.selectAll('.col-label').data(codeNames).enter()
      .append('text')
      .attr('class', 'col-label')
      .attr('x', (_, i) => i * cellSize + cellSize / 2)
      .attr('y', -12)
      .attr('text-anchor', 'start')
      .attr('transform', (_, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -12)`)
      .attr('font-size', Math.max(10, Math.min(13, cellSize * 0.2)))
      .attr('fill', 'var(--text-secondary)')
      .attr('font-weight', '500')
      .text(d => d.name.length > 18 ? d.name.slice(0, 18) + '…' : d.name);

    // Color dots top
    g.selectAll('.col-dot').data(codeNames).enter()
      .append('circle')
      .attr('class', 'col-dot')
      .attr('cx', (_, i) => i * cellSize + cellSize / 2)
      .attr('cy', -28)
      .attr('r', 5)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff').attr('stroke-width', 1.5);

    // Row labels (left)
    g.selectAll('.row-label').data(codeNames).enter()
      .append('text')
      .attr('class', 'row-label')
      .attr('x', -12)
      .attr('y', (_, i) => i * cellSize + cellSize / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', Math.max(10, Math.min(13, cellSize * 0.2)))
      .attr('fill', 'var(--text-secondary)')
      .attr('font-weight', '500')
      .text(d => d.name.length > 20 ? d.name.slice(0, 20) + '…' : d.name);

    // Color dots left
    g.selectAll('.row-dot').data(codeNames).enter()
      .append('circle')
      .attr('class', 'row-dot')
      .attr('cx', -26)
      .attr('cy', (_, i) => i * cellSize + cellSize / 2)
      .attr('r', 5)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff').attr('stroke-width', 1.5);

    // Color scale legend
    const legendW = 160;
    const legendG = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${h + margin.top + 10})`);

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'concGrad');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#e0f2fe');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#0c4a6e');

    legendG.append('rect')
      .attr('width', legendW).attr('height', 8)
      .attr('rx', 4).attr('fill', 'url(#concGrad)');
    legendG.append('text').attr('x', 0).attr('y', 22)
      .attr('font-size', 10).attr('fill', 'var(--text-muted)').text('0');
    legendG.append('text').attr('x', legendW).attr('y', 22)
      .attr('font-size', 10).attr('fill', 'var(--text-muted)')
      .attr('text-anchor', 'end').text(maxCount.toString());
    legendG.append('text').attr('x', legendW / 2).attr('y', 22)
      .attr('font-size', 10).attr('fill', 'var(--text-muted)')
      .attr('text-anchor', 'middle').text('Co-ocurrencias');
  }

  function exportPNG() {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
      }
      const a = document.createElement('a');
      a.download = 'matriz_concurrencia.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm">Calculando concurrencias...</p>
      </div>
    </div>
  );

  if (codeNames.length < 2) return (
    <div className="flex items-center justify-center h-full">
      <div className="empty-state">
        <p className="text-xl">📊</p>
        <p>Necesitas al menos 2 códigos con anotaciones<br/>para ver la matriz de concurrencia.</p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col" ref={containerRef} style={{ position: 'relative' }}>
      {/* Header + Controls */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Matriz de Concurrencia
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Heatmap de co-ocurrencia · {codeNames.length} códigos activos · Haz clic en una celda para ver los verbatims
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="btn btn-ghost text-xs"
            onClick={() => setCellSize(s => Math.min(MAX_CELL, s + 16))}
            title="Ampliar celdas"
          >
            <ZoomIn size={14} />
          </button>
          <span className="text-xs px-2 py-1 rounded font-mono" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            {cellSize}px
          </span>
          <button
            className="btn btn-ghost text-xs"
            onClick={() => setCellSize(s => Math.max(MIN_CELL, s - 16))}
            title="Reducir celdas"
          >
            <ZoomOut size={14} />
          </button>
          <button
            className="btn btn-ghost text-xs"
            onClick={() => setCellSize(72)}
            title="Restablecer zoom"
          >
            <RotateCcw size={14} />
          </button>
          <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
          <button
            className="btn btn-ghost text-xs"
            onClick={exportPNG}
            title="Exportar como PNG"
          >
            <Download size={14} /> PNG
          </button>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(15,23,42,0.92)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            pointerEvents: 'none',
            zIndex: 100,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* SVG scroll container */}
      <div className="overflow-auto flex-1 rounded-xl" style={{ background: 'var(--bg-secondary)', padding: '12px' }}>
        <svg ref={svgRef} />
      </div>
    </div>
  );
}
