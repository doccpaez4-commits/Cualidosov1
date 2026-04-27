'use client';

import { useState } from 'react';
import { useProjectContext } from '@/components/ProjectProvider';
import { db } from '@/lib/db';
import { HexColorPicker } from 'react-colorful';
import {
  Plus, ChevronDown, ChevronRight, Tag, FolderPlus,
  Trash2, Edit2, Check, X, Layers, Info
} from 'lucide-react';
import type { Code, Category, BreilhDomain, GroundedPhase } from '@/types';

const DOMAIN_LABELS: Record<BreilhDomain, string> = {
  general: 'General', particular: 'Particular', singular: 'Singular', none: 'No aplica',
};
const DOMAIN_COLORS: Record<BreilhDomain, string> = {
  general: '#7c6af7', particular: '#14b8a6', singular: '#fb7185', none: '#cbd5e1',
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
  
  // New Code Form
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeDesc, setNewCodeDesc] = useState('');
  const [newCodeColor, setNewCodeColor] = useState(PRESET_COLORS[0]);
  const [newCodeCat, setNewCodeCat] = useState<number | undefined>(undefined);
  const [newCodeType, setNewCodeType] = useState<'protector' | 'malsano' | 'none'>('protector');
  const [newCodeSDeLaVida, setNewCodeSDeLaVida] = useState<'soberania' | 'sustentabilidad' | 'seguridad' | 'solidaridad' | 'none'>('none');
  const [newCodePhase, setNewCodePhase] = useState<GroundedPhase>('open');
  const [showColorPicker, setShowColorPicker] = useState(false);

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatColor, setNewCatColor] = useState('#4a5568');
  const [newCatDomain, setNewCatDomain] = useState<BreilhDomain>('none');

  // UI State
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [editingCodeId, setEditingCodeId] = useState<number | null>(null);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editType, setEditType] = useState<'protector' | 'malsano' | 'none' | undefined>(undefined);
  const [editS, setEditS] = useState<'soberania' | 'sustentabilidad' | 'seguridad' | 'solidaridad' | 'none' | undefined>(undefined);
  const [editDomain, setEditDomain] = useState<BreilhDomain | undefined>(undefined);

  const isBreilh = project?.lente === 'breilh';
  const isGrounded = project?.lente === 'grounded';

  async function addCode() {
    if (!newCodeName.trim() || !project) return;
    await db.codes.add({
      projectId: project.id!, 
      name: newCodeName.trim(), 
      color: newCodeColor,
      description: newCodeDesc.trim(),
      categoryId: newCodeCat,
      breilhType: isBreilh ? newCodeType : undefined,
      sDeLaVida: isBreilh ? newCodeSDeLaVida : undefined,
      groundedPhase: isGrounded ? newCodePhase : undefined,
    });
    await refreshCodes();
    setNewCodeName(''); setNewCodeDesc(''); setShowNewCode(false);
  }

  async function addCategory() {
    if (!newCatName.trim() || !project) return;
    await db.categories.add({ 
      projectId: project.id!, 
      name: newCatName.trim(), 
      color: newCatColor,
      description: newCatDesc.trim(),
      domain: isBreilh ? newCatDomain : undefined
    });
    await refreshCodes();
    setNewCatName(''); setNewCatDesc(''); setShowNewCat(false);
  }

  async function deleteCode(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    await db.annotations.where('codeId').equals(id).delete();
    await db.codes.delete(id);
    await refreshCodes();
  }

  async function deleteCat(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta categoría? Los códigos asociados quedarán sin categoría.')) return;
    await db.codes.where('categoryId').equals(id).modify({ categoryId: undefined });
    await db.categories.delete(id);
    await refreshCodes();
  }

  async function saveEditCode(id: number) {
    await db.codes.update(id, { 
      name: editName, 
      description: editDesc,
      breilhType: editType,
      sDeLaVida: editS
    });
    setEditingCodeId(null);
    await refreshCodes();
  }

  async function saveEditCat(id: number) {
    await db.categories.update(id, { 
      name: editName, 
      description: editDesc,
      domain: editDomain
    });
    setEditingCatId(null);
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
        className={`code-tree-item group ${isActive ? 'active' : ''} h-auto items-start py-2`}
        onClick={() => setActiveCodeId(isActive ? null : code.id!)}
      >
        <div className="code-dot mt-1 flex-shrink-0" style={{ background: code.color }} />
        <div className="flex-1 min-w-0 pr-1">
          {isEditing ? (
            <div className="space-y-1" onClick={e => e.stopPropagation()}>
              <input className="input text-xs w-full py-1 h-auto" autoFocus
                value={editName} onChange={e => setEditName(e.target.value)} />
              <textarea className="input text-[10px] w-full py-1 leading-tight" 
                placeholder="Descripción/Memo..." rows={2}
                value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              {isBreilh && (
                <>
                  <select className="input text-[10px] py-0 h-6 w-full mb-1" value={editType || 'none'} onChange={e => setEditType(e.target.value as any)}>
                    <option value="none">Proceso: No aplica</option>
                    <option value="protector">Proceso Protector 🟢</option>
                    <option value="malsano">Proceso Malsano 🔴</option>
                  </select>
                  <select className="input text-[10px] py-0 h-6 w-full" value={editS || 'none'} onChange={e => setEditS(e.target.value as any)}>
                    <option value="none">S: No aplica</option>
                    <option value="soberania">Soberanía</option>
                    <option value="sustentabilidad">Sustentabilidad</option>
                    <option value="seguridad">Seguridad</option>
                    <option value="solidaridad">Solidaridad</option>
                  </select>
                </>
              )}
              <div className="flex gap-1 mt-1">
                <button className="btn-icon bg-green-50 text-green-600" onClick={() => saveEditCode(code.id!)}><Check size={12}/></button>
                <button className="btn-icon bg-red-50 text-red-600" onClick={() => setEditingCodeId(null)}><X size={12}/></button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="flex-1 truncate text-xs font-medium"
                  style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {code.name}
                </span>
                {isBreilh && code.breilhType && code.breilhType !== 'none' && (
                  <span className={`text-[9px] px-1 rounded-full font-bold uppercase ${code.breilhType === 'protector' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {code.breilhType === 'protector' ? 'P' : 'M'}
                  </span>
                )}
              </div>
              {code.description && (
                <p className="text-[10px] italic line-clamp-1 opacity-60" style={{ color: 'var(--text-muted)' }}>
                  {code.description}
                </p>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0 pt-0.5">
            <button className="btn-icon" onClick={e => { 
                e.stopPropagation(); 
                setEditingCodeId(code.id!); 
                setEditName(code.name); 
                setEditDesc(code.description || ''); 
                setEditType(code.breilhType || 'none');
                setEditS(code.sDeLaVida || 'none');
              }}>
              <Edit2 size={11}/>
            </button>
            <button className="btn-icon" onClick={e => deleteCode(e, code.id!)}>
              <Trash2 size={11} style={{ color: 'var(--rose)' }}/>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="section-header flex-shrink-0 bg-gray-50 border-b">
        <div className="flex items-center gap-1 text-accent" style={{ color: 'var(--accent)' }}>
          <Tag size={13}/> <span className="font-bold">CÓDIGOS</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-icon hover:bg-gray-200" title="Nueva categoría" onClick={() => setShowNewCat(!showNewCat)}>
            <FolderPlus size={14}/>
          </button>
          <button className="btn-icon hover:bg-gray-200" title="Nuevo código" onClick={() => setShowNewCode(!showNewCode)}>
            <Plus size={14}/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
        {/* Formulario nuevo código */}
        {showNewCode && (
          <div className="p-3 bg-gray-50 border-b space-y-2 rounded-lg m-1 animate-fade-in shadow-inner">
            <input className="input text-xs font-bold" placeholder="Nombre..."
              value={newCodeName} onChange={e => setNewCodeName(e.target.value)} autoFocus />
            <textarea className="input text-xs" placeholder="Memo/Descripción (opcional)..." rows={2}
               value={newCodeDesc} onChange={e => setNewCodeDesc(e.target.value)} />

            <div className="flex items-center gap-2">
              <button className="w-6 h-6 rounded-lg border shadow-sm relative overflow-hidden"
                style={{ background: newCodeColor }}
                onClick={() => setShowColorPicker(!showColorPicker)}>
                {showColorPicker && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><X size={10} className="text-white"/></div>}
              </button>
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map(c => (
                  <button key={c} className="w-4 h-4 rounded shadow-xs hover:scale-110 transition-transform"
                    style={{ background: c, border: newCodeColor === c ? '2px solid rgba(0,0,0,0.2)' : 'none' }}
                    onClick={() => { setNewCodeColor(c); setShowColorPicker(false); }} />
                ))}
              </div>
            </div>
            {showColorPicker && (
              <div className="relative z-10 p-1 bg-white border rounded shadow-xl">
                <HexColorPicker color={newCodeColor} onChange={setNewCodeColor} style={{ width: '100%', height: '100px' }} />
              </div>
            )}

            {isBreilh && (
              <div className="space-y-1.5">
                <select className="input text-[10px] py-1 h-7" value={newCodeType} onChange={e => setNewCodeType(e.target.value as any)}>
                  <option value="none">Proceso: No aplica</option>
                  <option value="protector">Proceso Protector 🟢</option>
                  <option value="malsano">Proceso Malsano 🔴</option>
                </select>
                <select className="input text-[10px] py-1 h-7" value={newCodeSDeLaVida} onChange={e => setNewCodeSDeLaVida(e.target.value as any)}>
                  <option value="none">S de la vida: No aplica</option>
                  <option value="soberania">Soberanía</option>
                  <option value="sustentabilidad">Sustentabilidad</option>
                  <option value="seguridad">Seguridad</option>
                  <option value="solidaridad">Solidaridad</option>
                </select>
              </div>
            )}

            <div className="flex gap-1">
              <button className="btn btn-primary flex-1 text-xs" onClick={addCode}>Crear</button>
              <button className="btn btn-ghost text-xs" onClick={() => setShowNewCode(false)}>X</button>
            </div>
          </div>
        )}

        {/* Formulario nueva categoría */}
        {showNewCat && (
          <div className="p-3 bg-gray-50 border-b space-y-2 rounded-lg m-1 animate-fade-in shadow-inner">
            <input className="input text-xs font-bold" placeholder="Categoría..."
              value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
            <textarea className="input text-xs" placeholder="Memo descriptivo..." rows={2}
               value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} />
               
            {isBreilh && (
              <div className="grid grid-cols-2 gap-1 mt-2">
                {(['general','particular','singular','none'] as BreilhDomain[]).map(d => (
                  <button key={d} onClick={() => setNewCatDomain(d)}
                    className="text-[10px] py-1 rounded border transition-all"
                    style={{
                      background: newCatDomain === d ? `${DOMAIN_COLORS[d]}20` : 'white',
                      borderColor: newCatDomain === d ? DOMAIN_COLORS[d] : 'var(--border)',
                      color: newCatDomain === d ? DOMAIN_COLORS[d] : '#666',
                    }}>{DOMAIN_LABELS[d]}</button>
                ))}
              </div>
            )}
            
            <div className="flex gap-1 mt-2">
              <button className="btn btn-primary flex-1 text-xs" onClick={addCategory}>Crear Categoría</button>
              <button className="btn btn-ghost text-xs" onClick={() => setShowNewCat(false)}>X</button>
            </div>
          </div>
        )}

        {/* Lista de Categorías y Códigos */}
        <div className="py-2 space-y-1">
          {byCat.map(({ cat, codes: catCodes }) => {
            const isEditingCat = editingCatId === cat.id;
            return (
              <div
                key={cat.id}
                className="category-group"
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(3,88,161,0.06)'; }}
                onDragLeave={e => { e.currentTarget.style.background = ''; }}
                onDrop={e => { e.currentTarget.style.background = ''; handleDropOnCat(e, cat.id!); }}
              >
                <div className="flex items-start gap-1 p-1 hover:bg-gray-50 rounded group">
                  <button className="mt-1" onClick={() => toggleCat(cat.id!)}>
                    {expandedCats.has(cat.id!) ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                  </button>
                  <div className="flex-1 min-w-0">
                    {isEditingCat ? (
                      <div className="space-y-1" onClick={e => e.stopPropagation()}>
                        <input className="input text-xs font-bold w-full py-1" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                        <textarea className="input text-[10px] w-full py-1" rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                        {isBreilh && (
                          <select className="input text-[10px] py-0 h-6 w-full" value={editDomain || 'none'} onChange={e => setEditDomain(e.target.value as any)}>
                            <option value="none">Dimensión: No aplica</option>
                            <option value="general">General</option>
                            <option value="particular">Particular</option>
                            <option value="singular">Singular</option>
                          </select>
                        )}
                        <div className="flex gap-1">
                          <button className="btn-icon bg-green-50 text-green-600" onClick={() => saveEditCat(cat.id!)}><Check size={12}/></button>
                          <button className="btn-icon bg-red-50 text-red-600" onClick={() => setEditingCatId(null)}><X size={12}/></button>
                        </div>
                      </div>
                    ) : (
                      <div className="cursor-pointer" onClick={() => toggleCat(cat.id!)}>
                        <h4 className="text-xs font-bold uppercase tracking-tight flex items-center justify-between" style={{ color: 'var(--accent)' }}>
                          <span className="truncate">{cat.name}</span>
                          <span className="text-[10px] font-normal opacity-50 ml-1">({catCodes.length})</span>
                        </h4>
                        {cat.description && (
                          <p className="text-[10px] text-gray-500 italic line-clamp-1 group-hover:line-clamp-none transition-all">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {!isEditingCat && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100">
                      <button className="btn-icon" onClick={() => { setEditingCatId(cat.id!); setEditName(cat.name); setEditDesc(cat.description || ''); setEditDomain(cat.domain || 'none'); }}>
                        <Edit2 size={10}/>
                      </button>
                      <button className="btn-icon" onClick={e => deleteCat(e, cat.id!)}>
                        <Trash2 size={10} className="text-red-400"/>
                      </button>
                    </div>
                  )}
                </div>
                {expandedCats.has(cat.id!) && (
                  <div className="pl-4 ml-1 border-l-2 border-gray-100 space-y-0.5 mt-1">
                    {catCodes.map(renderCode)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Sin categoría */}
          <div
            className="mt-4 pt-4 border-t rounded-lg transition-colors"
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(3,88,161,0.04)'; }}
            onDragLeave={e => { e.currentTarget.style.background = ''; }}
            onDrop={e => { e.currentTarget.style.background = ''; handleDropOnCat(e, undefined); }}
          >
             {uncategorized.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 px-1">Sin Categoría</p>
                {uncategorized.map(renderCode)}
              </>
            )}
            {codes.length === 0 && (
              <div className="text-center py-6 opacity-30">
                <Tag size={24} className="mx-auto mb-2"/>
                <p className="text-[10px]">Sin códigos definidos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
