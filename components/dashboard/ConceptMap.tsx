'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { db } from '@/lib/db';
import type { VerbatimResult, Code, Category } from '@/types';
import { Download, Save, RefreshCw } from 'lucide-react';

interface ConceptMapProps {
  verbatims: VerbatimResult[];
  projectId: number;
}

export default function ConceptMap({ verbatims, projectId }: ConceptMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (!svgRef.current || verbatims.length === 0) return;

    // 1. Cargar posiciones guardadas desde la DB
    async function initSim() {
      const [savedCodes, savedCats] = await Promise.all([
        db.codes.where('projectId').equals(projectId).toArray(),
        db.categories.where('projectId').equals(projectId).toArray()
      ]);

      const codesMap = new Map(savedCodes.map(c => [c.name, c]));
      const catsMap = new Map(savedCats.map(c => [c.name, c]));

      // 2. Extraer Nodos
      const nodesMap = new Map<string, any>();
      const linksMap = new Map<string, any>();

      verbatims.forEach(v => {
        const catName = v.categoryName || 'Sin categoría';
        const codeName = v.codeName || 'Sin código';

        if (!nodesMap.has(catName)) {
          const dbCat = catsMap.get(catName);
          nodesMap.set(catName, { 
            id: catName, 
            dbId: dbCat?.id,
            group: 'category', 
            radius: 35, 
            color: 'rgba(3, 88, 161, 0.08)', 
            stroke: '#0358a1',
            count: 0,
            fx: dbCat?.position?.x,
            fy: dbCat?.position?.y
          });
        }
        if (!nodesMap.has(codeName)) {
          const dbCode = codesMap.get(codeName);
          nodesMap.set(codeName, { 
            id: codeName, 
            dbId: dbCode?.id,
            group: 'code', 
            radius: 25, 
            color: v.codeColor || '#94a3b8', 
            stroke: '#fff',
            count: 0,
            fx: dbCode?.position?.x,
            fy: dbCode?.position?.y
          });
        }

        nodesMap.get(codeName).count += 1;
        nodesMap.get(catName).count += 1;

        const linkId = `${catName}->${codeName}`;
        if (!linksMap.has(linkId)) {
          linksMap.set(linkId, { source: catName, target: codeName, value: 1 });
        } else {
          linksMap.get(linkId).value += 1;
        }
      });

      const nodes = Array.from(nodesMap.values());
      const links = Array.from(linksMap.values());

      const width = 1000;
      const height = 700;

      const svg = d3.select(svgRef.current)
        .attr('viewBox', [0, 0, width, height].join(' '))
        .style('width', '100%')
        .style('height', '100%');

      svg.selectAll('*').remove();

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(180))
        .force('charge', d3.forceManyBody().strength(-800))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius((d: any) => d.radius + 30).iterations(3))
        .velocityDecay(0.4) // Fricción alta para evitar que floten erráticamente
        .alphaDecay(0.05);

      // Flechas profesionales
      svg.append('defs').append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 9.5) // Punta de la flecha
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', '#94a3b8')
        .attr('d', 'M0,-5L10,0L0,5');

      const link = svg.append('g')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-opacity', 0.6)
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke-width', d => Math.sqrt(d.value) * 2 + 1)
        .attr('marker-end', 'url(#arrow)');

      const nodeG = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(drag(simulation) as any);

      nodeG.append('circle')
        .attr('r', d => d.radius + Math.sqrt(d.count) * 2)
        .attr('fill', d => d.color)
        .attr('stroke', d => d.stroke)
        .attr('stroke-width', 2)
        .attr('class', 'drop-shadow-sm');

      nodeG.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', d => d.group === 'category' ? '12px' : '10px')
        .attr('font-weight', d => d.group === 'category' ? 'bold' : 'normal')
        .attr('fill', '#1e293b')
        .style('pointer-events', 'none')
        .text(d => d.id);

      nodeG.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.5em')
        .attr('font-size', '9px')
        .attr('fill', '#64748b')
        .style('pointer-events', 'none')
        .text(d => `(${d.count})`);

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => {
             const dx = d.target.x - d.source.x;
             const dy = d.target.y - d.source.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist === 0) return d.source.x;
             const sourceR = (d.source.radius || 25) + Math.sqrt(d.source.count || 0) * 2;
             return d.source.x + (dx * sourceR / dist);
          })
          .attr('y1', (d: any) => {
             const dx = d.target.x - d.source.x;
             const dy = d.target.y - d.source.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist === 0) return d.source.y;
             const sourceR = (d.source.radius || 25) + Math.sqrt(d.source.count || 0) * 2;
             return d.source.y + (dy * sourceR / dist);
          })
          .attr('x2', (d: any) => {
             const dx = d.target.x - d.source.x;
             const dy = d.target.y - d.source.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist === 0) return d.target.x;
             // Ajuste fino para que la punta de la flecha toque el borde del nodo
             const targetR = (d.target.radius || 25) + Math.sqrt(d.target.count || 0) * 2 + 2;
             return d.target.x - (dx * targetR / dist);
          })
          .attr('y2', (d: any) => {
             const dx = d.target.x - d.source.x;
             const dy = d.target.y - d.source.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist === 0) return d.target.y;
             const targetR = (d.target.radius || 25) + Math.sqrt(d.target.count || 0) * 2 + 2;
             return d.target.y - (dy * targetR / dist);
          });

        nodeG.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

      function drag(simulation: any) {
        function dragstarted(event: any) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          const node = event.subject;
          node.fx = node.x;
          node.fy = node.y;
        }
        function dragged(event: any) {
          const node = event.subject;
          node.fx = event.x;
          node.fy = event.y;
        }
        async function dragended(event: any) {
          if (!event.active) simulation.alphaTarget(0);
          // Persistir posición en DB
          const node = event.subject;
          if (node.dbId) {
            setIsSaving(true);
            if (node.group === 'code') {
              await db.codes.update(node.dbId, { position: { x: node.fx, y: node.fy } });
            } else {
              await db.categories.update(node.dbId, { position: { x: node.fx, y: node.fy } });
            }
            setTimeout(() => setIsSaving(false), 500);
          }
        }
        return d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended);
      }
    }

    initSim();
  }, [verbatims, projectId]);

  function downloadSVG() {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 2000;
      canvas.height = 1400;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
      }
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'mapa_conceptual.png';
      link.href = url;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  async function confirmResetLayout() {
    await Promise.all([
      db.codes.where('projectId').equals(projectId).modify({ position: undefined }),
      db.categories.where('projectId').equals(projectId).modify({ position: undefined })
    ]);
    window.location.reload();
  }

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-lg border p-6 relative flex flex-col" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-accent" style={{ color: 'var(--accent)' }}>Mapa Conceptual Dinámico</h3>
          <p className="text-[10px] text-gray-500">Arrastra los nodos para organizar tu teoría. Las posiciones se guardan automáticamente.</p>
        </div>
        <div className="flex gap-2">
          {isSaving && (
             <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold animate-pulse">
                <Save size={12}/> GUARDANDO...
             </div>
          )}
          {showResetConfirm ? (
            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1 duration-200">
              <span className="text-[10px] font-bold text-red-600 mr-1 uppercase">¿Restablecer?</span>
              <button className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded" onClick={confirmResetLayout}>SÍ</button>
              <button className="px-2 py-1 bg-gray-200 text-gray-700 text-[10px] font-bold rounded" onClick={() => setShowResetConfirm(false)}>NO</button>
            </div>
          ) : (
            <button onClick={() => setShowResetConfirm(true)} className="btn btn-ghost btn-sm text-gray-400" title="Restablecer diseño">
              <RefreshCw size={14}/>
            </button>
          )}
          <button onClick={downloadSVG} className="btn btn-ghost btn-sm gap-2 text-accent border border-accent/20">
            <Download size={14}/> PNG
          </button>
        </div>
      </div>
      <div className="flex-1 bg-gray-50/30 rounded-xl border border-dashed relative overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}
