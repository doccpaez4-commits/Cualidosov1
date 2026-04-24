'use client';

import { useEffect, useRef, useState } from 'react';
import type { VerbatimResult, WordFrequency } from '@/types';
import * as d3 from 'd3';
// d3-cloud se importa dinámicamente por compatibilidad SSR
import { Settings } from 'lucide-react';

interface Props {
  projectId: number;
  stopwords: string[];
  verbatims: VerbatimResult[];
}

export default function WordCloud({ projectId, stopwords, verbatims }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [words, setWords] = useState<WordFrequency[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [customStopwords, setCustomStopwords] = useState(stopwords.join(', '));
  const [minFreq, setMinFreq] = useState(2);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const worker = new Worker('/workers/wordWorker.js');
    
    worker.onmessage = (e) => {
      setWords(e.data);
      setLoading(false);
    };

    const computeWithWorker = () => {
      setLoading(true);
      worker.postMessage({ verbatims, customStopwords, minFreq });
    };

    computeWithWorker();

    return () => worker.terminate();
  }, [verbatims, customStopwords, minFreq]);

  useEffect(() => {
    if (!svgRef.current || words.length === 0) return;
    drawCloud();
  }, [words]);

  async function drawCloud() {
    const cloud = (await import('d3-cloud')).default;
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const W = svgRef.current!.parentElement?.clientWidth ?? 700;
    const H = svgRef.current!.parentElement?.clientHeight ?? 420;
    svg.attr('width', W).attr('height', H);

    const maxVal = d3.max(words, w => w.value) ?? 1;
    const sizeScale = d3.scaleSqrt().domain([1, maxVal]).range([12, 64]);
    const colors = ['#7c6af7','#14b8a6','#f59e0b','#fb7185','#10b981','#3b82f6','#ec4899'];
    const colorScale = d3.scaleOrdinal(colors);

    cloud()
      .size([W, H])
      .words(words.map(w => ({ text: w.text, size: sizeScale(w.value) })))
      .padding(4)
      .rotate(() => (Math.random() > 0.7 ? 90 : 0))
      .font('Inter')
      .fontSize(d => (d as any).size)
      .on('end', (placed: any[]) => {
        const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);
        g.selectAll('text').data(placed).enter().append('text')
          .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
          .style('font-size', d => `${d.size}px`)
          .style('font-family', 'Inter')
          .style('fill', (_, i) => colorScale(String(i)))
          .style('cursor', 'default')
          .attr('text-anchor', 'middle')
          .attr('opacity', 0)
          .text(d => d.text)
          .transition().duration(600).attr('opacity', 0.9);
      })
      .start();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Nube de Palabras</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Frecuencia de términos en todos los verbatims codificados.
          </p>
        </div>
        <button className="btn btn-ghost text-xs" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={13}/> Configurar
        </button>
      </div>

      {showSettings && (
        <div className="card mb-4 space-y-2 animate-fade-in">
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Palabras de parada adicionales</label>
            <textarea className="input text-xs mt-1" rows={3}
              placeholder="palabra1, palabra2, palabra3..."
              value={customStopwords} onChange={e => setCustomStopwords(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Frecuencia mínima: <span style={{ color: 'var(--accent)' }}>{minFreq}</span>
            </label>
            <input type="range" min={1} max={10} value={minFreq} onChange={e => setMinFreq(Number(e.target.value))}
              className="w-full mt-1" />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{words.length} palabras en la nube</p>
        </div>
      )}

      {words.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="empty-state"><p className="text-xl">☁️</p><p>Agrega más verbatims para ver la nube.</p></div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}
