'use client';

import { useMemo } from 'react';
import type { VerbatimResult } from '@/types';
import { Download } from 'lucide-react';

interface SummarySheetProps {
  verbatims: VerbatimResult[];
}

export default function SummarySheet({ verbatims }: SummarySheetProps) {
  // Agrupar verbatim por Categoría -> Código
  const summary = useMemo(() => {
    const data: Record<string, Record<string, VerbatimResult[]>> = {};

    verbatims.forEach(v => {
      const cat = v.categoryName || 'Sin categoría';
      const code = v.codeName || 'Sin código';
      
      if (!data[cat]) data[cat] = {};
      if (!data[cat][code]) data[cat][code] = [];
      
      data[cat][code].push(v);
    });

    return data;
  }, [verbatims]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col h-full bg-white p-6 overflow-y-auto summary-sheet">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .summary-sheet, .summary-sheet * { visibility: visible; }
          .summary-sheet { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}} />

      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Hoja de Resumen de Codificación</h2>
          <p className="text-sm text-gray-500 mt-1">Análisis Categorial y Relatos Asociados</p>
        </div>
        <button onClick={handlePrint} className="no-print btn btn-primary flex items-center gap-2">
          <Download size={16} /> Imprimir / PDF
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(summary).map(([cat, codes]) => (
          <div key={cat} className="category-block">
            <h3 className="text-lg font-bold text-teal-700 bg-teal-50 px-4 py-2 rounded-t-lg border border-teal-100">
              Categoría: <span className="text-gray-900">{cat}</span>
            </h3>
            
            <div className="border border-t-0 border-gray-200 rounded-b-lg">
              {Object.entries(codes).map(([code, list], index, arr) => (
                <div key={code} className={`p-4 ${index !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800 text-base flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: list[0]?.codeColor || '#888' }} />
                      Código: {code} 
                    </h4>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {list.length} {list.length === 1 ? 'relato' : 'relatos'}
                    </span>
                  </div>

                  <ul className="space-y-3 mt-3 pl-4 border-l-2 border-gray-100">
                    {list.map(v => (
                      <li key={v.annotationId} className="text-sm text-gray-700">
                        <p className="italic mb-1">"{v.text}"</p>
                        <span className="text-xs text-gray-400 font-medium block">
                          Ref: {v.documentName}
                          {v.domain && ` • Dimensión: ${v.domain.charAt(0).toUpperCase() + v.domain.slice(1)}`}
                        </span>
                        {/* Memos del Mentor vinculados */}
                        {v.memos && v.memos.length > 0 && (
                          <div className="mt-2 space-y-1 pl-3 border-l-2 border-indigo-200">
                            {v.memos.map(memo => (
                              <div key={memo.id} className="text-[11px] text-indigo-700 bg-indigo-50 p-2 rounded">
                                <strong className="block mb-0.5 opacity-80">Mentor/Análisis:</strong>
                                {memo.content}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(summary).length === 0 && (
          <p className="text-center text-gray-500 py-10">No hay datos codificados para generar el resumen.</p>
        )}
      </div>
    </div>
  );
}
