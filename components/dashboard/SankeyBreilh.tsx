'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/db';
import type { VerbatimResult } from '@/types';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface Props {
  projectId: number;
  onSelect: (verbatims: VerbatimResult[]) => void;
  verbatims: VerbatimResult[];
}

const DOMAIN_CONFIG = {
  general:    { label: 'General (Sociedad/Estado)',        color: '#7c6af7', x: 0 },
  particular: { label: 'Particular (Modos de vida)',       color: '#14b8a6', x: 1 },
  singular:   { label: 'Singular (Individuo/Fenotipo)',    color: '#fb7185', x: 2 },
};

export default function SankeyBreilh({ projectId, onSelect, verbatims }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => { buildSankey(); }, [projectId, verbatims]);

  async function buildSankey() {
    setLoading(true);
    const codes = await db.codes.where('projectId').equals(projectId).filter(c => !!c.domain).toArray();
    const annotations = await db.annotations.where('projectId').equals(projectId).toArray();

    if (codes.length < 2) { setHasData(false); setLoading(false); return; }

    const countMap = new Map<number, number>();
    annotations.forEach(a => countMap.set(a.codeId, (countMap.get(a.codeId) ?? 0) + 1));

    // Construir nodos: un nodo por código con dominio
    const nodes = codes.map(c => ({ id: `code-${c.id}`, name: c.name, domain: c.domain!, color: c.color }));
    // Nodos de dominio como intermediarios
    const domainNodes = Object.entries(DOMAIN_CONFIG).map(([key, cfg]) => ({
      id: `domain-${key}`, name: cfg.label, domain: key as any, color: cfg.color,
    }));

    // Links: código → dominio
    const links: { source: string; target: string; value: number }[] = [];
    codes.forEach(code => {
      const val = countMap.get(code.id!) ?? 0;
      if (val < 1) return;
      links.push({ source: `code-${code.id}`, target: `domain-${code.domain}`, value: val });
    });

    // Links entre dominios (general → particular → singular) basados en co-ocurrencias
    // Simplificado: pesos basados en anotaciones por documento compartidas
    const byDoc = new Map<number, typeof codes>();
    annotations.forEach(a => {
      const code = codes.find(c => c.id === a.codeId);
      if (!code) return;
      if (!byDoc.has(a.documentId)) byDoc.set(a.documentId, []);
      byDoc.get(a.documentId)!.push(code);
    });

    const domainLinks: Record<string, number> = {};
    byDoc.forEach(docCodes => {
      const domains = [...new Set(docCodes.map(c => c.domain!))];
      for (let i = 0; i < domains.length; i++) {
        for (let j = i + 1; j < domains.length; j++) {
          const dA = domains[i], dB = domains[j];
          const aIdx = ['general','particular','singular'].indexOf(dA);
          const bIdx = ['general','particular','singular'].indexOf(dB);
          const [src, tgt] = aIdx < bIdx ? [dA, dB] : [dB, dA];
          const key = `${src}::${tgt}`;
          domainLinks[key] = (domainLinks[key] ?? 0) + 1;
        }
      }
    });

    Object.entries(domainLinks).forEach(([key, val]) => {
      const [src, tgt] = key.split('::');
      links.push({ source: `domain-${src}`, target: `domain-${tgt}`, value: val });
    });

    if (links.length === 0) { setHasData(false); setLoading(false); return; }

    setHasData(true);
    setLoading(false);

    // Dibujar Sankey
    setTimeout(() => drawSankey([...nodes, ...domainNodes], links), 50);
  }

  function drawSankey(nodesData: any[], linksData: { source: string; target: string; value: number }[]) {
    if (!svgRef.current) return;
    const W = svgRef.current.parentElement?.clientWidth ?? 700;
    const H = svgRef.current.parentElement?.clientHeight ?? 460;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3.select(svgRef.current).attr('width', W).attr('height', H);
    svg.selectAll('*').remove();

    const idxMap = new Map(nodesData.map((n, i) => [n.id, i]));
    const sankeyNodes = nodesData.map(n => ({ ...n }));
    const sankeyLinks = linksData
      .filter(l => idxMap.has(l.source) && idxMap.has(l.target))
      .map(l => ({ source: idxMap.get(l.source)!, target: idxMap.get(l.target)!, value: l.value }));

    try {
      const sankeyGen = sankey()
        .nodeId((d: any) => d.id ?? '')
        .nodeWidth(20)
        .nodePadding(12)
        .extent([[margin.left, margin.top], [W - margin.right, H - margin.bottom]]);

      const { nodes, links } = sankeyGen({ nodes: sankeyNodes, links: sankeyLinks } as any) as any;
      const g = svg.append('g');

      // Links
      g.append('g').selectAll('path').data(links).enter().append('path')
        .attr('d', sankeyLinkHorizontal() as any)
        .attr('stroke', (d: any) => d.source.color ?? '#7c6af7')
        .attr('stroke-width', (d: any) => Math.max(1, d.width))
        .attr('fill', 'none').attr('opacity', 0.35)
        .style('cursor', 'pointer')
        .on('mouseenter', function() { d3.select(this).attr('opacity', 0.65); })
        .on('mouseleave', function() { d3.select(this).attr('opacity', 0.35); })
        .on('click', (_, d: any) => {
          const srcName = d.source.name; const tgtName = d.target.name;
          const matching = verbatims.filter(v => v.codeName === srcName || v.codeName === tgtName);
          onSelect(matching);
        });

      // Nodes
      g.append('g').selectAll('rect').data(nodes).enter().append('rect')
        .attr('x', (d: any) => d.x0).attr('y', (d: any) => d.y0)
        .attr('width', (d: any) => d.x1 - d.x0).attr('height', (d: any) => d.y1 - d.y0)
        .attr('fill', (d: any) => d.color ?? '#7c6af7').attr('rx', 3).attr('opacity', 0.9);

      // Labels
      g.append('g').selectAll('text').data(nodes).enter().append('text')
        .attr('x', (d: any) => d.x0 < W / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr('y', (d: any) => (d.y0 + d.y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d: any) => d.x0 < W / 2 ? 'start' : 'end')
        .attr('font-size', 11).attr('fill', 'var(--text-secondary)')
        .text((d: any) => d.name.length > 20 ? d.name.slice(0, 20) + '…' : d.name);
    } catch (e) {
      console.error('Sankey error:', e);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
        style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!hasData) return (
    <div className="flex items-center justify-center h-full">
      <div className="empty-state">
        <p className="text-xl">🔴</p>
        <p>Clasifica códigos en los dominios G-P-S<br/>desde el árbol de códigos para ver el flujo.</p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Flujo de Determinación (Breilh)</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Diagrama Sankey de procesos entre dominios General → Particular → Singular.
        </p>
        <div className="flex gap-3 mt-2">
          {Object.entries(DOMAIN_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-sm" style={{ background: cfg.color }} />
              <span style={{ color: 'var(--text-secondary)' }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
