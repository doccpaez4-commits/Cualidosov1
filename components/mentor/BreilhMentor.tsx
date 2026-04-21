'use client';

import { useState } from 'react';
import type { Project, BreilhDomain } from '@/types';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Box } from 'lucide-react';

interface Props {
  project: Project;
  selectedAnnotationId?: number;
}

const BREILH_PROMPTS = [
  '¿Este proceso está determinado por estructuras sociales generales (Estado, economía, clase)?',
  '¿Cómo se expresa este fenómeno en el modo de vida del grupo (trabajo, consumo, reproducción)?',
  '¿Cuál es el fenotipo individual observable? ¿Proceso protector o destructivo?',
  '¿Qué contradicciones entre los dominios observas en este verbatim?',
  '¿Qué inequidades de clase, género o etnia atraviesan este proceso?',
];

const DOMAINS: { id: BreilhDomain; label: string; sublabel: string; color: string }[] = [
  { id: 'general',    label: 'General',    sublabel: 'Sociedad / Estado / Economía',     color: '#7c6af7' },
  { id: 'particular', label: 'Particular', sublabel: 'Modos de vida / Grupo / Trabajo',   color: '#14b8a6' },
  { id: 'singular',   label: 'Singular',   sublabel: 'Individuo / Fenotipo / Genótipo',   color: '#fb7185' },
];

export default function BreilhMentor({ project, selectedAnnotationId }: Props) {
  const [memoContent, setMemoContent] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<BreilhDomain>('general');

  const codes = useLiveQuery(
    () => db.codes.where('projectId').equals(project.id!).toArray(),
    [project.id]
  );

  async function saveMemo() {
    if (!memoContent.trim()) return;
    await db.memos.add({
      projectId: project.id!, annotationId: selectedAnnotationId,
      content: `[${selectedDomain.toUpperCase()}] ${memoContent.trim()}`,
      createdAt: new Date(), updatedAt: new Date(),
    });
    setMemoContent('');
  }

  // Conteos por dominio
  const domainCounts = {
    general:    codes?.filter(c => c.domain === 'general').length ?? 0,
    particular: codes?.filter(c => c.domain === 'particular').length ?? 0,
    singular:   codes?.filter(c => c.domain === 'singular').length ?? 0,
  };
  const totalCodes = (domainCounts.general + domainCounts.particular + domainCounts.singular) || 1;

  return (
    <div className="space-y-4">
      <div className="mentor-quote">
        "La determinación social de la salud no es la suma de factores de riesgo, sino el movimiento contradictorio de procesos en tres dominios de existencia."
        <div className="mt-1 text-right text-xs font-semibold" style={{ color: '#ef4444' }}>— Jaime Breilh, 2003</div>
      </div>

      {/* Matriz de Triple Determinación */}
      <div>
        <div className="mentor-tool-title flex items-center gap-1">
          <Box size={11}/> Matriz de Triple Determinación
        </div>
        <div className="space-y-2">
          {DOMAINS.map(domain => {
            const count = domainCounts[domain.id];
            const pct = Math.round((count / totalCodes) * 100);
            return (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain.id)}
                className="w-full text-left rounded-lg p-3 transition-all"
                style={{
                  background: selectedDomain === domain.id ? `${domain.color}15` : 'var(--bg-primary)',
                  border: `1px solid ${selectedDomain === domain.id ? domain.color : 'var(--border)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: domain.color }}>{domain.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count} códigos</span>
                </div>
                <span className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>{domain.sublabel}</span>
                {/* Barra de proporción */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: domain.color }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preguntas de Breilh */}
      <div>
        <div className="mentor-tool-title">Preguntas orientadoras</div>
        <div className="space-y-2">
          {BREILH_PROMPTS.map((p, i) => (
            <div key={i} className="text-xs p-2.5 rounded-lg leading-relaxed"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--text-secondary)' }}>
              {p}
            </div>
          ))}
        </div>
      </div>

      {/* Procesos protectores/destructivos */}
      <div className="mentor-tool">
        <div className="mentor-tool-title">Clasificar proceso</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {['Protector', 'Destructivo'].map(tipo => (
            <div key={tipo} className="text-center text-xs p-2 rounded-lg"
              style={{
                background: tipo === 'Protector' ? 'rgba(20,184,166,0.1)' : 'rgba(251,113,133,0.1)',
                border: `1px solid ${tipo === 'Protector' ? 'rgba(20,184,166,0.3)' : 'rgba(251,113,133,0.3)'}`,
                color: tipo === 'Protector' ? '#14b8a6' : '#fb7185',
              }}>
              {tipo === 'Protector' ? '🟢' : '🔴'} {tipo}
            </div>
          ))}
        </div>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          Dominio activo: <span style={{ color: DOMAINS.find(d => d.id === selectedDomain)?.color }}>
            {DOMAINS.find(d => d.id === selectedDomain)?.label}
          </span>
        </p>
        <textarea className="input text-xs" rows={3}
          placeholder="Describe el proceso determinante en este dominio..."
          value={memoContent} onChange={e => setMemoContent(e.target.value)} />
        <button className="btn btn-primary w-full mt-2 text-xs" onClick={saveMemo}>
          <Plus size={13}/> Guardar Análisis
        </button>
      </div>
    </div>
  );
}
