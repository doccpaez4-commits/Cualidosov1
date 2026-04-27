'use client';

import { useState, useMemo } from 'react';
import type { Project, BreilhDomain } from '@/types';
import { db, addEncryptedMemo } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Box } from 'lucide-react';

interface Props {
  project: Project;
  selectedAnnotationId?: number;
}

const DIMENSIONS: { id: BreilhDomain; label: string; sublabel: string; color: string; questions: string[] }[] = [
  { 
    id: 'general', 
    label: 'Dimensión General (G)', 
    sublabel: 'Lógica del Sistema y Poder', 
    color: '#7c6af7',
    questions: [
      '¿De qué manera la lógica de acumulación de capital (ej. extractivismo, agroindustria) impone las condiciones de este problema en el territorio?',
      '¿Qué políticas, normas o regulaciones hegemónicas están determinando las condiciones generales de vida en este contexto?',
      '¿Cómo se expresa el metabolismo sociedad-naturaleza a gran escala (ej. cambio climático, deforestación) en este fenómeno?',
      '¿Qué estructuras de poder económico y político nacional o global están "subsumiendo" o condicionando las posibilidades de salud en esta zona?'
    ]
  },
  { 
    id: 'particular', 
    label: 'Dimensión Particular (P)', 
    sublabel: 'Modos de Vivir Colectivos', 
    color: '#14b8a6',
    questions: [
      '¿Cuáles son los patrones de trabajo y consumo típicos que caracterizan al grupo social, clase o género afectado?',
      '¿Qué formas de organización, soportes colectivos y relaciones de solidaridad existen (o faltan) en este grupo específico?',
      '¿Cómo influyen las inequidades de clase, género y etnia en la creación de patrones típicos de exposición y vulnerabilidad para este colectivo?',
      '¿Qué medios culturales, identitarios y formas de espiritualidad compartida definen la respuesta de este grupo ante los procesos malsanos?'
    ]
  },
  { 
    id: 'singular', 
    label: 'Dimensión Singular (I)', 
    sublabel: 'Estilos de Vida y Cuerpo', 
    color: '#fb7185',
    questions: [
      '¿Cómo se manifiesta el problema como una encarnación (embodiment) biológica (genotipo/fenotipo) o psíquica en la persona?',
      '¿Cuáles son los itinerarios cotidianos y estilos de vida personales/familiares que se ven afectados por las dimensiones superiores?',
      '¿De qué manera el individuo experimenta y percibe subjetivamente su bienestar, malestar o "espiritualidad en desesperanza"?',
      '¿Qué condiciones de infraestructura doméstica y metabolismo familiar directo están presentes en la vida diaria del sujeto?'
    ]
  },
];

const S_VIDA: { id: string; label: string; color: string; questions: string[] }[] = [
  {
    id: 'sustentabilidad',
    label: 'Sustentabilidad (SUS)',
    color: '#10b981',
    questions: [
      '¿Posee este proceso la capacidad de garantizar la vitalidad plena y reproducción de la vida humana y natural en el tiempo?',
      '¿Se evidencia una degradación o degeneración de los ecosistemas que ponga en riesgo la continuidad de la vida en este territorio?',
      '¿Es la base material de este modo de vida duradera o se caracteriza por la fugacidad y el agotamiento de recursos?',
      '¿Existen procesos de resiliencia y energía colectiva que permitan recuperar la vitalidad perdida frente a impactos externos?'
    ]
  },
  {
    id: 'soberania',
    label: 'Soberanía (SOB)',
    color: '#3b82f6',
    questions: [
      '¿Tienen los grupos sociales autonomía real para decidir sobre su sistema social, alimentación y formas de cuidado de la salud?',
      '¿Existe un control soberano sobre los recursos estratégicos indispensables (agua, tierra, semillas, tecnología) por parte del pueblo?',
      '¿La identidad y el sentido de vida del colectivo son respetados o están sometidos a una lógica colonial o mercantil externa?',
      '¿Cuentan los sujetos con la libertad y capacidad de planificación sobre sus propios itinerarios de vida y salud?'
    ]
  },
  {
    id: 'solidaridad',
    label: 'Solidaridad (SOL)',
    color: '#f59e0b',
    questions: [
      '¿Prevalece en este proceso una lógica de bien común y apoyo mutuo frente a la competencia y el individualismo?',
      '¿Existen mecanismos de justicia distributiva y empoderamiento democrático para los sectores menos favorecidos?',
      '¿Se fomenta la interculturalidad crítica y la comunicación democrática y veraz entre los distintos actores del territorio?',
      '¿Hay una ética de la vida que promueva la fraternidad y la unión en las relaciones sociales, de género y étnicas?'
    ]
  },
  {
    id: 'seguridad',
    label: 'Seguridad / Bioseguridad (SEG)',
    color: '#ef4444',
    questions: [
      '¿Viven los sujetos en entornos y paisajes saludables y bioseguros, libres de contaminantes y procesos destructivos?',
      '¿El metabolismo social actual genera encarnaciones fisiológicas y psicológicas de placer, energía vital y bienestar?',
      '¿Se aplican mecanismos de precaución y monitoreo participativo ante riesgos o incertidumbres científicas sobre la salud?',
      '¿Existe un acceso equitativo y oportuno a sistemas institucionales de protección que garanticen la integridad de la vida?'
    ]
  }
];

export default function BreilhMentor({ project, selectedAnnotationId }: Props) {
  const [activeTab, setActiveTab] = useState<'dimensions' | '4s'>('dimensions');
  const [memoContent, setMemoContent] = useState('');

  // Datos para conteo en tiempo real (Anotaciones para contar uso real)
  const codes = useLiveQuery(() => project?.id ? db.codes.where('projectId').equals(project.id).toArray() : Promise.resolve([]), [project?.id]);
  const categories = useLiveQuery(() => project?.id ? db.categories.where('projectId').equals(project.id).toArray() : Promise.resolve([]), [project?.id]);
  const annotations = useLiveQuery(() => project?.id ? db.annotations.where('projectId').equals(project.id).toArray() : Promise.resolve([]), [project?.id]);

  if (!project?.id) return null;

  // Fallback para proyectos nuevos sin datos
  const safeCodes = codes || [];
  const safeCategories = categories || [];
  const safeAnnotations = annotations || [];

  async function saveMemo() {
    if (!memoContent.trim()) return;
    await addEncryptedMemo({
      projectId: project.id!, annotationId: selectedAnnotationId,
      content: `[METACRÍTICA] ${memoContent.trim()}`,
      createdAt: new Date(), updatedAt: new Date(),
    });
    setMemoContent('');
  }

  // Mapear dominios y 4S a cada código (con useMemo para estabilidad)
  const codeMetaMap = useMemo(() => {
    const map = new Map<number, { domain: string; s: string }>();
    if (!codes || !categories) return map;
    codes.forEach(c => {
      const cat = categories.find(cat => cat.id === c.categoryId);
      map.set(c.id!, {
        domain: cat?.domain || 'none',
        s: c.sDeLaVida || 'none'
      });
    });
    return map;
  }, [codes, categories]);
  
  const domainCounts = useMemo(() => {
    const counts: Record<BreilhDomain, number> = { general: 0, particular: 0, singular: 0, none: 0 };
    if (!annotations) return counts;
    annotations.forEach(a => {
      const meta = codeMetaMap.get(a.codeId);
      if (meta) {
        const d = meta.domain as keyof typeof counts;
        if (counts[d] !== undefined) counts[d]++;
      }
    });
    return counts;
  }, [annotations, codeMetaMap]);

  const sCounts = useMemo(() => {
    const counts: Record<string, number> = { sustentabilidad: 0, soberania: 0, solidaridad: 0, seguridad: 0, none: 0 };
    if (!annotations) return counts;
    annotations.forEach(a => {
      const meta = codeMetaMap.get(a.codeId);
      if (meta && counts[meta.s] !== undefined) {
        counts[meta.s]++;
      }
    });
    return counts;
  }, [annotations, codeMetaMap]);

  const totalAnnotations = annotations?.length || 1;

  return (
    <div className="space-y-4">
      <div className="mentor-quote">
        "La determinación social de la salud no es la suma de factores de riesgo, sino el movimiento contradictorio de procesos en tres dominios de existencia."
        <div className="mt-1 text-right text-xs font-semibold" style={{ color: '#ef4444' }}>— Jaime Breilh, 2003</div>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <strong className="text-blue-800">💡 Análisis y Meta-Inferencia:</strong><br />
        Las transcripciones de entrevistas (relatos biográficos) suelen saturar el dominio <strong>Singular y Particular</strong>.<br /><br />
        <span className="text-blue-600">Para el dominio <strong>General</strong>, recurra a fuentes de datos estructurados, históricos o bibliográficos. Recuerde confrontar estos hallazgos con datos cuantitativos (perfil epidemiológico) para lograr una correcta meta-inferencia cuali-cuanti.</span>
      </div>

      {/* Tabs de herramientas */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        <button 
          onClick={() => setActiveTab('dimensions')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'dimensions' ? 'border-b-2 border-accent text-accent' : 'text-slate-400'}`}
          style={{ borderColor: activeTab === 'dimensions' ? 'var(--accent)' : 'transparent', color: activeTab === 'dimensions' ? 'var(--accent)' : '' }}
        >
          Dimensiones G-P-I
        </button>
        <button 
          onClick={() => setActiveTab('4s')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === '4s' ? 'border-b-2 border-accent text-accent' : 'text-slate-400'}`}
          style={{ borderColor: activeTab === '4s' ? 'var(--accent)' : 'transparent', color: activeTab === '4s' ? 'var(--accent)' : '' }}
        >
          Las 4 "S"
        </button>
      </div>

      <div className="space-y-4 pt-2">
        {activeTab === 'dimensions' ? (
          <>
            <p className="text-[10px] text-slate-400 italic">Estas preguntas ayudan a ubicar si el fenómeno pertenece a la lógica del sistema, a los modos de vivir de los grupos o a la vida singular de los sujetos.</p>
            {DIMENSIONS.map(dim => (
              <div key={dim.id} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold" style={{ color: dim.color }}>{dim.label}</span>
                  <span className="text-[10px] font-bold opacity-60">{(domainCounts[dim.id] || 0)} hallazgos</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-slate-100">
                  <div className="h-full transition-all duration-500" style={{ width: `${((domainCounts[dim.id] || 0) / totalAnnotations) * 100}%`, background: dim.color }} />
                </div>
                <div className="space-y-1.5 pl-2 border-l-2" style={{ borderColor: `${dim.color}40` }}>
                  {dim.questions.map((q, i) => (
                    <div key={i} className="text-[10px] leading-relaxed text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            <p className="text-[10px] text-slate-400 italic">Estas preguntas permiten evaluar si los procesos son saludables/protectores o malsanos/destructivos según los pilares del Sumak Kawsay o Bien Vivir.</p>
            {S_VIDA.map(s => (
              <div key={s.id} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.label}</span>
                  <span className="text-[10px] font-bold opacity-60">{(sCounts[s.id as keyof typeof sCounts] || 0)} hallazgos</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-slate-100">
                  <div className="h-full transition-all duration-500" style={{ width: `${((sCounts[s.id as keyof typeof sCounts] || 0) / totalAnnotations) * 100}%`, background: s.color }} />
                </div>
                <div className="space-y-1.5 pl-2 border-l-2" style={{ borderColor: `${s.color}40` }}>
                  {s.questions.map((q, i) => (
                    <div key={i} className="text-[10px] leading-relaxed text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Editor de Meta-Inferencia */}
      <div className="mentor-tool mt-4">
        <div className="mentor-tool-title">Meta-Inferencia / Análisis</div>
        <textarea className="input text-xs" rows={4}
          placeholder="Describe la relación entre dominios o procesos críticos aquí..."
          value={memoContent} onChange={e => setMemoContent(e.target.value)} />
        <button className="btn btn-primary w-full mt-2 text-xs" onClick={saveMemo}>
          <Plus size={13}/> Guardar Hallazgo
        </button>
      </div>
    </div>
  );
}
