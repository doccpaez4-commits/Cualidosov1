'use client';

import type { VerbatimResult } from '@/types';
import { X, FileText } from 'lucide-react';

interface Props {
  verbatims: VerbatimResult[];
  onClose: () => void;
}

export default function VerbatimList({ verbatims, onClose }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="section-header flex-shrink-0">
        <span>Verbatims ({verbatims.length})</span>
        <button className="btn-icon" onClick={onClose}><X size={14}/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {verbatims.map((v, i) => (
          <div key={i} className="rounded-lg p-3 text-xs space-y-1.5"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            {/* Documento */}
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <FileText size={10}/>
              <span className="truncate">{v.documentName}</span>
            </div>
            {/* Texto */}
            <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              "{v.text}"
            </p>
            {/* Código + categoría */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="code-chip text-xs"
                style={{ background: `${v.codeColor}20`, color: v.codeColor, border: `1px solid ${v.codeColor}40` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: v.codeColor }} />
                {v.codeName}
              </span>
              {v.categoryName && (
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {v.categoryName}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
