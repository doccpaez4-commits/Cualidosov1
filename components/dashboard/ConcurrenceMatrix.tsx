'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/db';
import type { VerbatimResult } from '@/types';
import * as d3 from 'd3';

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
  const [cells, setCells] = useState<Cell[]>([]);
  const [codeNames, setCodeNames] = useState<{ id: number; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    computeMatrix();
  }, [projectId, verbatims]);

  async function computeMatrix() {
    setLoading(true);
    const annotations = await db.annotations.where('projectId').equals(projectId).toArray();
    const codes = await db.codes.where('projectId').equals(projectId).toArray();
    const codeMap = new Map(codes.map(c => [c.id!, c]));

    // Agrupar anotaciones por documento
    const byDoc = new Map<number, number[]>();
    annotations.forEach(a => {
      if (!byDoc.has(a.documentId)) byDoc.set(a.documentId, []);
      byDoc.get(a.documentId)!.push(a.codeId);
    });

    // Calcular co-ocurrencias
    const coMatrix = new Map<string, number>();
    byDoc.forEach(codeIds => {
      const unique = [...new Set(codeIds)];
      for (let i = 0; i < unique.length; i++) {
        for (let j = i; j < unique.length; j++) {
          const key = `${Math.min(unique[i], unique[j])}_${Math.max(unique[i], unique[j])}`;
          coMatrix.set(key, (coMatrix.get(key) ?? 0) + 1);
        }
      }
    });

    // Solo códigos que aparecen al menos una vez
    const activeCodeIds = [...new Set(annotations.map(a => a.codeId))];
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
  }, [cells, codeNames]);

  function drawMatrix() {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const margin = { top: 100, right: 20, bottom: 20, left: 120 };
    const containerW = svgRef.current!.parentElement?.clientWidth ?? 800;
    const n = codeNames.length;
    const cellSize = Math.min(40, (containerW - margin.left - margin.right) / n);
    const w = n * cellSize;
    const h = n * cellSize;

    svg.attr('width', w + margin.left + margin.right).attr('height', h + margin.top + margin.bottom);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const maxCount = d3.max(cells, d => d.count) ?? 1;
    const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, maxCount]);

    // Índice por codeId
    const idxMap = new Map(codeNames.map((c, i) => [c.id, i]));

    // Celdas
    cells.forEach(cell => {
      const xi = idxMap.get(cell.codeAId) ?? -1;
      const yi = idxMap.get(cell.codeBId) ?? -1;
      if (xi < 0 || yi < 0) return;

      [[xi, yi], [yi, xi]].forEach(([col, row]) => {
        g.append('rect')
          .attr('x', col * cellSize).attr('y', row * cellSize)
          .attr('width', cellSize - 2).attr('height', cellSize - 2)
          .attr('rx', 3)
          .attr('fill', colorScale(cell.count))
          .attr('opacity', 0.85)
          .style('cursor', 'pointer')
          .on('mouseenter', function() { d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 1.5); })
          .on('mouseleave', function() { d3.select(this).attr('opacity', 0.85).attr('stroke', 'none'); })
          .on('click', () => {
            const matching = verbatims.filter(v =>
              (v.codeName === cell.codeAName || v.codeName === cell.codeBName)
            );
            onSelect(matching);
          })
          .append('title').text(`${cell.codeAName} × ${cell.codeBName}: ${cell.count}`);

        if (cellSize > 20) {
          g.append('text')
            .attr('x', col * cellSize + cellSize / 2).attr('y', row * cellSize + cellSize / 2 + 4)
            .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#fff').attr('font-weight', '600')
            .text(cell.count);
        }
      });
    });

    // Diagonales vacías
    codeNames.forEach((_, i) => {
      g.append('rect')
        .attr('x', i * cellSize).attr('y', i * cellSize)
        .attr('width', cellSize - 2).attr('height', cellSize - 2)
        .attr('rx', 3).attr('fill', 'rgba(255,255,255,0.05)');
    });

    // Labels columna (top, rotados)
    g.selectAll('.col-label').data(codeNames).enter().append('text')
      .attr('class', 'col-label')
      .attr('x', (_, i) => i * cellSize + cellSize / 2).attr('y', -8)
      .attr('text-anchor', 'start')
      .attr('transform', (_, i) => `rotate(-40, ${i * cellSize + cellSize / 2}, -8)`)
      .attr('font-size', 11).attr('fill', 'var(--text-secondary)')
      .text(d => d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name);

    // Labels fila (left)
    g.selectAll('.row-label').data(codeNames).enter().append('text')
      .attr('class', 'row-label')
      .attr('x', -8).attr('y', (_, i) => i * cellSize + cellSize / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 11).attr('fill', 'var(--text-secondary)')
      .text(d => d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name);

    // Dots de color por código
    g.selectAll('.col-dot').data(codeNames).enter().append('circle')
      .attr('class', 'col-dot')
      .attr('cx', (_, i) => i * cellSize + cellSize / 2).attr('cy', -22)
      .attr('r', 4).attr('fill', d => d.color);
    g.selectAll('.row-dot').data(codeNames).enter().append('circle')
      .attr('class', 'row-dot')
      .attr('cx', -16).attr('cy', (_, i) => i * cellSize + cellSize / 2)
      .attr('r', 4).attr('fill', d => d.color);
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
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Matriz de Concurrencia</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Heatmap de co-ocurrencia de códigos en el corpus. Haz clic en una celda para ver los verbatims.
        </p>
      </div>
      <div className="overflow-auto flex-1">
        <svg ref={svgRef} />
      </div>
    </div>
  );
}
