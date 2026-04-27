'use client';

import { useMemo, useRef } from 'react';
import type { VerbatimResult, BreilhDomain } from '@/types';
import { Download, FileText, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Props {
  verbatims: VerbatimResult[];
}

const DOMAIN_LABELS: Record<string, string> = {
  general: 'General', particular: 'Particular', individual: 'Individual', none: 'No aplica'
};

const S_LABELS: Record<string, string> = {
  soberania: 'Soberanía', sustentabilidad: 'Sustentabilidad', 
  seguridad: 'Seguridad', solidaridad: 'Solidaridad', none: 'No aplica'
};

export default function BreilhTable({ verbatims }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const groupedData = useMemo(() => {
    const catsMap = new Map<string, { domain: string; codes: any[] }>();

    verbatims.forEach(v => {
      const catName = v.categoryName || 'Sin Categoría';
      if (!catsMap.has(catName)) {
        catsMap.set(catName, {
          domain: v.domain || 'none',
          codes: []
        });
      }
      catsMap.get(catName)!.codes.push(v);
    });

    return Array.from(catsMap.entries()).sort((a, b) => {
      // Sort by domain then category name
      const dOrder: Record<string, number> = { general: 1, particular: 2, individual: 3, none: 4 };
      const d1 = dOrder[a[1].domain] || 5;
      const d2 = dOrder[b[1].domain] || 5;
      if (d1 !== d2) return d1 - d2;
      return a[0].localeCompare(b[0]);
    });
  }, [verbatims]);

  async function exportPDF() {
    if (!printRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff', logging: false });
    const imgData = canvas.toDataURL('image/png');
    
    // Auto-calculate pagination for PDF
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    
    const imgW = pdfW - 20;
    const imgH = imgW / ratio;
    
    let heightLeft = imgH;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgW, imgH);
    heightLeft -= (pdfH - 20);

    while (heightLeft >= 0) {
      position = heightLeft - imgH + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgW, imgH);
      heightLeft -= (pdfH - 20);
    }

    pdf.save('cuadro_analitico_breilh.pdf');
  }

  return (
    <div className="w-full h-full overflow-auto flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0 no-print">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Cuadro Analítico de la Determinación
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Clasificación completa de las evidencias agrupadas por dimensión y categoría.
          </p>
        </div>
        <button onClick={exportPDF} className="btn btn-primary text-xs" title="Exportar como PDF">
          <FileText size={14} /> Exportar PDF
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-md border p-8 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
        <div ref={printRef} className="bg-white min-w-[900px]">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-accent uppercase tracking-tight" style={{ color: 'var(--accent)' }}>
              Cuadro Analítico — Metacrítica
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Desglose de verbatims cruzados con las dimensiones estructurales y las formas de vida.
            </p>
          </div>

          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-accent text-white" style={{ backgroundColor: 'var(--accent)' }}>
                <th className="p-3 border border-accent font-bold uppercase text-xs w-[12%]" style={{ borderColor: 'var(--accent)' }}>Dimensión</th>
                <th className="p-3 border border-accent font-bold uppercase text-xs w-[18%]" style={{ borderColor: 'var(--accent)' }}>Categoría</th>
                <th className="p-3 border border-accent font-bold uppercase text-xs w-[15%]" style={{ borderColor: 'var(--accent)' }}>Código</th>
                <th className="p-3 border border-accent font-bold uppercase text-xs w-[12%]" style={{ borderColor: 'var(--accent)' }}>S de la Vida</th>
                <th className="p-3 border border-accent font-bold uppercase text-xs w-[12%]" style={{ borderColor: 'var(--accent)' }}>Proceso</th>
                <th className="p-3 border border-accent font-bold uppercase text-xs w-[31%]" style={{ borderColor: 'var(--accent)' }}>Verbatim</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400 font-medium">
                    No hay evidencias codificadas para mostrar.
                  </td>
                </tr>
              ) : (
                groupedData.map(([catName, data], catIdx) => {
                  return data.codes.map((code: VerbatimResult, codeIdx: number) => {
                    const isFirstCode = codeIdx === 0;
                    const rowCount = data.codes.length;
                    
                    return (
                      <tr key={code.annotationId} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        {isFirstCode && (
                          <td rowSpan={rowCount} className="p-3 border-r border-gray-200 bg-gray-50/50 align-top font-semibold text-slate-700 text-xs uppercase tracking-wide">
                            {DOMAIN_LABELS[data.domain] || data.domain}
                          </td>
                        )}
                        {isFirstCode && (
                          <td rowSpan={rowCount} className="p-3 border-r border-gray-200 align-top font-bold text-accent" style={{ color: 'var(--accent)' }}>
                            {catName}
                          </td>
                        )}
                        <td className="p-3 align-top font-medium" style={{ color: code.codeColor || '#475569' }}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: code.codeColor || '#475569' }} />
                            {code.codeName}
                          </div>
                        </td>
                        <td className="p-3 align-top text-xs text-slate-600 font-medium uppercase tracking-wider">
                          {S_LABELS[code.sDeLaVida || 'none'] || code.sDeLaVida}
                        </td>
                        <td className="p-3 align-top">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm whitespace-nowrap
                            ${code.breilhType === 'malsano' ? 'bg-red-50 text-red-700 border border-red-200' 
                            : code.breilhType === 'protector' ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                          >
                            {code.breilhType === 'malsano' ? <AlertTriangle size={10} /> 
                              : code.breilhType === 'protector' ? <ShieldCheck size={10} /> 
                              : null}
                            {code.breilhType === 'malsano' ? 'Malsano' 
                              : code.breilhType === 'protector' ? 'Protector' 
                              : 'No aplica'}
                          </div>
                        </td>
                        <td className="p-3 align-top text-xs text-slate-600 italic leading-relaxed whitespace-pre-wrap">
                          "{code.text}"
                          {code.documentName && (
                            <span className="block mt-1.5 text-[9px] text-slate-400 not-italic font-bold tracking-wider">
                              — {code.documentName}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>

          <div className="mt-8 pt-4 border-t flex items-center justify-between border-slate-200">
            <span className="text-[10px] text-slate-400 font-medium">Generado por Cualidoso · Matriz Analítica Breilh</span>
            <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString('es-CO')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
