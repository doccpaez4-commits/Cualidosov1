'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { VerbatimResult, BreilhDomain } from '@/types';
import { Download, Info } from 'lucide-react';

interface BreilhCircleMapProps {
  verbatims: VerbatimResult[];
}

const RADIUS_INDIVIDUAL = 150;
const RADIUS_PARTICULAR = 300;
const RADIUS_GENERAL = 450;
const CENTER_X = 500;
const CENTER_Y = 500;

export default function BreilhCircleMap({ verbatims }: BreilhCircleMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || verbatims.length === 0) return;

    // 1. Extraer categorías y códigos únicos
    const catMap = new Map<string, any>();
    const codeMap = new Map<string, any>();

    verbatims.forEach(v => {
      if (!v.domain || v.domain === 'none') return;
      
      const catName = v.categoryName || 'Sin Categoría';
      const codeName = v.codeName || 'Sin Código';
      const s = v.sDeLaVida || 'none';
      const type = v.breilhType || 'none';

      if (!catMap.has(catName)) {
        catMap.set(catName, {
          id: catName,
          type: 'category',
          domain: v.domain,
          radius: 60, // Radio grande para evitar que los códigos pisen el texto
          count: 0
        });
      }
      catMap.get(catName).count += 1;

      const codeId = `${catName}-${codeName}`;
      if (!codeMap.has(codeId)) {
        codeMap.set(codeId, {
          id: codeId,
          label: codeName,
          type: 'code',
          parent: catName,
          domain: v.domain,
          sDeLaVida: s,
          breilhType: type,
          radius: 12, // El tamaño dinámico de dibujo se calcula en la fase de renderizado
          count: 1,
          verbatims: [v]
        });
      } else {
        codeMap.get(codeId).count += 1;
        codeMap.get(codeId).verbatims.push(v);
      }
    });

    const nodes: any[] = [...Array.from(catMap.values()), ...Array.from(codeMap.values())];
    
    // Enlaces de cada código a su categoría
    const links: any[] = Array.from(codeMap.values()).map(c => ({
      source: c.parent,
      target: c.id
    }));

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 1000 1000`)
      .style('width', '100%')
      .style('height', '100%');

    svg.selectAll('*').remove();

    // Dibujar círculos de fondo
    const bgG = svg.append('g').attr('class', 'background-circles').attr('font-family', 'system-ui, -apple-system, sans-serif');
    
    // General
    bgG.append('circle')
      .attr('cx', CENTER_X).attr('cy', CENTER_Y).attr('r', RADIUS_GENERAL)
      .attr('fill', '#fdf4ff').attr('stroke', '#e9d5ff').attr('stroke-width', 2);
    bgG.append('text').attr('x', CENTER_X).attr('y', CENTER_Y - RADIUS_GENERAL + 20)
      .attr('text-anchor', 'middle').attr('fill', '#7e22ce').attr('font-weight', 'bold')
      .text('Dimensión General (Estructural)');

    // Particular
    bgG.append('circle')
      .attr('cx', CENTER_X).attr('cy', CENTER_Y).attr('r', RADIUS_PARTICULAR)
      .attr('fill', '#eff6ff').attr('stroke', '#bfdbfe').attr('stroke-width', 2);
    bgG.append('text').attr('x', CENTER_X).attr('y', CENTER_Y - RADIUS_PARTICULAR + 20)
      .attr('text-anchor', 'middle').attr('fill', '#1d4ed8').attr('font-weight', 'bold')
      .text('Dimensión Particular (Grupos/Territorios)');

    // Individual
    bgG.append('circle')
      .attr('cx', CENTER_X).attr('cy', CENTER_Y).attr('r', RADIUS_INDIVIDUAL)
      .attr('fill', '#f0fdf4').attr('stroke', '#bbf7d0').attr('stroke-width', 2);
    bgG.append('text').attr('x', CENTER_X).attr('y', CENTER_Y - RADIUS_INDIVIDUAL + 20)
      .attr('text-anchor', 'middle').attr('fill', '#166534').attr('font-weight', 'bold')
      .text('Dimensión Individual (Singular)');

    // Escalas de radios para las fuerzas radiales
    const radialScale = (domain: string) => {
      if (domain === 'general') return 375;
      if (domain === 'particular') return 225;
      return 75; // individual
    };

    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength((d: any) => d.type === 'category' ? -2000 : -50))
      .force('collide', d3.forceCollide().radius((d: any) => d.radius + 5).iterations(4))
      // Agrupación de códigos hacia su categoría (sin dibujar links)
      .force('x', d3.forceX((d: any) => d.type === 'code' ? catMap.get(d.parent)?.x || CENTER_X : CENTER_X).strength((d: any) => d.type === 'code' ? 0.3 : 0))
      .force('y', d3.forceY((d: any) => d.type === 'code' ? catMap.get(d.parent)?.y || CENTER_Y : CENTER_Y).strength((d: any) => d.type === 'code' ? 0.3 : 0))
      // Fuerza radial solo para las categorías
      .force('r', d3.forceRadial(
        (d: any) => radialScale(d.domain),
        CENTER_X, CENTER_Y
      ).strength((d: any) => d.type === 'category' ? 1 : 0));

    // Helper para dibujar la forma según S de la vida
    const drawShape = (g: any) => {
      g.each(function(this: any, d: any) {
        if (d.type !== 'code') return;
        const el = d3.select(this);
        const s = d.sDeLaVida;
        const color = d.breilhType === 'protector' ? '#22c55e' : d.breilhType === 'malsano' ? '#ef4444' : '#94a3b8';
        const strokeColor = '#ffffff';

        const symbolSize = 100 + (d.count * 150); // Tamaño dinámico

        if (s === 'soberania') {
          el.append('path').attr('d', d3.symbol().type(d3.symbolTriangle).size(symbolSize))
            .attr('fill', color).attr('stroke', strokeColor).attr('stroke-width', 2);
        } else if (s === 'sustentabilidad') {
          el.append('path').attr('d', d3.symbol().type(d3.symbolSquare).size(symbolSize))
            .attr('fill', color).attr('stroke', strokeColor).attr('stroke-width', 2);
        } else if (s === 'seguridad') {
          const w = Math.sqrt(symbolSize) * 2.5;
          const h = w / 4;
          el.append('rect')
            .attr('x', -w/2).attr('y', -h/2).attr('width', w).attr('height', h).attr('rx', 2)
            .attr('fill', color).attr('stroke', strokeColor).attr('stroke-width', 2);
        } else if (s === 'solidaridad') {
          el.append('path').attr('d', d3.symbol().type(d3.symbolDiamond).size(symbolSize))
            .attr('fill', color).attr('stroke', strokeColor).attr('stroke-width', 2);
        } else {
          el.append('path').attr('d', d3.symbol().type(d3.symbolCross).size(symbolSize * 0.8))
            .attr('fill', color).attr('stroke', strokeColor).attr('stroke-width', 2);
        }
      });
    };

    // Renderizado (se eliminan las líneas de enlace visibles)
    const nodeG = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .call(drag(simulation) as any);

    // Render categorías
    const cats = nodeG.filter((d: any) => d.type === 'category');
    cats.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '20px')
      .attr('font-weight', '900')
      .attr('fill', '#1e293b')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.05em')
      .style('text-shadow', '3px 3px 6px rgba(255,255,255,0.9), -3px -3px 6px rgba(255,255,255,0.9), 3px -3px 6px rgba(255,255,255,0.9), -3px 3px 6px rgba(255,255,255,0.9)')
      .text((d: any) => d.id);

    // Render códigos
    const codes = nodeG.filter((d: any) => d.type === 'code');
    drawShape(codes);
    
    codes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => `${(Math.sqrt(100 + (d.count * 150)) / 2) + 12}px`)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#334155')
      .style('text-shadow', '2px 2px 2px white, -2px -2px 2px white, 2px -2px 2px white, -2px 2px 2px white')
      .text((d: any) => d.label);
      
    codes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => `${(Math.sqrt(100 + (d.count * 150)) / 2) + 24}px`)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#94a3b8')
      .text((d: any) => `(${d.count})`);

    simulation.on('tick', () => {
      // Actualizar fuerzas dinámicas de agrupación
      simulation.force('x', d3.forceX((d: any) => d.type === 'code' ? catMap.get(d.parent)?.x || CENTER_X : CENTER_X).strength((d: any) => d.type === 'code' ? 0.3 : 0));
      simulation.force('y', d3.forceY((d: any) => d.type === 'code' ? catMap.get(d.parent)?.y || CENTER_Y : CENTER_Y).strength((d: any) => d.type === 'code' ? 0.3 : 0));
      // Constreñir a sus dominios visuales si es posible
      nodes.forEach(d => {
        const dx = d.x - CENTER_X;
        const dy = d.y - CENTER_Y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        let maxR = RADIUS_GENERAL - 20;
        let minR = 0;
        
        if (d.domain === 'general') { minR = RADIUS_PARTICULAR + 20; }
        else if (d.domain === 'particular') { minR = RADIUS_INDIVIDUAL + 20; maxR = RADIUS_PARTICULAR - 20; }
        else if (d.domain === 'individual') { maxR = RADIUS_INDIVIDUAL - 20; }
        
        if (dist > maxR) {
          d.x = CENTER_X + (dx / dist) * maxR;
          d.y = CENTER_Y + (dy / dist) * maxR;
        } else if (dist < minR && dist > 0) {
          d.x = CENTER_X + (dx / dist) * minR;
          d.y = CENTER_Y + (dy / dist) * minR;
        }
      });

      nodeG.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
  }, [verbatims]);

  function exportPNG() {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 2000, 2000);
      const a = document.createElement('a');
      a.download = 'mapa_concentrico_breilh.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-lg border p-6 flex flex-col relative" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold text-[#8f203d]">Mapa Concéntrico de Determinación</h3>
          <p className="text-[11px] text-gray-500 mt-0.5 max-w-xl">
            Representación jerárquica de la determinación social. El dominio General subsume al Particular, que a su vez subsume al Individual.
          </p>
        </div>
        <button onClick={exportPNG} className="btn btn-primary btn-sm gap-2 text-xs h-8">
          <Download size={14}/> Exportar PNG
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-gray-50/50 rounded-xl border border-dashed relative overflow-hidden flex" ref={containerRef}>
        <div className="w-64 border-r border-dashed bg-white/80 p-4 overflow-y-auto z-10 shadow-sm flex flex-col text-xs space-y-4">
          <div>
            <h4 className="font-bold uppercase text-slate-800 border-b pb-1 mb-2 flex items-center gap-1"><Info size={14}/> LEYENDA</h4>
            <p className="text-slate-500 text-[10px] leading-relaxed mb-3">
              Los círculos muestran cómo los procesos estructurales contienen a los particulares y singulares. Puedes arrastrar los elementos para explorar.
            </p>
          </div>
          
          <div>
            <h5 className="font-bold text-slate-700 mb-2">Procesos Críticos</h5>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500"></div> <span className="text-slate-600">Proceso Protector</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div> <span className="text-slate-600">Proceso Malsano</span>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-slate-700 mb-2 mt-2">S de la Vida (Formas)</h5>
            <div className="flex items-center gap-3 mb-2">
              <svg width="12" height="12"><path d={d3.symbol().type(d3.symbolTriangle).size(60)() as string} fill="#94a3b8" transform="translate(6,8)"/></svg>
              <span className="text-slate-600">Soberanía</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <svg width="12" height="12"><path d={d3.symbol().type(d3.symbolSquare).size(60)() as string} fill="#94a3b8" transform="translate(6,6)"/></svg>
              <span className="text-slate-600">Sustentabilidad</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-1.5 bg-[#94a3b8] rounded-full mx-0.5"></div>
              <span className="text-slate-600">Seguridad</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <svg width="12" height="12"><path d={d3.symbol().type(d3.symbolDiamond).size(60)() as string} fill="#94a3b8" transform="translate(6,6)"/></svg>
              <span className="text-slate-600">Solidaridad</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 relative cursor-move">
          {verbatims.filter(v => v.domain && v.domain !== 'none').length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <p>No hay códigos clasificados con dimensión y S de la vida para mostrar el mapa.</p>
            </div>
          )}
          <svg ref={svgRef} className="w-full h-full" />
        </div>
        
        {/* Panel derecho de evidencias */}
        <div className="w-72 border-l border-dashed bg-white/95 p-4 overflow-y-auto z-10 shadow-sm flex flex-col">
          <h4 className="font-bold uppercase text-[#8f203d] border-b pb-2 mb-4 text-xs">📝 Evidencias (Max 3)</h4>
          <div className="flex-1 space-y-4">
            {Array.from(new Set(verbatims.map(v => v.codeName))).map(codeName => {
              if (!codeName) return null;
              const matches = verbatims.filter(v => v.codeName === codeName).slice(0, 3);
              if (matches.length === 0) return null;
              const firstMatch = matches[0];
              const isProtector = firstMatch.breilhType === 'protector';
              
              return (
                <div key={codeName} className={`rounded-xl border p-3 ${isProtector ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className={`w-2 h-2 rounded-full ${isProtector ? 'bg-green-500' : 'bg-red-500'}`} />
                    <h5 className="font-bold text-[11px] text-slate-800 uppercase tracking-tight">{codeName}</h5>
                  </div>
                  <div className="space-y-2">
                    {matches.map(v => (
                      <div key={v.annotationId} className="bg-white/80 rounded p-2 text-[10px] text-slate-600 italic border border-white/50 shadow-sm">
                        "{v.text}"
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
