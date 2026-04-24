'use client';

import { useState } from 'react';
import type { Project } from '@/types';
import { db, addEncryptedMemo } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { MessageSquare, ChevronDown, ChevronUp, Plus } from 'lucide-react';

interface Props {
  project: Project;
  selectedAnnotationId?: number;
}

const CHARMAZ_PROMPTS = [
  { phase: 'Abierta', prompt: '¿Qué está pasando aquí? ¿Qué proceso observas?', color: '#7c6af7' },
  { phase: 'Abierta', prompt: '¿Qué está haciendo el participante? ¿Qué supone esto para él/ella?', color: '#7c6af7' },
  { phase: 'Axial',   prompt: '¿En qué condiciones ocurre este proceso? ¿Qué consecuencias tiene?', color: '#a78bfa' },
  { phase: 'Axial',   prompt: '¿Cómo se relaciona este código con los demás? ¿Qué categoría emerge?', color: '#a78bfa' },
  { phase: 'Selectiva', prompt: '¿Cuál es el proceso social básico que conecta todas tus categorías?', color: '#c4b5fd' },
  { phase: 'Selectiva', prompt: '¿Qué teoría sustentan tus datos? ¿Cuál es la categoría central?', color: '#c4b5fd' },
];

const PHASE_COLORS: Record<string, string> = {
  open: '#7c6af7', axial: '#a78bfa', selective: '#c4b5fd',
};

export default function GroundedMentor({ project, selectedAnnotationId }: Props) {
  const [activePhase, setActivePhase] = useState<'open' | 'axial' | 'selective'>('open');
  const [memoContent, setMemoContent] = useState('');
  const [showAllPrompts, setShowAllPrompts] = useState(false);

  const codes = useLiveQuery(
    () => db.codes.where('projectId').equals(project.id!).toArray(),
    [project.id]
  );

  const memos = useLiveQuery(
    () => db.memos.where('projectId').equals(project.id!).reverse().limit(5).toArray(),
    [project.id]
  );

  async function saveMemo() {
    if (!memoContent.trim()) return;
    await addEncryptedMemo({
      projectId: project.id!,
      annotationId: selectedAnnotationId,
      content: memoContent.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setMemoContent('');
  }

  const phasePrompts = CHARMAZ_PROMPTS.filter(p =>
    (activePhase === 'open' && p.phase === 'Abierta') ||
    (activePhase === 'axial' && p.phase === 'Axial') ||
    (activePhase === 'selective' && p.phase === 'Selectiva')
  );

  // Conteo por fase
  const openCount = codes?.filter(c => c.groundedPhase === 'open').length ?? 0;
  const axialCount = codes?.filter(c => c.groundedPhase === 'axial').length ?? 0;
  const selectiveCount = codes?.filter(c => c.groundedPhase === 'selective').length ?? 0;

  return (
    <div className="space-y-4">
      {/* Cita de Charmaz */}
      <div className="mentor-quote">
        "Usa el análisis comparativo constante: compara incidente con incidente, dato con dato, código con código."
        <div className="mt-1 text-right text-xs font-semibold" style={{ color: '#7c6af7' }}>
          — Kathy Charmaz, 2006
        </div>
      </div>

      {/* Selector de fase */}
      <div>
        <div className="mentor-tool-title">Fase de codificación</div>
        <div className="grid grid-cols-3 gap-1">
          {(['open', 'axial', 'selective'] as const).map(phase => {
            const labels = { open: 'Abierta', axial: 'Axial', selective: 'Selectiva' };
            const counts = { open: openCount, axial: axialCount, selective: selectiveCount };
            return (
              <button
                key={phase}
                onClick={() => setActivePhase(phase)}
                className="flex flex-col items-center p-2 rounded-lg text-xs transition-all"
                style={{
                  background: activePhase === phase ? `${PHASE_COLORS[phase]}20` : 'var(--bg-primary)',
                  border: `1px solid ${activePhase === phase ? PHASE_COLORS[phase] : 'var(--border)'}`,
                  color: activePhase === phase ? PHASE_COLORS[phase] : 'var(--text-secondary)',
                }}
              >
                <span className="font-semibold text-lg">{counts[phase]}</span>
                <span>{labels[phase]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompts de Charmaz */}
      <div>
        <div className="mentor-tool-title">Preguntas de Charmaz</div>
        <div className="space-y-2">
          {phasePrompts.slice(0, showAllPrompts ? undefined : 2).map((p, i) => (
            <div
              key={i}
              className="text-xs p-2.5 rounded-lg leading-relaxed"
              style={{ background: `${p.color}10`, border: `1px solid ${p.color}30`, color: 'var(--text-secondary)' }}
            >
              {p.prompt}
            </div>
          ))}
          <button
            className="text-xs flex items-center gap-1 mt-1"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setShowAllPrompts(!showAllPrompts)}
          >
            {showAllPrompts ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            {showAllPrompts ? 'Mostrar menos' : 'Ver más preguntas'}
          </button>
        </div>
      </div>

      {/* Memo teórico */}
      <div className="mentor-tool">
        <div className="mentor-tool-title flex items-center gap-1">
          <MessageSquare size={11}/> Memo Teórico
          {selectedAnnotationId && (
            <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(124,106,247,0.2)', color: '#7c6af7' }}>
              vinculado
            </span>
          )}
        </div>
        <textarea
          className="input text-xs"
          rows={4}
          placeholder="Escribe reflexiones teóricas sobre los datos seleccionados..."
          value={memoContent}
          onChange={e => setMemoContent(e.target.value)}
        />
        <button className="btn btn-primary w-full mt-2 text-xs" onClick={saveMemo}>
          <Plus size={13}/> Guardar Memo
        </button>
      </div>

      {/* Memos recientes */}
      {memos && memos.length > 0 && (
        <div>
          <div className="mentor-tool-title">Memos recientes</div>
          <div className="space-y-2">
            {memos.map(memo => (
              <div key={memo.id} className="mentor-tool text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p className="leading-relaxed">{memo.content}</p>
                <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                  {new Date(memo.createdAt).toLocaleDateString('es-CO')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
