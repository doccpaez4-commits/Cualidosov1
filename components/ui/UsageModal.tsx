'use client';

import { useState, useEffect } from 'react';
import { X, Users, Building2, Clock, ChevronRight, BarChart2 } from 'lucide-react';

interface UsageData {
  institution: string;
  role: string;
  country: string;
  frequency: string;
  purpose: string;
  registeredAt: string;
}

const ROLES = [
  'Estudiante de pregrado', 'Estudiante de posgrado', 'Docente / Investigador',
  'Profesional en campo', 'Asesor / Consultor', 'Otro',
];

const FREQUENCIES = [
  'Primera vez', '1-2 veces al mes', 'Semanalmente',
  'Varias veces por semana', 'Diariamente',
];

const PURPOSES = [
  'Tesis / Trabajo de grado', 'Investigación institucional', 'Docencia',
  'Proyecto comunitario', 'Práctica / Aprendizaje', 'Otro',
];

export default function UsageModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    institution: '',
    role: '',
    country: '',
    frequency: '',
    purpose: '',
  });
  const [step, setStep] = useState(1);

  function handleSubmit() {
    const data: UsageData = {
      ...form,
      registeredAt: new Date().toISOString(),
    };
    // Save to localStorage (privacy-first: no server)
    const existing: UsageData[] = JSON.parse(
      localStorage.getItem('cualidoso_usage_logs') || '[]'
    );
    existing.push(data);
    localStorage.setItem('cualidoso_usage_logs', JSON.stringify(existing));
    localStorage.setItem('cualidoso_usage_registered', 'true');
    onClose();
  }

  function skip() {
    localStorage.setItem('cualidoso_usage_skip_count',
      String(parseInt(localStorage.getItem('cualidoso_usage_skip_count') || '0') + 1)
    );
    onClose();
  }

  const isStep1Complete = form.role && form.country;
  const isStep2Complete = form.frequency && form.purpose;

  return (
    <div className="modal-backdrop" onClick={skip}>
      <div
        className="modal"
        style={{ maxWidth: '480px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              <BarChart2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                ¿Nos ayudas a medir el impacto?
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Solo 1 minuto · Datos guardados localmente
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={skip}>
            <X size={16} />
          </button>
        </div>

        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Cualidoso es un proyecto de <strong>código abierto</strong> para la soberanía sanitaria.
          Comparte tus datos de uso para que podamos documentar el <strong>impacto social</strong> y
          seguir mejorando la herramienta. Los datos <em>no salen de tu dispositivo</em>.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'text-white' : step > s ? 'text-white' : 'text-gray-400'
              }`}
                style={{
                  background: step === s ? 'var(--accent)' : step > s ? '#22c55e' : 'var(--bg-secondary)',
                  border: step <= s ? '1px solid var(--border)' : 'none',
                }}>
                {s}
              </div>
              {s < 2 && <div className="w-8 h-px" style={{ background: 'var(--border)' }} />}
            </div>
          ))}
          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
            Paso {step} de 2
          </span>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {/* Role */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                <Users size={12} className="inline mr-1" /> Tu Rol
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map(r => (
                  <button key={r}
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                    className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.role === r ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: form.role === r ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${form.role === r ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Institution */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                <Building2 size={12} className="inline mr-1" /> Institución (opcional)
              </label>
              <input
                className="input w-full text-sm"
                placeholder="Universidad, ONG, Hospital..."
                value={form.institution}
                onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                País
              </label>
              <input
                className="input w-full text-sm"
                placeholder="Colombia, México, Ecuador..."
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Frequency */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                <Clock size={12} className="inline mr-1" /> ¿Con qué frecuencia usas Cualidoso?
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {FREQUENCIES.map(f => (
                  <button key={f}
                    onClick={() => setForm(fm => ({ ...fm, frequency: f }))}
                    className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.frequency === f ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: form.frequency === f ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${form.frequency === f ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                ¿Para qué lo usas principalmente?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PURPOSES.map(p => (
                  <button key={p}
                    onClick={() => setForm(fm => ({ ...fm, purpose: p }))}
                    className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.purpose === p ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: form.purpose === p ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${form.purpose === p ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost text-xs" onClick={skip}>
            Omitir por ahora
          </button>
          {step === 1 ? (
            <button
              className="btn btn-primary text-xs"
              onClick={() => setStep(2)}
              disabled={!isStep1Complete}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          ) : (
            <button
              className="btn btn-primary text-xs"
              onClick={handleSubmit}
              disabled={!isStep2Complete}
            >
              Guardar y cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
