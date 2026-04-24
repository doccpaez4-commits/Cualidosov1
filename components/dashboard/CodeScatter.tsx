'use client';

import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis, LabelList } from 'recharts';
import type { VerbatimResult } from '@/types';
import { Download, Sparkles } from 'lucide-react';

interface CodeScatterProps {
  verbatims: VerbatimResult[];
}

export default function CodeScatter({ verbatims }: CodeScatterProps) {
  const { data, maxCode } = useMemo(() => {
    const freqs = new Map<string, { count: number, color: string, cat: string }>();

    verbatims.forEach(v => {
      const code = v.codeName || 'Genérico';
      if (!freqs.has(code)) {
        freqs.set(code, { count: 0, color: v.codeColor || '#888', cat: v.categoryName || 'S/C' });
      }
      freqs.get(code)!.count += 1;
    });

    let maxCount = 0;
    let maxC: any = null;
    const arrayData = Array.from(freqs.entries()).map(([code, info], i) => {
      if (info.count > maxCount) {
        maxCount = info.count;
        maxC = { code, count: info.count, cat: info.cat };
      }
      return {
        id: i,
        code,
        count: info.count,
        color: info.color,
        category: info.cat
      };
    });

    return {
      data: arrayData.map(d => ({
        ...d,
        isMax: d.count === maxCount,
        renderColor: d.count === maxCount ? '#e11d48' : d.color,
      })),
      maxCode: maxC
    };
  }, [verbatims]);

  function downloadSVG() {
    const svg = document.querySelector('.scatter-chart svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
      }
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'plano_saturacion.png';
      link.href = url;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  if (data.length === 0) return null;

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-md border p-6 flex flex-col" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-[#8f203d]">Plano Cartesiano de Saturación</h3>
        <button onClick={downloadSVG} className="btn btn-ghost btn-sm gap-2 text-[#8f203d]">
          <Download size={14}/> Exportar PNG
        </button>
      </div>
      
      {maxCode && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
            <Sparkles size={24}/>
          </div>
          <div>
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Núcleo de Saturación Detectado</p>
            <h4 className="text-lg font-black text-rose-900 leading-tight">"{maxCode.code}"</h4>
            <p className="text-xs text-rose-700">Este es el eje conceptual más frecuente con <strong>{maxCode.count}</strong> apariciones. Representa el hallazgo central del corpus actual.</p>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-[400px] scatter-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 40, right: 40, bottom: 60, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis 
              type="category" 
              dataKey="code" 
              name="Código" 
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: '500' }} 
              angle={-35} 
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              type="number" 
              dataKey="count" 
              name="Frecuencia" 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              label={{ value: 'Número de Verbatims', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
            />
            <ZAxis type="number" dataKey="count" range={[400, 2500]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-4 rounded-xl shadow-2xl border-2" style={{ borderColor: data.color }}>
                      <p className="font-black text-sm mb-1 text-gray-800">{data.code.toUpperCase()}</p>
                      <p className="text-xs text-gray-500 mb-2">Categoría: {data.category}</p>
                      <div className="flex items-center gap-2">
                         <span className="text-lg font-bold" style={{ color: data.renderColor }}>{data.count}</span>
                         <span className="text-[10px] text-gray-400 uppercase font-bold">Relatos</span>
                      </div>
                      {data.isMax && <p className="text-[10px] mt-2 text-rose-600 font-bold uppercase">⭐ Categoría Núcleo</p>}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Códigos" data={data}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.renderColor} 
                  fillOpacity={0.8} 
                  stroke={entry.color} 
                  strokeWidth={2}
                />
              ))}
              <LabelList dataKey="count" position="center" style={{ fill: '#fff', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-[10px] p-3 bg-gray-50 rounded border border-gray-100 italic text-gray-500">
          <strong>Resumen Metodológico:</strong> El plano cartesiano permite identificar visualmente la "Saturación de Código". Los elementos en la parte superior derecha representan las categorías de mayor densidad que sustentan la teoría emergente.
        </div>
        <div className="text-[10px] p-3 bg-gray-50 rounded border border-gray-100 italic text-gray-500">
          <strong>Descriptor Académico:</strong> La distribución muestra una concentración primaria en el código <span className="font-bold">"{maxCode?.code}"</span>, lo cual sugiere que este es el fenómeno estructurante del discurso analizado.
        </div>
      </div>
    </div>
  );
}
