'use client';

/**
 * EthnoChart — Dashboard específico para Etnografía
 *
 * Basado en:
 * - Geertz (1973): The Interpretation of Cultures — «Thick Description»
 * - Spradley (1979): The Ethnographic Interview
 * - Hammersley & Atkinson (1995): Ethnography: Principles in Practice
 *
 * 1. Mapa de Actores y Relaciones (Grafo simple SVG) — red social del campo
 * 2. Cronología de Notas de Campo (Timeline bar) — densidad temporal
 * 3. Dominio Cultural (Taxonomía horizontal) — taxonomías de Spradley
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import type { VerbatimResult } from '@/types';
import { Download, Info, Image as ImageIcon, MapPin } from 'lucide-react';

interface Props {
  verbatims: VerbatimResult[];
  projectId: number;
}

const ETHNO_COLORS = [
  '#d97706','#b45309','#f59e0b','#fbbf24','#fcd34d',
  '#92400e','#78350f','#a16207','#ca8a04','#eab308',
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

export default function EthnoChart({ verbatims, projectId }: Props) {
  const fieldNotes = useLiveQuery(
    () => db.fieldNotes.where('projectId').equals(projectId).toArray(),
    [projectId]
  );

  const { domainData, docTimeline, actorData } = useMemo(() => {
    // ── 1. Dominios Culturales de Spradley (categorías = dominios) ──
    const domainFreq = new Map<string, { count: number; codes: Set<string> }>();
    const docFreq = new Map<string, number>();

    verbatims.forEach(v => {
      const domain = v.categoryName || 'Dominio General';
      if (!domainFreq.has(domain)) domainFreq.set(domain, { count: 0, codes: new Set() });
      domainFreq.get(domain)!.count += 1;
      domainFreq.get(domain)!.codes.add(v.codeName);
      docFreq.set(v.documentName, (docFreq.get(v.documentName) || 0) + 1);
    });

    const domainData = Array.from(domainFreq.entries())
      .map(([name, d], i) => ({
        name,
        evidencias: d.count,
        taxones: d.codes.size,
        color: ETHNO_COLORS[i % ETHNO_COLORS.length]
      }))
      .sort((a, b) => b.evidencias - a.evidencias)
      .slice(0, 10);

    // ── 2. Densidad por nota de campo / documento ──
    const docTimeline = Array.from(docFreq.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // ── 3. Red de actores: Usar códigos como "actores" para radar ──
    const codeFreq = new Map<string, number>();
    verbatims.forEach(v => {
      codeFreq.set(v.codeName, (codeFreq.get(v.codeName) || 0) + 1);
    });
    const topCodes = Array.from(codeFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const totalUnits = verbatims.length || 1;
    const actorData = topCodes.map(c => ({
      code: c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name,
      presencia: Math.round((c.count / totalUnits) * 100),
    }));

    return { domainData, docTimeline, actorData };
  }, [verbatims]);

  if (verbatims.length === 0) return (
    <div className="flex items-center justify-center h-full text-center p-12" style={{ color: 'var(--text-muted)' }}>
      <div>
        <p className="text-4xl mb-4">🏕️</p>
        <p className="font-semibold mb-1">Sin datos aún</p>
        <p className="text-sm">Codifica tus notas de campo para ver las gráficas etnográficas</p>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 pb-6">
      {/* Header metodológico */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0">🏕️</div>
          <div>
            <h2 className="text-xl font-black text-amber-900">Panel Etnográfico</h2>
            <p className="text-sm text-amber-800 mt-1">
              Visualizaciones basadas en <strong>Geertz (1973)</strong> y <strong>Spradley (1979)</strong> para análisis de cultura y descripción densa.
            </p>
          </div>
        </div>
      </div>

      {/* Gráfica 1: Dominios Culturales (Spradley) */}
      <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-amber-700">Dominios Culturales — Taxonomía de Spradley</h3>
            <p className="text-xs text-gray-500 mt-1">
              Frecuencia de evidencias por dominio cultural · <em>Spradley 1979: Semantic Relationships</em>
            </p>
          </div>
          <button onClick={() => downloadChart('.ethno-domains', 'dominios_culturales.png')}
            className="btn btn-ghost text-xs gap-1 text-amber-700">
            <Download size={13}/> PNG
          </button>
        </div>
        <div className="ethno-domains h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={domainData} margin={{ top: 0, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3}/>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} angle={-30} textAnchor="end" height={60}
                tickFormatter={v => v.length > 14 ? v.slice(0,14)+'…' : v} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="evidencias" radius={[8, 8, 0, 0]} name="Evidencias" maxBarSize={50}>
                {domainData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
              <Bar dataKey="taxones" radius={[8, 8, 0, 0]} name="Taxones (códigos)" fill="#d4a852" maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-900 leading-relaxed">
          <strong>Interpretación:</strong> Cada dominio cultural es una categoría semántica identificada en el campo. El número de <em>taxones</em> (barras beige) indica la complejidad interna del dominio. Los dominios con mayor riqueza taxonómica son candidatos para el análisis de <em>descripción densa</em> en el paper.
        </div>
      </div>

      {/* Gráfica 2: Presencia de Actores / Códigos en el corpus */}
      {actorData.length >= 3 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-amber-700">Presencia Temática en el Corpus (% del total)</h3>
              <p className="text-xs text-gray-500 mt-1">
                Visibilidad relativa de categorías analíticas · <em>Hammersley & Atkinson 1995</em>
              </p>
            </div>
            <button onClick={() => downloadChart('.ethno-presence', 'presencia_tematica.png')}
              className="btn btn-ghost text-xs gap-1 text-amber-700">
              <Download size={13}/> PNG
            </button>
          </div>
          <div className="ethno-presence h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={actorData}>
                <PolarGrid stroke="#fde68a" />
                <PolarAngleAxis dataKey="code" tick={{ fontSize: 9, fill: '#78350f' }} />
                <PolarRadiusAxis domain={[0,100]} tick={{ fontSize: 8, fill: '#a16207' }} tickCount={4} />
                <Radar name="Presencia (%)" dataKey="presencia"
                  stroke="#d97706" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Presencia corpus']}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-900 leading-relaxed">
            <strong>Interpretación:</strong> El radar muestra qué porcentaje del corpus abarca cada categoría analítica. Un dominio que ocupa mucho ángulo tiene alta presencia etnográfica. Esto orienta qué secciones de la etnografía merecen mayor desarrollo narrativo.
          </div>
        </div>
      )}

      {/* Gráfica 3: Densidad por nota / documento */}
      <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-amber-700">Densidad Analítica por Nota de Campo</h3>
            <p className="text-xs text-gray-500 mt-1">
              Riqueza codificada por texto — criterio de saturación etnográfica
            </p>
          </div>
          <button onClick={() => downloadChart('.ethno-density', 'densidad_notas.png')}
            className="btn btn-ghost text-xs gap-1 text-amber-700">
            <Download size={13}/> PNG
          </button>
        </div>
        <div className="ethno-density h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={docTimeline} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: '#334155' }}
                tickFormatter={v => v.length > 20 ? v.slice(0,20)+'…' : v} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
                formatter={(v:any) => [v, 'Fragmentos codificados']} />
              <Bar dataKey="count" fill="#d97706" radius={[0,6,6,0]} name="Fragmentos" maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-900 leading-relaxed">
          <strong>Interpretación:</strong> Las notas con mayor densidad son las más ricas analíticamente. Priorice estas para la <em>descripción densa</em> (thick description de Geertz). Si los últimos documentos tienen menor densidad, puede indicar saturación etnográfica.
        </div>
      </div>

      {/* Archivo de Notas de Campo (desde Asesor Pedagógico) */}
      {fieldNotes && fieldNotes.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold text-amber-700 mb-4 flex items-center gap-2">
            <ImageIcon size={18}/> Archivo de Notas de Campo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fieldNotes.map(note => (
              <div key={note.id} className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                <p className="text-xs text-amber-900 italic flex-1 leading-relaxed">
                  "{note.content}"
                </p>
                {note.location && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium mt-1">
                    <MapPin size={10} /> {note.location}
                  </div>
                )}
                <div className="text-[9px] text-amber-600 opacity-60 text-right mt-1 font-medium">
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recuadros metodológicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '🌐', title: 'Descripción Densa', body: 'Geertz (1973): No describas sólo lo que ves, sino el significado cultural que le otorgan los actores. Usa los verbatims para construir espesor interpretativo.' },
          { icon: '🗂️', title: 'Análisis Taxonómico', body: 'Spradley (1979): Organiza los dominios en taxonomías (relaciones entre-medios). La barra de taxones informa cuántos términos folk componen cada dominio.' },
          { icon: '🧑‍🤝‍🧑', title: 'Posición del Investigador', body: 'Hammersley & Atkinson (1995): La reflexividad es esencial. Reporta tu posición en el campo y cómo afecta la producción de datos.' },
        ].map(item => (
          <div key={item.title} className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
            <div className="text-2xl mb-2">{item.icon}</div>
            <h4 className="font-bold text-sm text-amber-800 mb-2">{item.title}</h4>
            <p className="text-xs text-amber-700 leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
