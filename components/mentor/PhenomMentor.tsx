'use client';

import { useState } from 'react';
import type { Project } from '@/types';
import { db, addEncryptedMemo } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, BookOpen } from 'lucide-react';

interface Props {
  project: Project;
  selectedAnnotationId?: number;
}

const HUSSERL_PROMPTS = [
  '¿Cuál es la experiencia vivida esencial que relata el participante?',
  '¿Qué unidades de significado emergen de este fragmento?',
  '¿Qué presupuestos propios debo suspender para escuchar el fenómeno? (Epojé)',
  '¿Cuáles son los invariantes estructurales de esta experiencia?',
  '¿Cómo describe el participante la temporalidad de su experiencia?',
];

export default function PhenomMentor({ project, selectedAnnotationId }: Props) {
  const [epojeContent, setEpojeContent] = useState('');
  const [memoContent, setMemoContent] = useState('');

  const epojeEntries = useLiveQuery(
    () => db.epojeEntries.where('projectId').equals(project.id!).reverse().limit(5).toArray(),
    [project.id]
  );

  async function saveEpoje() {
    if (!epojeContent.trim()) return;
    await db.epojeEntries.add({ projectId: project.id!, content: epojeContent.trim(), createdAt: new Date() });
    setEpojeContent('');
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
        "Volver a las cosas mismas — dejar que el fenómeno se muestre desde sí mismo, sin presupuestos teóricos."
        <div className="mt-1 text-right text-xs font-semibold" style={{ color: '#14b8a6' }}>— Edmund Husserl</div>
      </div>

      {/* Preguntas fenomenológicas */}
      <div>
        <div className="mentor-tool-title">Preguntas orientadoras</div>
        <div className="space-y-2">
          {HUSSERL_PROMPTS.map((p, i) => (
            <div key={i} className="text-xs p-2.5 rounded-lg leading-relaxed"
              style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--text-secondary)' }}>
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Diario de Epojé */}
      <div className="mentor-tool">
        <div className="mentor-tool-title flex items-center gap-1" style={{ color: '#14b8a6' }}>
          <BookOpen size={11}/> Diario de Epojé (Reducción Fenomenológica)
        </div>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          Registra los presupuestos y prejuicios que suspendes antes del análisis.
        </p>
        <textarea className="input text-xs" rows={4}
          placeholder="Hoy suspendo el supuesto de que... / Noto en mí la tendencia a..."
          value={epojeContent} onChange={e => setEpojeContent(e.target.value)} />
        <button className="btn w-full mt-2 text-xs" style={{ background: 'rgba(20,184,166,0.2)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.3)' }}
          onClick={saveEpoje}>
          <Plus size={13}/> Registrar en Epojé
        </button>
      </div>

      {/* Entradas de Epojé */}
      {epojeEntries && epojeEntries.length > 0 && (
        <div>
          <div className="mentor-tool-title">Entradas recientes de Epojé</div>
          <div className="space-y-2">
            {epojeEntries.map(entry => (
              <div key={entry.id} className="mentor-tool text-xs" style={{ borderLeft: '2px solid #14b8a6' }}>
                <p style={{ color: 'var(--text-secondary)' }}>{entry.content}</p>
                <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                  {new Date(entry.createdAt).toLocaleDateString('es-CO')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memo de unidad de significado */}
      <div className="mentor-tool">
        <div className="mentor-tool-title">Unidad de Significado</div>
        <textarea className="input text-xs" rows={3}
          placeholder="Describe la esencia de esta experiencia vivida..."
          value={memoContent} onChange={e => setMemoContent(e.target.value)} />
        <button className="btn btn-primary w-full mt-2 text-xs" onClick={saveMemo}>
          <Plus size={13}/> Guardar Memo
        </button>
      </div>
    </div>
  );
}
