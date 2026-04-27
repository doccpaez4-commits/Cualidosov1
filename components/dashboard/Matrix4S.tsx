'use client';

import { useMemo, useRef } from 'react';
import type { VerbatimResult, BreilhDomain } from '@/types';
import { ShieldCheck, AlertTriangle, Download, FileText } from 'lucide-react';

interface Matrix4SProps {
  verbatims: VerbatimResult[];
}

const DOMAINS: Array<{ id: BreilhDomain; label: string; bg: string; headerBg: string }> = [
  { id: 'general',    label: 'General — Estructural',      bg: '#fdf4ff', headerBg: '#7e22ce' },
  { id: 'particular', label: 'Particular — Grupal/Familiar', bg: '#eff6ff', headerBg: '#1d4ed8' },
  { id: 'singular', label: 'Individual — Singular',      bg: '#f0fdf4', headerBg: '#166534' },
];

const SS_VIDA = [
  { id: 'soberania', label: 'Soberanía' },
  { id: 'sustentabilidad', label: 'Sustentabilidad' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'solidaridad', label: 'Solidaridad' },
];

export default function Matrix4S({ verbatims }: Matrix4SProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const matrix = useMemo(() => {
    // 3 rows (domains) x 4 cols (S de la vida)
    // cell = { count, categories: { [catName]: { codes: Code[] } } }
    
    type CellData = {
      count: number;
      categories: Record<string, { codes: { name: string; type?: string; color?: string; count: number }[] }>;
    };

    const grid: Record<string, Record<string, CellData>> = {};
    
    DOMAINS.forEach(d => {
      grid[d.id] = {};
      SS_VIDA.forEach(s => {
        grid[d.id][s.id] = { count: 0, categories: {} };
      });
    });

    verbatims.forEach(v => {
      const d = v.domain;
      const s = v.sDeLaVida;
      
      // Solo graficamos los que tienen una dimensión válida y una S válida
      if (d && d !== 'none' && s && s !== 'none' && grid[d] && grid[d][s]) {
        const cell = grid[d][s];
        cell.count += 1;
        
        const catName = v.categoryName || 'Sin Categoría';
        if (!cell.categories[catName]) {
          cell.categories[catName] = { codes: [] };
        }
        
        const codesList = cell.categories[catName].codes;
        let codeEntry = codesList.find(c => c.name === v.codeName);
        if (!codeEntry) {
          codeEntry = { name: v.codeName, type: v.breilhType, color: v.codeColor, count: 0 };
          codesList.push(codeEntry);
        }
        codeEntry.count += 1;
      }
    });

    return grid;
  }, [verbatims]);

  // Summary counts
  const totalProtectors = verbatims.filter(v => v.breilhType === 'protector').length;
  const totalDestructive = verbatims.filter(v => v.breilhType === 'malsano').length;
  const validEvidences = verbatims.filter(v => v.domain && v.domain !== 'none' && v.sDeLaVida && v.sDeLaVida !== 'none').length;

  async function exportPDF() {
    if (!printRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff', logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    let imgW = pdfW - 20;
    let imgH = imgW / ratio;
    if (imgH > pdfH - 20) {
      imgH = pdfH - 20;
      imgW = imgH * ratio;
    }
    const x = (pdfW - imgW) / 2;
    const y = 10;
    pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);
    pdf.save('matriz_4s_breilh.pdf');
  }

  function exportPNG() {
    if (!printRef.current) return;
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(printRef.current!, { scale: 2, backgroundColor: '#ffffff', logging: false }).then(canvas => {
        const a = document.createElement('a');
        a.download = 'matriz_4s.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
      });
    });
  }

  return (
    <div className="w-full h-full overflow-auto">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 no-print">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Matriz de Procesos Críticos — 4 S de la Vida
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {totalProtectors} procesos protectores · {totalDestructive} procesos malsanos · {validEvidences} evidencias mapeadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPNG} className="btn btn-ghost text-xs" title="Exportar como PNG">
            <Download size={14} /> PNG
          </button>
          <button onClick={exportPDF} className="btn btn-primary text-xs" title="Exportar como PDF">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="bg-white rounded-xl shadow-md border p-8" style={{ borderColor: 'var(--border)', minWidth: 1000 }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-10 rounded-full bg-accent" style={{ backgroundColor: 'var(--accent)' }} />
            <div>
              <h3 className="text-2xl font-black text-accent uppercase tracking-tight" style={{ color: 'var(--accent)' }}>
                Matriz de las 4 S de la Vida
              </h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Epidemiología Crítica · Jaime Breilh · Determinación Social de la Salud
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 max-w-3xl pl-5">
            Análisis de la determinación social de la salud cruzando las <strong>Dimensiones de Vida</strong> (General, Particular, Individual) 
            con las <strong>4 S de la Vida</strong> (Soberanía, Sustentabilidad, Seguridad, Solidaridad).
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex gap-3 mb-6 pl-5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
            <ShieldCheck size={14} className="text-green-600" />
            <span className="text-xs font-bold text-green-700">{totalProtectors} Protectores</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle size={14} className="text-red-600" />
            <span className="text-xs font-bold text-red-700">{totalDestructive} Malsanos</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-xs font-bold text-gray-600">{verbatims.length} Evidencias Totales</span>
          </div>
        </div>
      
        <table className="w-full text-left border-separate border-spacing-1 table-fixed">
          <thead>
            <tr>
              <th className="p-4 bg-accent/10 rounded-tl-xl border border-accent/20 w-48" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'rgba(3,88,161,0.2)' }}>
                <div className="text-[10px] font-black text-accent uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Dimensión</div>
                <div className="text-[9px] text-gray-400 mt-0.5">↓ Nivel · S de la Vida →</div>
              </th>
              {SS_VIDA.map((s, idx) => (
                <th key={s.id}
                  className={`p-3 bg-accent text-white font-bold text-sm text-center border border-accent ${idx === SS_VIDA.length - 1 ? 'rounded-tr-xl' : ''}`}
                  style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}
                >
                  <div className="uppercase text-[12px] tracking-wider">{s.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((domain, domIdx) => (
              <tr key={domain.id}>
                <th
                  className="p-4 border text-sm font-black text-white"
                  style={{
                    background: domain.headerBg,
                    borderColor: 'rgba(0,0,0,0.08)',
                    borderRadius: domIdx === DOMAINS.length - 1 ? '0 0 0 12px' : '0',
                  }}
                >
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Nivel</div>
                  {domain.label}
                </th>
                
                {SS_VIDA.map(s => {
                  const cell = matrix[domain.id][s.id];
                  return (
                    <td key={s.id}
                      className="p-3 border align-top transition-colors hover:brightness-95 h-full"
                      style={{ background: domain.bg, borderColor: 'rgba(0,0,0,0.06)' }}
                    >
                      {cell.count > 0 ? (
                        <div className="space-y-3">
                          <div className="text-[9px] font-black opacity-40 uppercase border-b pb-1 mb-2 border-black/10">
                            {cell.count} evidencias
                          </div>
                          
                          <div className="space-y-3">
                            {Object.entries(cell.categories).map(([catName, catData]) => (
                              <div key={catName} className="bg-white/60 rounded-md p-2 shadow-sm border border-black/5">
                                <h4 className="text-[11px] font-bold text-slate-800 mb-1.5 uppercase leading-tight">
                                  {catName}
                                </h4>
                                <div className="flex flex-col gap-1">
                                  {catData.codes.map(c => (
                                    <div key={c.name}
                                      className={`flex items-start gap-1.5 px-2 py-1 rounded border text-[10px] font-bold shadow-sm w-full
                                        ${c.type === 'malsano'
                                          ? 'bg-red-50 border-red-200 text-red-700'
                                          : c.type === 'protector'
                                          ? 'bg-green-50 border-green-200 text-green-700'
                                          : 'bg-white border-gray-200 text-gray-700'
                                        }`}
                                    >
                                      <div className="mt-0.5">
                                        {c.type === 'malsano'
                                          ? <AlertTriangle size={10} />
                                          : c.type === 'protector'
                                          ? <ShieldCheck size={10} />
                                          : null
                                        }
                                      </div>
                                      <span className="flex-1 leading-tight">{c.name}</span>
                                      <span className="text-[9px] opacity-60 ml-1">({c.count})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center opacity-10">
                          <div className="w-12 h-px bg-gray-400" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Memos Metacríticos */}
        {verbatims.some(v => v.memos && v.memos.length > 0) && (
          <div className="mt-8 bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              💡 Memos Metacríticos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verbatims.filter(v => v.memos && v.memos.length > 0).map(v =>
                v.memos!.map(memo => (
                  <div key={memo.id} className="p-4 rounded-xl border border-slate-200 flex flex-col gap-2 relative overflow-hidden"
                    style={{ background: v.breilhType === 'protector' ? '#f0fdf4' : v.breilhType === 'malsano' ? '#fef2f2' : '#f8fafc' }}>
                    <div className="absolute top-0 left-0 w-1 h-full"
                      style={{ background: v.breilhType === 'protector' ? '#22c55e' : v.breilhType === 'malsano' ? '#ef4444' : '#94a3b8' }} />
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: v.breilhType === 'protector' ? '#166534' : v.breilhType === 'malsano' ? '#991b1b' : '#475569' }}>
                      Ref: {v.codeName}
                    </p>
                    <p className="text-xs italic flex-1 leading-relaxed border-l-2 pl-2"
                      style={{ color: '#1e293b', borderColor: v.breilhType === 'protector' ? '#86efac' : v.breilhType === 'malsano' ? '#fca5a5' : '#cbd5e1' }}>
                      {memo.content}
                    </p>
                    <div className="text-[9px] opacity-60 text-right mt-1 font-medium text-slate-500">
                      {new Date(memo.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer metodológico */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-green-50 border border-green-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-3 text-green-700 font-bold uppercase text-xs">
              <ShieldCheck size={16}/> Procesos Protectores
            </div>
            <p className="text-xs text-green-800 leading-relaxed font-medium">
              Representan las condiciones que sustentan la vida, la soberanía y la solidaridad. Potencia estos hallazgos en las recomendaciones de tu paper.
            </p>
          </div>
          
          <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-3 text-red-700 font-bold uppercase text-xs">
              <AlertTriangle size={16}/> Procesos Malsanos
            </div>
            <p className="text-xs text-red-800 leading-relaxed font-medium">
              Factores destructivos que degradan la salud colectiva e individual. Identifica sus raíces estructurales en el dominio General.
            </p>
          </div>

          <div className="p-5 bg-purple-50 border border-purple-100 rounded-2xl">
            <div className="font-bold uppercase text-xs text-purple-700 mb-3">💡 Meta-Inferencia</div>
            <p className="text-[11px] text-purple-800 leading-relaxed font-medium">
              Observe la diagonal de la matriz y el cruce entre la Dimensión y la S de la Vida. La coherencia entre el dominio General y el Individual confirma la robustez de su análisis crítico.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
