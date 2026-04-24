'use client';

/**
 * IAPChart — Dashboard específico para IAP (Investigación-Acción Participativa)
 *
 * Basado en:
 * - Fals Borda (1987): The Application of Participatory Action Research in Latin America
 * - Reason & Bradbury (2008): The SAGE Handbook of Action Research
 * - Kemmis & McTaggart (2005): Participatory Action Research: Communicative Action
 *
 * 1. Ciclo de Acción-Reflexión (Donut Radar) — fases del proceso
 * 2. Participación por Actor (Bar Chart horizontal) — quién genera más conocimiento
 * 3. Progresión de Demandas (Line) — evolución de problemáticas según ciclos
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  LineChart, Line
} from 'recharts';
import type { VerbatimResult } from '@/types';
import { Download, Info } from 'lucide-react';

interface Props {
  verbatims: VerbatimResult[];
  projectId: number;
}

const IAP_COLORS = [
  '#059669','#10b981','#34d399','#6ee7b7',
  '#065f46','#047857','#0d9488','#0f766e',
];

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

export default function IAPChart({ verbatims, projectId }: Props) {
  const cycles = useLiveQuery(
    () => db.iapCycles.where('projectId').equals(projectId).toArray(),
    [projectId]
  );

  const { cycleData, actorData, demandData } = useMemo(() => {
    // ── 1. Ciclo IAP — distribución temática por categorías (fases del ciclo) ──
    const catMap = new Map<string, number>();
    const docCatMap = new Map<string, Map<string, number>>();
    const allCats = new Set<string>();

    verbatims.forEach(v => {
      const cat = v.categoryName || 'Sin categoría';
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
      allCats.add(cat);
      if (!docCatMap.has(v.documentName)) docCatMap.set(v.documentName, new Map());
      const dm = docCatMap.get(v.documentName)!;
      dm.set(cat, (dm.get(cat) || 0) + 1);
    });

    const totalV = verbatims.length || 1;
    const cycleData = Array.from(catMap.entries())
      .map(([cat, count]) => ({ cat: cat.length > 16 ? cat.slice(0,16)+'…' : cat, count, pct: Math.round((count/totalV)*100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── 2. Participación por documento (actor colectivo en IAP) ──
    const actorData = Array.from(docCatMap.entries())
      .map(([doc, cats]) => ({
        actor: doc.length > 18 ? doc.slice(0,18)+'…' : doc,
        aportaciones: Array.from(cats.values()).reduce((a,b) => a+b, 0),
        categorias: cats.size,
      }))
      .sort((a, b) => b.aportaciones - a.aportaciones)
      .slice(0, 8);

    // ── 3. Progresión de demandas por documento (evolución del proceso) ──
    const cats = Array.from(catMap.keys()).slice(0, 4);
    const demandData = Array.from(docCatMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([doc, catCounts]) => {
        const entry: any = { doc: doc.length > 12 ? doc.slice(0,12)+'…' : doc };
        cats.forEach(cat => { entry[cat] = catCounts.get(cat) || 0; });
        return entry;
      });

    return { cycleData, actorData, demandData };
  }, [verbatims]);

  if (verbatims.length === 0) return (
    <div className="flex items-center justify-center h-full text-center p-12" style={{ color: 'var(--text-muted)' }}>
      <div>
        <p className="text-4xl mb-4">🤝</p>
        <p className="font-semibold mb-1">Sin datos aún</p>
        <p className="text-sm">Codifica tus ciclos de acción para ver las gráficas IAP</p>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 pb-6">
      {/* Header metodológico */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">🤝</div>
          <div>
            <h2 className="text-xl font-black text-emerald-900">Panel IAP — Investigación-Acción Participativa</h2>
            <p className="text-sm text-emerald-800 mt-1">
              Visualizaciones basadas en <strong>Fals Borda (1987)</strong>, <strong>Reason & Bradbury (2008)</strong> y <strong>Kemmis & McTaggart (2005)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Gráfica 1: Radar de Ciclo IAP */}
      {cycleData.length >= 3 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-emerald-700">Ciclo Temático de Acción-Reflexión</h3>
              <p className="text-xs text-gray-500 mt-1">
                Distribución de hallazgos en el espiral IAP · <em>Kemmis & McTaggart 2005</em>
              </p>
            </div>
            <button onClick={() => downloadChart('.iap-cycle', 'ciclo_iap.png')}
              className="btn btn-ghost text-xs gap-1 text-emerald-700">
              <Download size={13}/> PNG
            </button>
          </div>
          <div className="iap-cycle h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={cycleData}>
                <PolarGrid stroke="#d1fae5" />
                <PolarAngleAxis dataKey="cat" tick={{ fontSize: 10, fill: '#065f46' }} />
                <PolarRadiusAxis tick={{ fontSize: 8, fill: '#a7f3d0' }} tickCount={4} />
                <Radar name="Evidencias" dataKey="count"
                  stroke="#059669" fill="#10b981" fillOpacity={0.3} strokeWidth={2.5} />
                <Radar name="Peso (%)" dataKey="pct"
                  stroke="#34d399" fill="#34d399" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2" />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg text-xs text-emerald-900 leading-relaxed">
            <strong>Interpretación:</strong> El radar del ciclo IAP muestra qué temáticas concentran más evidencia en el proceso participativo. Las áreas de mayor cobertura son los focos donde la acción colectiva tuvo mayor resonancia. Esto orienta las <em>recomendaciones transformadoras</em> del paper.
          </div>
        </div>
      )}

      {/* Gráfica 2: Participación por actor/documento */}
      <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-emerald-700">Aportaciones por Actor Colectivo</h3>
            <p className="text-xs text-gray-500 mt-1">
              Producción de conocimiento por fuente · <em>Fals Borda 1987: Conocimiento y Poder Popular</em>
            </p>
          </div>
          <button onClick={() => downloadChart('.iap-actors', 'actores_iap.png')}
            className="btn btn-ghost text-xs gap-1 text-emerald-700">
            <Download size={13}/> PNG
          </button>
        </div>
        <div className="iap-actors h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={actorData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis dataKey="actor" type="category" width={140} tick={{ fontSize: 10, fill: '#334155' }} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="aportaciones" name="Fragmentos codificados" radius={[0,6,6,0]} fill="#059669" maxBarSize={24}>
                {actorData.map((_, i) => <Cell key={i} fill={IAP_COLORS[i % IAP_COLORS.length]} />)}
              </Bar>
              <Bar dataKey="categorias" name="Categorías involucradas" radius={[0,6,6,0]} fill="#a7f3d0" maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg text-xs text-emerald-900 leading-relaxed">
          <strong>Interpretación:</strong> En la IAP, la producción de conocimiento es co-construida. Las fuentes con mayor número de aportaciones son los "investigadores populares" más activos del proceso. La diversidad de categorías indica la riqueza de perspectivas de cada actor.
        </div>
      </div>

      {/* Gráfica 3: Progresión de demandas por ciclo */}
      {demandData.length >= 2 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-emerald-700">Evolución de Demandas por Ciclo de Campo</h3>
              <p className="text-xs text-gray-500 mt-1">
                Progresión de las problemáticas a lo largo del proceso · <em>Reason & Bradbury 2008</em>
              </p>
            </div>
            <button onClick={() => downloadChart('.iap-demand', 'demandas_iap.png')}
              className="btn btn-ghost text-xs gap-1 text-emerald-700">
              <Download size={13}/> PNG
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 iap-demand h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={demandData} margin={{ top: 0, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="doc" tick={{ fontSize: 9, fill: '#64748b' }} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  {Object.keys(demandData[0] || {}).filter(k => k !== 'doc').map((cat, i) => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke={IAP_COLORS[i % IAP_COLORS.length]}
                      strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Lista de ciclos a la derecha */}
            {cycles && cycles.length > 0 && (
              <div className="md:col-span-1 space-y-3 max-h-64 overflow-y-auto no-scrollbar pr-2">
                <h4 className="text-sm font-bold text-emerald-800 border-b border-emerald-100 pb-2 mb-3">Ciclos Registrados</h4>
                {cycles.map(cycle => (
                   <div key={cycle.id} className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full" 
                      style={{ background: cycle.phase === 'planning' ? '#10b981' : cycle.phase === 'action' ? '#34d399' : '#6ee7b7' }} />
                     <h5 className="font-bold text-sm text-emerald-900 mb-1">{cycle.name}</h5>
                     {cycle.actors?.length > 0 && (
                       <div className="text-[10px] font-medium text-emerald-600 mb-2 uppercase tracking-wide">
                         Actores: {cycle.actors.join(', ')}
                       </div>
                     )}
                     <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 pl-2 border-emerald-50">
                       {cycle.reflection}
                     </p>
                     <div className="mt-2 text-[9px] text-right text-slate-400">
                       {new Date(cycle.createdAt).toLocaleDateString()}
                     </div>
                   </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg text-xs text-emerald-900 leading-relaxed">
            <strong>Interpretación:</strong> La línea ascendente en una categoría sugiere que esa demanda se fue consolidando a lo largo del proceso. Una curva descendente puede indicar que fue abordada o transformada. Este gráfico y el desglose de reflexiones son clave para narrar el <em>espiral de acción-reflexión</em> en la sección de resultados.
          </div>
        </div>
      )}

      {/* Recuadros metodológicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '🔄', title: 'Espiral de Acción', body: 'Kemmis (2005): El proceso IAP no es lineal sino espiral. Planifica → Actúa → Observa → Reflexiona. Cada ciclo genera aprendizaje colectivo.' },
          { icon: '🌱', title: 'Conocimiento Popular', body: 'Fals Borda (1987): El conocimiento generado en la IAP pertenece a la comunidad. Documenta las "versiones propias" de los participantes con sus propias palabras.' },
          { icon: '⚡', title: 'Transformación Social', body: 'Reason & Bradbury (2008): El criterio de calidad en IAP no es la generalización sino el cambio real. ¿Qué transformaciones se lograron? Esto va en la discusión.' },
        ].map(item => (
          <div key={item.title} className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <div className="text-2xl mb-2">{item.icon}</div>
            <h4 className="font-bold text-sm text-emerald-800 mb-2">{item.title}</h4>
            <p className="text-xs text-emerald-700 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
