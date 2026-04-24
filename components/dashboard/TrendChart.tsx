'use client';

import { useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { VerbatimResult } from '@/types';
import { Download, Info } from 'lucide-react';

interface TrendChartProps {
  verbatims: VerbatimResult[];
}

export default function TrendChart({ verbatims }: TrendChartProps) {
  // Procesar datos para ver la "acumulación" de códigos por documento
  const { data, codeKeys, colors } = useMemo(() => {
    // 1. Agrupar por documento
    const docsMap = new Map<number, { name: string, counts: Record<string, number> }>();
    const allCodes = new Set<string>();
    const colorMap: Record<string, string> = {};

    verbatims.forEach(v => {
      const docId = v.documentId;
      const codeName = v.codeName;
      if (!docsMap.has(docId)) {
        docsMap.set(docId, { name: v.documentName, counts: {} });
      }
      const docData = docsMap.get(docId)!;
      docData.counts[codeName] = (docData.counts[codeName] || 0) + 1;
      allCodes.add(codeName);
      colorMap[codeName] = v.codeColor;
    });

    // 2. Convertir a array y generar acumulados
    // Ordenamos por docId (asumiendo orden cronológico de carga)
    const sortedDocs = Array.from(docsMap.entries()).sort((a, b) => a[0] - b[0]);
    
    let runningCounts: Record<string, number> = {};
    const chartData = sortedDocs.map(([_, doc]) => {
      const entry: any = { name: doc.name };
      Array.from(allCodes).forEach(code => {
        runningCounts[code] = (runningCounts[code] || 0) + (doc.counts[code] || 0);
        entry[code] = runningCounts[code];
      });
      return entry;
    });

    return { 
      data: chartData, 
      codeKeys: Array.from(allCodes),
      colors: colorMap
    };
  }, [verbatims]);

  function downloadSVG() {
    const svg = document.querySelector('.trend-chart svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2; // High res
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
      }
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'acumulacion_codigos.png';
      link.href = url;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  if (data.length === 0) return null;

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-md border p-6 flex flex-col" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#8f203d] flex items-center gap-2">
            Dinámica de Saturación por Documento
          </h3>
          <p className="text-xs text-gray-500 mt-1">Acumulación progresiva de códigos a través del corpus de investigación.</p>
        </div>
        <button onClick={downloadSVG} className="btn btn-ghost btn-sm gap-2 text-[#8f203d]">
          <Download size={14}/> Exportar PNG
        </button>
      </div>

      <div className="flex-1 min-h-[400px] trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              {codeKeys.map(code => (
                <linearGradient key={`grad-${code}`} id={`color-${code}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[code]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={colors[code]} stopOpacity={0.1}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              label={{ value: 'Frecuencia Acumulada', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '11px', fontWeight: '600' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
            {codeKeys.map(code => (
              <Area 
                key={code} 
                type="monotone" 
                dataKey={code} 
                stackId="1" 
                stroke={colors[code]} 
                fillOpacity={1} 
                fill={`url(#color-${code})`} 
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed flex gap-3 items-start">
        <Info size={16} className="text-[#8f203d] mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-gray-600 leading-relaxed">
          <strong>Interpretación Científica:</strong> Este gráfico permite observar si existe una "meseta" en la aparición de códigos, lo cual es indicador de **Saturación Teórica**. Si el área de un código crece exponencialmente en los últimos documentos, indica que el fenómeno sigue presentándose con fuerza y requiere más análisis.
        </div>
      </div>
    </div>
  );
}
