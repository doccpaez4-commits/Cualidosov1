'use client';

import { useState } from 'react';
import type { Project } from '@/types';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Camera, MapPin } from 'lucide-react';

interface Props {
  project: Project;
  selectedAnnotationId?: number;
}

const GEERTZ_PROMPTS = [
  '¿Qué está haciendo el actor? ¿Cuál es el significado local de esta acción?',
  '¿Cómo interpretan los propios actores este evento o práctica?',
  '¿Qué contradicciones o tensiones culturales observas en este fragmento?',
  '¿Qué elementos de "descripción densa" (contexto, intención, significado) puedes añadir?',
  '¿Qué te dice esta imagen sobre los modos de vida del grupo?',
];

export default function EthnoMentor({ project, selectedAnnotationId }: Props) {
  const [noteContent, setNoteContent] = useState('');
  const [noteLocation, setNoteLocation] = useState('');
  const [memoContent, setMemoContent] = useState('');

  const fieldNotes = useLiveQuery(
    () => db.fieldNotes.where('projectId').equals(project.id!).reverse().limit(5).toArray(),
    [project.id]
  );

  async function saveFieldNote() {
    if (!noteContent.trim()) return;
    await db.fieldNotes.add({
      projectId: project.id!, content: noteContent.trim(),
      location: noteLocation.trim() || undefined, createdAt: new Date(),
    });
    setNoteContent(''); setNoteLocation('');
  }

  async function saveMemo() {
    if (!memoContent.trim()) return;
    await db.memos.add({
      projectId: project.id!, annotationId: selectedAnnotationId,
      content: memoContent.trim(), createdAt: new Date(), updatedAt: new Date(),
    });
    setMemoContent('');
  }

  return (
    <div className="space-y-4">
      <div className="mentor-quote">
        "La descripción densa no es una mera fotografía de los hechos, sino su interpretación en capas de significado cultural."
        <div className="mt-1 text-right text-xs font-semibold" style={{ color: '#f59e0b' }}>— Clifford Geertz, 1973</div>
      </div>

      {/* Preguntas */}
      <div>
        <div className="mentor-tool-title">Preguntas de descripción densa</div>
        <div className="space-y-2">
          {GEERTZ_PROMPTS.map((p, i) => (
            <div key={i} className="text-xs p-2.5 rounded-lg leading-relaxed"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--text-secondary)' }}>
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Nota de campo */}
      <div className="mentor-tool">
        <div className="mentor-tool-title flex items-center gap-1" style={{ color: '#f59e0b' }}>
          <Camera size={11}/> Nota de Campo
        </div>
        <input className="input text-xs mb-2" placeholder="Lugar / Contexto..."
          value={noteLocation} onChange={e => setNoteLocation(e.target.value)} />
        <textarea className="input text-xs" rows={4}
          placeholder="Describe lo observado con la mayor densidad descriptiva posible..."
          value={noteContent} onChange={e => setNoteContent(e.target.value)} />
        <button className="btn w-full mt-2 text-xs"
          style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
          onClick={saveFieldNote}>
          <Plus size={13}/> Guardar Nota de Campo
        </button>
      </div>

      {/* Notas recientes */}
      {fieldNotes && fieldNotes.length > 0 && (
        <div>
          <div className="mentor-tool-title">Notas recientes</div>
          <div className="space-y-2">
            {fieldNotes.map(note => (
              <div key={note.id} className="mentor-tool text-xs" style={{ borderLeft: '2px solid #f59e0b' }}>
                {note.location && (
                  <div className="flex items-center gap-1 mb-1" style={{ color: '#f59e0b' }}>
                    <MapPin size={10}/> <span>{note.location}</span>
                  </div>
                )}
                <p style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
                <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                  {new Date(note.createdAt).toLocaleDateString('es-CO')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memo */}
      <div className="mentor-tool">
        <div className="mentor-tool-title">Memo Etnográfico</div>
        <textarea className="input text-xs" rows={3}
          placeholder="Interpretación cultural de este fragmento..."
          value={memoContent} onChange={e => setMemoContent(e.target.value)} />
        <button className="btn btn-primary w-full mt-2 text-xs" onClick={saveMemo}>
          <Plus size={13}/> Guardar Memo
        </button>
      </div>
    </div>
  );
}
