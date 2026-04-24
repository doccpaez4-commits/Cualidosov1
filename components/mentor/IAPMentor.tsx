'use client';

import { useState } from 'react';
import type { Project, IAPCycle } from '@/types';
import { db, addEncryptedMemo } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, RefreshCw, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  project: Project;
  selectedAnnotationId?: number;
}

const FALSBORDA_PROMPTS = [
  '¿Quiénes son los actores clave de este proceso? ¿Cuál es su rol?',
  '¿Qué acción colectiva emerge de este fragmento?',
  '¿Cómo se articula este conocimiento con el saber popular del territorio?',
  '¿Qué poder-saber están ejerciendo los participantes en esta situación?',
  '¿Qué transformación concreta propone este ciclo de reflexión?',
];

const PHASES = [
  { id: 'planning' as const, label: 'Planificación', color: '#10b981' },
  { id: 'action' as const, label: 'Acción', color: '#34d399' },
  { id: 'reflection' as const, label: 'Reflexión', color: '#6ee7b7' },
];

export default function IAPMentor({ project, selectedAnnotationId }: Props) {
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [cyclePhase, setCyclePhase] = useState<IAPCycle['phase']>('planning');
  const [cycleActors, setCycleActors] = useState('');
  const [cycleReflection, setCycleReflection] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);

  const cycles = useLiveQuery(
    () => db.iapCycles.where('projectId').equals(project.id!).toArray(),
    [project.id]
  );

  async function saveCycle() {
    if (!cycleName.trim() || !cycleReflection.trim()) return;
    await db.iapCycles.add({
      projectId: project.id!, name: cycleName.trim(), phase: cyclePhase,
      actors: cycleActors.split(',').map(a => a.trim()).filter(Boolean),
      reflection: cycleReflection.trim(), createdAt: new Date(),
    });
    setCycleName(''); setCycleActors(''); setCycleReflection('');
    setShowNewCycle(false);
  }

  async function saveMemo() {
    if (!memoContent.trim()) return;
    await addEncryptedMemo({
      projectId: project.id!, annotationId: selectedAnnotationId,
      content: memoContent.trim(), createdAt: new Date(), updatedAt: new Date(),
    });
    setMemoContent('');
  }

  return (
    <div className="space-y-4">
      <div className="mentor-quote">
        "La ciencia popular o el saber de las bases es tan válido como el conocimiento académico. La investigación debe ser para la acción transformadora."
        <div className="mt-1 text-right text-xs font-semibold" style={{ color: '#10b981' }}>— Orlando Fals Borda</div>
      </div>

      {/* Preguntas */}
      <div>
        <div className="mentor-tool-title">Preguntas IAP</div>
        <div className="space-y-2">
          {FALSBORDA_PROMPTS.map((p, i) => (
            <div key={i} className="text-xs p-2.5 rounded-lg leading-relaxed"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--text-secondary)' }}>
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Ciclos */}
      <div className="mentor-tool">
        <div className="flex items-center justify-between">
          <div className="mentor-tool-title flex items-center gap-1" style={{ color: '#10b981' }}>
            <RefreshCw size={11}/> Ciclos Acción-Reflexión
          </div>
          <button className="btn-icon" onClick={() => setShowNewCycle(!showNewCycle)}>
            <Plus size={14}/>
          </button>
        </div>

        {showNewCycle && (
          <div className="space-y-2 mt-2 animate-fade-in">
            <input className="input text-xs" placeholder="Nombre del ciclo (ej. Ciclo 1 - Diagnóstico)..."
              value={cycleName} onChange={e => setCycleName(e.target.value)} />
            <div className="grid grid-cols-3 gap-1">
              {PHASES.map(ph => (
                <button key={ph.id} onClick={() => setCyclePhase(ph.id)}
                  className="text-xs p-1.5 rounded-lg transition-all"
                  style={{
                    background: cyclePhase === ph.id ? `${ph.color}20` : 'var(--bg-primary)',
                    border: `1px solid ${cyclePhase === ph.id ? ph.color : 'var(--border)'}`,
                    color: cyclePhase === ph.id ? ph.color : 'var(--text-secondary)',
                  }}>
                  {ph.label}
                </button>
              ))}
            </div>
            <input className="input text-xs" placeholder="Actores (separados por comas)..."
              value={cycleActors} onChange={e => setCycleActors(e.target.value)} />
            <textarea className="input text-xs" rows={3}
              placeholder="¿Qué reflexión/acción emergió de este ciclo?"
              value={cycleReflection} onChange={e => setCycleReflection(e.target.value)} />
            <button className="btn w-full text-xs"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
              onClick={saveCycle}>
              Guardar Ciclo
            </button>
          </div>
        )}

        {/* Lista de ciclos */}
        {cycles && cycles.length > 0 && (
          <div className="mt-2 space-y-2">
            {cycles.map(cycle => {
              const ph = PHASES.find(p => p.id === cycle.phase);
              return (
                <div key={cycle.id} className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${ph?.color}30` }}>
                  <button className="w-full flex items-center justify-between p-2 text-xs"
                    style={{ background: `${ph?.color}10`, color: ph?.color }}
                    onClick={() => setExpandedCycle(expandedCycle === cycle.id ? null : cycle.id!)}>
                    <span className="font-semibold">{cycle.name}</span>
                    <span className="flex items-center gap-1">
                      <span style={{ opacity: 0.7 }}>{ph?.label}</span>
                      {expandedCycle === cycle.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                    </span>
                  </button>
                  {expandedCycle === cycle.id && (
                    <div className="p-2 text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      {cycle.actors.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users size={10}/> {cycle.actors.join(', ')}
                        </div>
                      )}
                      <p>{cycle.reflection}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Memo */}
      <div className="mentor-tool">
        <div className="mentor-tool-title">Sistematización</div>
        <textarea className="input text-xs" rows={3}
          placeholder="Sistematiza la acción colectiva de este fragmento..."
          value={memoContent} onChange={e => setMemoContent(e.target.value)} />
        <button className="btn btn-primary w-full mt-2 text-xs" onClick={saveMemo}>
          <Plus size={13}/> Guardar Memo
        </button>
      </div>
    </div>
  );
}
