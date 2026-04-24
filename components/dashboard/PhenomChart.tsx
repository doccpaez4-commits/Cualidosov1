'use client';

/**
 * PhenomChart — Dashboard específico para Fenomenología
 *
 * Gráficas basadas en:
 * - Giorgi (1985): Phenomenology and Psychological Research
 * - van Manen (1990): Researching Lived Experience
 * - Moustakas (1994): Phenomenological Research Methods
 *
 * 1. Estructura Esencial (Horizontal Stacked Bar) — distribución de temas esenciales
 * 2. Diagrama de Variación Imaginativa (Radar) — convergencia entre participantes
 * 3. Mapa de Reducción Eidética (Treemap) — jerarquía de significados
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell
} from 'recharts';
import type { VerbatimResult } from '@/types';
import { Download, Info, BookOpen } from 'lucide-react';

interface Props {
  verbatims: VerbatimResult[];
  projectId: number;
}

const PHENOM_COLORS = [
  '#0d9488','#0f766e','#14b8a6','#5eead4','#99f6e4',
  '#7c3aed','#6d28d9','#a78bfa','#c4b5fd','#ddd6fe',
];

function downloadChart(selector: string, filename: string) {
  const svg = document.querySelector(selector + ' svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle='white'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.scale(2,2); ctx.drawImage(img,0,0); }
    const a = document.createElement('a');
    a.download = filename; a.href = canvas.toDataURL('image/png'); a.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

export default function PhenomChart({ verbatims, projectId }: Props) {
  const epojeEntries = useLiveQuery(
    () => db.epojeEntries.where('projectId').equals(projectId).toArray(),
    [projectId]
  );

  const { essentialThemes, radarData, codeKeys, treemapItems } = useMemo(() => {
    // ── 1. Estructura Esencial: frecuencia de categorías (temas esenciales) ──
    const catFreq = new Map<string, { count: number; color: string }>();
    const codeFreq = new Map<string, { count: number; cat: string; color: string }>();

    verbatims.forEach(v => {
      const cat = v.categoryName || 'Sin tema';
      const code = v.codeName;
      if (!catFreq.has(cat)) catFreq.set(cat, { count: 0, color: PHENOM_COLORS[catFreq.size % PHENOM_COLORS.length] });
      catFreq.get(cat)!.count += 1;

      if (!codeFreq.has(code)) codeFreq.set(code, { count: 0, cat, color: v.codeColor || '#888' });
      codeFreq.get(code)!.count += 1;
    });

    const essentialThemes = Array.from(catFreq.entries())
      .map(([name, d]) => ({ name, count: d.count, color: d.color }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── 2. Variación Imaginativa: distribución por documento (Radar) ──
    const docMap = new Map<number, string>();
    const docCodes = new Map<number, Map<string, number>>();
    verbatims.forEach(v => {
      docMap.set(v.documentId, v.documentName);
      if (!docCodes.has(v.documentId)) docCodes.set(v.documentId, new Map());
      const cm = docCodes.get(v.documentId)!;
      cm.set(v.categoryName || 'S/C', (cm.get(v.categoryName || 'S/C') || 0) + 1);
    });

    const cats = Array.from(catFreq.keys()).slice(0, 6);
    const radarData = cats.map(cat => {
      const entry: any = { cat };
      docCodes.forEach((codes, docId) => {
        const total = Array.from(codes.values()).reduce((a, b) => a + b, 0) || 1;
        entry[docMap.get(docId) || `Doc ${docId}`] = Math.round(((codes.get(cat) || 0) / total) * 100);
      });
      return entry;
    });

    const codeKeys = Array.from(docMap.values());

    // ── 3. Treemap de reducción eidética ──
    const treemapItems = Array.from(codeFreq.entries())
      .map(([name, d]) => ({ name, value: d.count, cat: d.cat, color: d.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    return { essentialThemes, radarData, codeKeys, treemapItems };
  }, [verbatims]);

  if (verbatims.length === 0) return (
    <div className="flex items-center justify-center h-full text-center p-12" style={{ color: 'var(--text-muted)' }}>
      <div>
        <p className="text-4xl mb-4">🔍</p>
        <p className="font-semibold mb-1">Sin datos aún</p>
        <p className="text-sm">Codifica fragmentos para ver las gráficas fenomenológicas</p>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 pb-6">
      {/* Header metodológico */}
      <div className="bg-gradient-to-r from-teal-50 to-slate-50 rounded-2xl p-6 border border-teal-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">🔬</div>
          <div>
            <h2 className="text-xl font-black text-teal-800">Panel Fenomenológico</h2>
            <p className="text-sm text-teal-700 mt-1">
              Visualizaciones basadas en <strong>van Manen (1990)</strong> y <strong>Moustakas (1994)</strong> para el análisis de la experiencia vivida.
            </p>
          </div>
        </div>
      </div>

      {/* Gráfica 1: Estructura Esencial */}
      <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-teal-700">Estructura Esencial del Fenómeno</h3>
            <p className="text-xs text-gray-500 mt-1">
              Frecuencia de temas constitutivos — <em>Moustakas 1994: Textural-Structural Synthesis</em>
            </p>
          </div>
          <button onClick={() => downloadChart('.phenom-essential', 'estructura_esencial.png')}
            className="btn btn-ghost text-xs gap-1 text-teal-700">
            <Download size={13}/> PNG
          </button>
        </div>
        <div className="phenom-essential h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={essentialThemes} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3}/>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: '#334155' }}
                tickFormatter={v => v.length > 18 ? v.slice(0, 18) + '…' : v} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
                formatter={(v: any) => [v, 'Referencias']} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {essentialThemes.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 bg-teal-50 rounded-lg text-xs text-teal-800 leading-relaxed">
          <strong>Interpretación:</strong> Los temas con mayor frecuencia forman la <em>estructura esencial</em> del fenómeno estudiado. En la reducción eidética, estos son los invariantes que deben sostenerse en la síntesis textural-estructural del artículo.
        </div>
      </div>

      {/* Gráfica 2: Variación Imaginativa */}
      {radarData.length >= 3 && codeKeys.length >= 2 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-teal-700">Variación Imaginativa (Participante × Tema)</h3>
              <p className="text-xs text-gray-500 mt-1">
                Convergencia inter-subjetiva — <em>van Manen 1990: Hermeneutic Phenomenology</em>
              </p>
            </div>
            <button onClick={() => downloadChart('.phenom-radar', 'variacion_imaginativa.png')}
              className="btn btn-ghost text-xs gap-1 text-teal-700">
              <Download size={13}/> PNG
            </button>
          </div>
          <div className="phenom-radar h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="cat" tick={{ fontSize: 10, fill: '#475569' }}
                  tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickCount={4} />
                {codeKeys.slice(0, 5).map((key, i) => (
                  <Radar key={key} name={key} dataKey={key}
                    stroke={PHENOM_COLORS[i]}
                    fill={PHENOM_COLORS[i]}
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
                  formatter={(v: any) => [`${v}%`, 'Proporción']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 bg-teal-50 rounded-lg text-xs text-teal-800 leading-relaxed">
            <strong>Interpretación:</strong> El Radar muestra la <em>variación imaginativa libre</em>: qué tanto cada participante/documento vivencia cada tema. Una superposición alta indica un tema <strong>intersubjetivo</strong> (esencial). Las divergencias revelan la <em>variabilidad de horizontes</em>.
          </div>
        </div>
      )}

      {/* Diario de Epojé (desde Asesor Pedagógico) */}
      {epojeEntries && epojeEntries.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold text-teal-700 mb-4 flex items-center gap-2">
            <BookOpen size={18}/> Diario de Epojé
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {epojeEntries.map(entry => (
              <div key={entry.id} className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-teal-400" />
                <p className="text-xs text-teal-900 italic flex-1 leading-relaxed">
                  "{entry.content}"
                </p>
                <div className="text-[9px] text-teal-600 opacity-60 text-right mt-1 font-medium">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '📖', title: 'Epojé (Reducción)', body: 'El investigador suspende sus pre-suposiciones. Registra tus reflexiones en el diario de Epojé del panel lateral.' },
          { icon: '🔗', title: 'Reducción Eidética', body: 'Identifica las variantes y las invariantes del fenómeno. Los temas más frecuentes son candidatos a la estructura esencial.' },
          { icon: '✍️', title: 'Síntesis Textural-Estructural', body: 'Combina la descripción textural (¿qué?) con la estructural (¿cómo?) para la sección de hallazgos del paper.' },
        ].map(item => (
          <div key={item.title} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="text-2xl mb-2">{item.icon}</div>
            <h4 className="font-bold text-sm text-slate-700 mb-2">{item.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
