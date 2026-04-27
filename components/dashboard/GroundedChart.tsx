'use client';

/**
 * GroundedChart — Dashboard específico para Teoría Fundamentada
 *
 * Basado en:
 * - Charmaz (2014): Constructing Grounded Theory (2nd Ed.)
 * - Strauss & Corbin (1998): Basics of Qualitative Research
 * - Glaser & Strauss (1967): The Discovery of Grounded Theory
 *
 * 1. Diamante de Codificación (Funnel chart via barras)  — reducción Open→Axial→Selectiva
 * 2. Saturación Progresiva (Line Chart) — curva de saturación teórica
 * 3. Red de Categorías Axiales (Relational bar) — vínculos categoría-propiedad-dimensión
 */

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
  LineChart, Line, Legend,
  FunnelChart, Funnel, FunnelProps
} from 'recharts';
import type { VerbatimResult } from '@/types';
import { Download, Info, TrendingDown } from 'lucide-react';

interface Props {
  verbatims: VerbatimResult[];
  codes?: Array<{ id?: number; name: string; groundedPhase?: string; color: string; categoryId?: number }>;
}

const GT_COLORS = {
  open:      '#7c6af7',
  axial:     '#3b82f6',
  selective: '#0358a1',
  unknown:   '#94a3b8',
};

function downloadChart(selector: string, filename: string) {
  const svg = document.querySelector(selector + ' svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width * 2; canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle='white'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.scale(2,2); ctx.drawImage(img,0,0); }
    const a = document.createElement('a'); a.download = filename; a.href = canvas.toDataURL('image/png'); a.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

export default function GroundedChart({ verbatims, codes = [] }: Props) {
  const { funnelData, saturationData, axialData } = useMemo(() => {
    // ── 1. Funnel de codificación: Open → Axial → Selectiva ──
    const phaseCounts = { open: 0, axial: 0, selective: 0, unknown: 0 };
    const codeMap = new Map(codes.map(c => [c.name, c]));

    verbatims.forEach(v => {
      const code = codeMap.get(v.codeName);
      const phase = code?.groundedPhase || 'unknown';
      if (phase === 'open' || phase === 'axial' || phase === 'selective') phaseCounts[phase]++;
      else phaseCounts.unknown++;
    });

    const funnelData = [
      { name: 'Codif. Abierta', value: phaseCounts.open + phaseCounts.unknown, color: GT_COLORS.open, label: '🔓 Abierta' },
      { name: 'Codif. Axial',   value: phaseCounts.axial,    color: GT_COLORS.axial,    label: '🔀 Axial' },
      { name: 'Codif. Selectiva', value: phaseCounts.selective, color: GT_COLORS.selective, label: '🎯 Selectiva' },
    ].filter(d => d.value > 0);

    // ── 2. Curva de saturación teórica ──
    const docCodeSets = new Map<number, Set<string>>();
    const sortedV = [...verbatims].sort((a, b) => a.documentId - b.documentId);
    sortedV.forEach(v => {
      if (!docCodeSets.has(v.documentId)) docCodeSets.set(v.documentId, new Set());
      docCodeSets.get(v.documentId)!.add(v.codeName);
    });

    let seenCodes = new Set<string>();
    let totalFragments = 0;
    const saturationData = Array.from(docCodeSets.entries()).map(([docId, docCodes]) => {
      const docCodesArr = Array.from(docCodes);
      const newCodes = docCodesArr.filter(c => !seenCodes.has(c)).length;
      docCodesArr.forEach(c => seenCodes.add(c));
      totalFragments += docCodesArr.reduce((a, c) => a + verbatims.filter(v => v.documentId === docId && v.codeName === c).length, 0);
      return {
        doc: `Doc ${docId}`,
        totalCodigos: seenCodes.size,
        nuevosCodigos: newCodes,
        fragmentos: totalFragments,
      };
    });

    // ── 3. Categorías axiales: frecuencia por categoría (para memo) ──
    const catFreq = new Map<string, { count: number; codes: number; color: string }>();
    verbatims.forEach(v => {
      const cat = v.categoryName || 'Sin categoría';
      if (!catFreq.has(cat)) catFreq.set(cat, { count: 0, codes: 0, color: v.codeColor || '#888' });
      catFreq.get(cat)!.count += 1;
    });
    // Contar códigos únicos por categoría
    const catCodes = new Map<string, Set<string>>();
    verbatims.forEach(v => {
      const cat = v.categoryName || 'Sin categoría';
      if (!catCodes.has(cat)) catCodes.set(cat, new Set());
      catCodes.get(cat)!.add(v.codeName);
    });
    catFreq.forEach((v, k) => { v.codes = catCodes.get(k)?.size || 0; });

    const axialData = Array.from(catFreq.entries())
      .map(([name, d]) => ({ name, evidencias: d.count, propiedades: d.codes, color: d.color }))
      .sort((a, b) => b.evidencias - a.evidencias)
      .slice(0, 8);

    return { funnelData, saturationData, axialData };
  }, [verbatims, codes]);

  if (verbatims.length === 0) return (
    <div className="flex items-center justify-center h-full text-center p-12" style={{ color: 'var(--text-muted)' }}>
      <div>
        <p className="text-4xl mb-4">⚗️</p>
        <p className="font-semibold mb-1">Sin datos aún</p>
        <p className="text-sm">Codifica fragmentos para ver las gráficas de Teoría Fundamentada</p>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 pb-6">
      {/* Header metodológico */}
      <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-2xl p-6 border border-violet-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">⚗️</div>
          <div>
            <h2 className="text-xl font-black text-violet-900">Panel Teoría Fundamentada</h2>
            <p className="text-sm text-violet-800 mt-1">
              Visualizaciones basadas en <strong>Charmaz (2014)</strong>, <strong>Strauss & Corbin (1998)</strong> y <strong>Glaserianas (1967)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Gráfica 1: Embudo de Codificación */}
      {funnelData.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-violet-700">Embudo de Reducción de Códigos</h3>
              <p className="text-xs text-gray-500 mt-1">
                Progresión Open → Axial → Selectiva · <em>Strauss & Corbin 1998: Basics of Qualitative Research</em>
              </p>
            </div>
            <button onClick={() => downloadChart('.gt-funnel', 'embudo_codificacion.png')}
              className="btn btn-ghost text-xs gap-1 text-violet-700">
              <Download size={13}/> PNG
            </button>
          </div>
          <div className="gt-funnel h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'Fragmentos', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
                  formatter={(v: any) => [v, 'Fragmentos']} />
                <Bar dataKey="value" name="Fragmentos" radius={[10, 10, 0, 0]} maxBarSize={90}>
                  {funnelData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: '14px', fontWeight: 'bold', fill: '#334155' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 bg-violet-50 rounded-lg text-xs text-violet-900 leading-relaxed">
            <strong>Interpretación:</strong> El embudo muestra la reducción progresiva. En GT, la codificación abierta genera muchos códigos, la axial los agrupa en categorías, y la selectiva las integra en una <em>categoría central</em>. Si la selectiva es 0, aún no has llegado a la teoría emergente.
          </div>
        </div>
      )}

      {/* Gráfica 2: Curva de Saturación Teórica */}
      {saturationData.length >= 2 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-violet-700">Curva de Saturación Teórica</h3>
              <p className="text-xs text-gray-500 mt-1">
                Nuevos códigos por documento · <em>Glaser & Strauss 1967: Theoretical Saturation</em>
              </p>
            </div>
            <button onClick={() => downloadChart('.gt-saturation', 'saturacion_teorica.png')}
              className="btn btn-ghost text-xs gap-1 text-violet-700">
              <Download size={13}/> PNG
            </button>
          </div>
          <div className="gt-saturation h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={saturationData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="doc" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line yAxisId="left" type="monotone" dataKey="totalCodigos" name="Total Códigos Acum."
                  stroke={GT_COLORS.open} strokeWidth={2.5} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="nuevosCodigos" name="Nuevos Códigos"
                  stroke={GT_COLORS.selective} strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 bg-violet-50 rounded-lg text-xs text-violet-900 leading-relaxed">
            <strong>Interpretación:</strong> Cuando la línea roja (<em>Nuevos Códigos</em>) se aproxima a cero, has alcanzado la <strong>saturación teórica</strong>. La línea morada (total acumulado) debe mostrar una "meseta" al final. Este gráfico es el criterio de rigor más importante para justificar el tamaño de la muestra en GT.
          </div>
        </div>
      )}

      {/* Gráfica 3: Riqueza de Categorías Axiales */}
      <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-violet-700">Riqueza de Categorías Axiales</h3>
            <p className="text-xs text-gray-500 mt-1">
              Evidencias y propiedades por categoría · <em>Charmaz 2014: Focused Coding</em>
            </p>
          </div>
          <button onClick={() => downloadChart('.gt-axial', 'categorias_axiales.png')}
            className="btn btn-ghost text-xs gap-1 text-violet-700">
            <Download size={13}/> PNG
          </button>
        </div>
        <div className="gt-axial h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={axialData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10, fill: '#334155' }}
                tickFormatter={v => v.length > 18 ? v.slice(0,18)+'…' : v} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="evidencias" name="Evidencias/Verbatims" radius={[0,6,6,0]} fill={GT_COLORS.axial} maxBarSize={22} />
              <Bar dataKey="propiedades" name="Propiedades (códigos únicos)" radius={[0,6,6,0]} fill={GT_COLORS.open} fillOpacity={0.6} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 bg-violet-50 rounded-lg text-xs text-violet-900 leading-relaxed">
          <strong>Interpretación:</strong> Las categorías con más <em>propiedades</em> (barra lila) son más densas conceptualmente. Cada propiedad requiere definición de sus dimensiones en la codificación axial. La categoría con mayor riqueza relacional es candidata a ser la <strong>categoría central</strong> de tu teoría.
        </div>
      </div>

      {/* Pizarra de Memos Teóricos (desde Asesor Pedagógico) */}
      {verbatims.some(v => v.memos && v.memos.length > 0) && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold text-violet-700 mb-4 flex items-center gap-2">
            <Info size={18}/> Pizarra de Memos Teóricos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {verbatims.filter(v => v.memos && v.memos.length > 0).map(v => 
              v.memos!.map(memo => (
                <div key={memo.id} className="p-4 bg-violet-50/50 rounded-xl border border-violet-100 flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-violet-400" />
                  <p className="text-[10px] text-violet-600 font-bold uppercase tracking-wider mb-1">
                    Ref: {v.codeName}
                  </p>
                  <p className="text-xs text-violet-900 italic flex-1 leading-relaxed border-l-2 border-violet-200 pl-2">
                    {memo.content}
                  </p>
                  <div className="text-[9px] text-violet-500 opacity-80 text-right mt-1 font-medium">
                    {new Date(memo.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Recuadros metodológicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '⚗️', title: 'Codificación Focalizada', body: 'Charmaz (2014): Después de la codificación abierta, identifica los códigos más frecuentes y significativos. Úsalos para filtrar el corpus completo.' },
          { icon: '🔗', title: 'Paradigma de Codificación', body: 'Strauss & Corbin (1998): Cada categoría axial tiene: condiciones causales, fenómeno, contexto, condiciones intervinientes, estrategias y consecuencias.' },
          { icon: '🎯', title: 'Categoría Central', body: 'Glaser & Strauss (1967): Una categoría que da cuenta de la mayor variación en el patrón de comportamiento. Debe ser frecuente, relacionada con todas las demás y abstracta.' },
        ].map(item => (
          <div key={item.title} className="p-5 bg-violet-50 border border-violet-100 rounded-2xl">
            <div className="text-2xl mb-2">{item.icon}</div>
            <h4 className="font-bold text-sm text-violet-800 mb-2">{item.title}</h4>
            <p className="text-xs text-violet-700 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
