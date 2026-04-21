'use client';

import { useState } from 'react';
import { useProjectContext } from '@/components/ProjectProvider';
import { db } from '@/lib/db';
import { HexColorPicker } from 'react-colorful';
import {
  Plus, ChevronDown, ChevronRight, Tag, FolderPlus,
  Trash2, Edit2, Check, X, Layers
} from 'lucide-react';
import type { Code, Category, BreilhDomain, GroundedPhase } from '@/types';

const DOMAIN_LABELS: Record<BreilhDomain, string> = {
  general: 'General', particular: 'Particular', singular: 'Singular',
};
const DOMAIN_COLORS: Record<BreilhDomain, string> = {
  general: '#7c6af7', particular: '#14b8a6', singular: '#fb7185',
};
const PHASE_LABELS: Record<GroundedPhase, string> = {
  open: 'Abierta', axial: 'Axial', selective: 'Selectiva',
};

const PRESET_COLORS = [
  '#7c6af7','#14b8a6','#f59e0b','#10b981','#ef4444',
  '#3b82f6','#ec4899','#8b5cf6','#06b6d4','#f97316',
];

export default function CodeTree() {
  const { codes, categories, activeCodeId, setActiveCodeId, refreshCodes, project } = useProjectContext();
  const [showNewCode, setShowNewCode] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeColor, setNewCodeColor] = useState(PRESET_COLORS[0]);
  const [newCodeCat, setNewCodeCat] = useState<number | undefined>(undefined);
  const [newCodeDomain, setNewCodeDomain] = useState<BreilhDomain>('general');
  const [newCodePhase, setNewCodePhase] = useState<GroundedPhase>('open');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4a5568');
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [editingCodeId, setEditingCodeId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const isBreilh = project?.lente === 'breilh';
  const isGrounded = project?.lente === 'grounded';

  async function addCode() {
    if (!newCodeName.trim() || !project) return;
    await db.codes.add({
      projectId: project.id!, name: newCodeName.trim(), color: newCodeColor,
      categoryId: newCodeCat,
      domain: isBreilh ? newCodeDomain : undefined,
      groundedPhase: isGrounded ? newCodePhase : undefined,
    });
    await refreshCodes();
    setNewCodeName(''); setShowNewCode(false);
  }

  async function addCategory() {
    if (!newCatName.trim() || !project) return;
    await db.categories.add({ projectId: project.id!, name: newCatName.trim(), color: newCatColor });
    await refreshCodes();
    setNewCatName(''); setShowNewCat(false);
  }

  async function deleteCode(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    await db.annotations.where('codeId').equals(id).delete();
    await db.codes.delete(id);
    await refreshCodes();
  }

  async function saveEditCode(code: Code) {
    await db.codes.update(code.id!, { name: editName });
    setEditingCodeId(null);
    await refreshCodes();
  }

  function toggleCat(id: number) {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDropOnCat(e: React.DragEvent, categoryId: number | undefined) {
    e.preventDefault();
    const codeIdStr = e.dataTransfer.getData('codeId');
    if (!codeIdStr) return;
    const codeId = parseInt(codeIdStr, 10);
    // Expand category when placing item
    if (categoryId) {
      setExpandedCats(prev => {
        const next = new Set(prev);
        next.add(categoryId);
        return next;
      });
    }
    await db.codes.update(codeId, { categoryId });
    await refreshCodes();
  }

  // Agrupar códigos por categoría
  const uncategorized = codes.filter(c => !c.categoryId);
  const byCat = categories.map(cat => ({
    cat,
    codes: codes.filter(c => c.categoryId === cat.id),
  }));

  function renderCode(code: Code) {
    const isActive = activeCodeId === code.id;
    const isEditing = editingCodeId === code.id;
    return (
      <div key={code.id}
        draggable
        onDragStart={e => e.dataTransfer.setData('codeId', code.id!.toString())}
        className={`code-tree-item group ${isActive ? 'active' : ''}`}
        onClick={() => setActiveCodeId(isActive ? null : code.id!)}
      >
        <div className="code-dot flex-shrink-0" style={{ background: code.color }} />
        {isEditing ? (
          <input className="input text-xs flex-1 h-6 py-0" autoFocus
            value={editName} onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEditCode(code); if (e.key === 'Escape') setEditingCodeId(null); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-xs"
            style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {code.name}
          </span>
        )}

        {/* Badges */}
        {isBreilh && code.domain && (
          <span className="text-xs px-1 rounded flex-shrink-0"
            style={{ background: `${DOMAIN_COLORS[code.domain]}20`, color: DOMAIN_COLORS[code.domain], fontSize: '10px' }}>
            {DOMAIN_LABELS[code.domain][0]}
          </span>
        )}
        {isGrounded && code.groundedPhase && (
          <span className="text-xs px-1 rounded flex-shrink-0"
            style={{ background: 'rgba(124,106,247,0.2)', color: '#7c6af7', fontSize: '10px' }}>
            {PHASE_LABELS[code.groundedPhase][0]}
          </span>
        )}
        {code.annotationCount !== undefined && code.annotationCount > 0 && (
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {code.annotationCount}
          </span>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
          {isEditing ? (
            <>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); saveEditCode(code); }}><Check size={11}/></button>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); setEditingCodeId(null); }}><X size={11}/></button>
            </>
          ) : (
            <>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); setEditingCodeId(code.id!); setEditName(code.name); }}>
                <Edit2 size={11}/>
              </button>
              <button className="btn-icon" onClick={e => deleteCode(e, code.id!)}>
                <Trash2 size={11} style={{ color: 'var(--rose)' }}/>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="section-header flex-shrink-0">
        <div className="flex items-center gap-1">
          <Tag size={11}/> <span>Códigos</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-icon tooltip" data-tip="Nueva categoría" onClick={() => setShowNewCat(!showNewCat)}>
            <FolderPlus size={13}/>
          </button>
          <button className="btn-icon tooltip" data-tip="Nuevo código" onClick={() => setShowNewCode(!showNewCode)}>
            <Plus size={13}/>
          </button>
        </div>
      </div>

      {/* Formulario nuevo código */}
      {showNewCode && (
        <div className="p-2 border-b space-y-2 flex-shrink-0 animate-fade-in" style={{ borderColor: 'var(--border)' }}>
          <input className="input text-xs" placeholder="Nombre del código..."
            value={newCodeName} onChange={e => setNewCodeName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCode()} autoFocus />

          {/* Color */}
          <div className="flex items-center gap-2">
            <button className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0 relative"
              style={{ background: newCodeColor }}
              onClick={() => setShowColorPicker(!showColorPicker)} />
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map(c => (
                <button key={c} className="w-4 h-4 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, border: newCodeColor === c ? '2px solid white' : '2px solid transparent' }}
                  onClick={() => { setNewCodeColor(c); setShowColorPicker(false); }} />
              ))}
            </div>
          </div>
          {showColorPicker && (
            <div className="relative z-10">
              <HexColorPicker color={newCodeColor} onChange={setNewCodeColor} style={{ width: '100%', height: '120px' }} />
            </div>
          )}

          {/* Categoría */}
          {categories.length > 0 && (
            <select className="input text-xs" value={newCodeCat ?? ''}
              onChange={e => setNewCodeCat(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* Dominio Breilh */}
          {isBreilh && (
            <div className="grid grid-cols-3 gap-1">
              {(['general','particular','singular'] as BreilhDomain[]).map(d => (
                <button key={d} onClick={() => setNewCodeDomain(d)}
                  className="text-xs py-1 rounded-lg transition-all"
                  style={{
                    background: newCodeDomain === d ? `${DOMAIN_COLORS[d]}20` : 'var(--bg-primary)',
                    border: `1px solid ${newCodeDomain === d ? DOMAIN_COLORS[d] : 'var(--border)'}`,
                    color: newCodeDomain === d ? DOMAIN_COLORS[d] : 'var(--text-muted)',
                  }}>
                  {DOMAIN_LABELS[d]}
                </button>
              ))}
            </div>
          )}

          {/* Fase Grounded */}
          {isGrounded && (
            <div className="grid grid-cols-3 gap-1">
              {(['open','axial','selective'] as GroundedPhase[]).map(ph => (
                <button key={ph} onClick={() => setNewCodePhase(ph)}
                  className="text-xs py-1 rounded-lg transition-all"
                  style={{
                    background: newCodePhase === ph ? 'rgba(124,106,247,0.2)' : 'var(--bg-primary)',
                    border: `1px solid ${newCodePhase === ph ? '#7c6af7' : 'var(--border)'}`,
                    color: newCodePhase === ph ? '#7c6af7' : 'var(--text-muted)',
                  }}>
                  {PHASE_LABELS[ph]}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            <button className="btn btn-primary flex-1 text-xs" onClick={addCode}>Crear</button>
            <button className="btn btn-ghost text-xs" onClick={() => setShowNewCode(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Formulario nueva categoría */}
      {showNewCat && (
        <div className="p-2 border-b space-y-2 flex-shrink-0 animate-fade-in" style={{ borderColor: 'var(--border)' }}>
          <input className="input text-xs" placeholder="Nombre de la categoría..."
            value={newCatName} onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()} autoFocus />
          <div className="flex gap-1">
            <button className="btn btn-primary flex-1 text-xs" onClick={addCategory}>
              <Layers size={12}/> Crear Categoría
            </button>
            <button className="btn btn-ghost text-xs" onClick={() => setShowNewCat(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-1 py-1 space-y-1">
        {codes.length === 0 && (
          <div className="empty-state">
            <Tag size={28}/>
            <p className="text-xs">Crea tu primer código<br />para comenzar a anotar</p>
          </div>
        )}

        {/* Por categoría */}
        {byCat.map(({ cat, codes: catCodes }) => (
          <div key={cat.id}>
            <button className="flex items-center gap-1.5 w-full py-1 px-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              onClick={() => toggleCat(cat.id!)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDropOnCat(e, cat.id)}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }}/>
              <span className="text-xs font-semibold flex-1 text-left truncate" style={{ color: 'var(--text-secondary)' }}>
                {cat.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{catCodes.length}</span>
              {expandedCats.has(cat.id!) ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            </button>
            {expandedCats.has(cat.id!) && (
              <div className="pl-3 space-y-0.5">
                {catCodes.map(renderCode)}
              </div>
            )}
          </div>
        ))}

        {/* Sin categoría */}
        <div style={{ paddingBottom: '100px' }} 
             onDragOver={e => e.preventDefault()} 
             onDrop={e => handleDropOnCat(e, undefined)}>
          {categories.length > 0 && (
            <div className="text-xs py-1 px-1" style={{ color: 'var(--text-muted)' }}>Sin categoría (arrastra aquí)</div>
          )}
          {uncategorized.length > 0 && (
            <div className="space-y-0.5">{uncategorized.map(renderCode)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
