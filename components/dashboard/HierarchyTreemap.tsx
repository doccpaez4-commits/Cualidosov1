'use client';

import { useEffect, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { db } from '@/lib/db';
import type { VerbatimResult, TreemapNode } from '@/types';

interface Props {
  projectId: number;
  onSelect: (verbatims: VerbatimResult[]) => void;
  verbatims: VerbatimResult[];
}

export default function HierarchyTreemap({ projectId, onSelect, verbatims }: Props) {
  const [data, setData] = useState<TreemapNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    buildTreemap();
  }, [projectId]);

  async function buildTreemap() {
    setLoading(true);
    const [codes, categories, annotations] = await Promise.all([
      db.codes.where('projectId').equals(projectId).toArray(),
      db.categories.where('projectId').equals(projectId).toArray(),
      db.annotations.where('projectId').equals(projectId).toArray(),
    ]);

    const countMap = new Map<number, number>();
    annotations.forEach(a => countMap.set(a.codeId, (countMap.get(a.codeId) ?? 0) + 1));

    const catMap = new Map(categories.map(c => [c.id!, c]));
    const byCategory = new Map<number | undefined, typeof codes>();
    codes.forEach(code => {
      const key = code.categoryId;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(code);
    });

    const children: TreemapNode[] = [];
    byCategory.forEach((catCodes, catId) => {
      const cat = catId ? catMap.get(catId) : undefined;
      const codeNodes: TreemapNode[] = catCodes.map(c => ({
        name: c.name,
        value: countMap.get(c.id!) ?? 0,
        color: c.color,
        codeId: c.id,
      })).filter(n => n.value > 0);

      if (codeNodes.length === 0) return;

      if (cat) {
        children.push({
          name: cat.name,
          value: codeNodes.reduce((s, n) => s + n.value, 0),
          color: cat.color,
          categoryId: cat.id,
          children: codeNodes,
        });
      } else {
        children.push(...codeNodes);
      }
    });

    setData({ name: 'root', value: children.reduce((s, c) => s + c.value, 0), color: 'transparent', children });
    setLoading(false);
  }

  function CustomContent(props: any) {
    const { x, y, width, height, name, color, value, depth } = props;
    if (width < 10 || height < 10) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height}
          style={{ fill: color, fillOpacity: depth === 1 ? 0.7 : 0.5, stroke: 'var(--bg-primary)', strokeWidth: 2, cursor: 'pointer' }}
          rx={4} onClick={() => {
            const matching = verbatims.filter(v => v.codeName === name || v.categoryName === name);
            if (matching.length > 0) props.onSelect(matching);
          }} />
        {width > 40 && height > 24 && (
          <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle"
            fill="#fff" fontSize={Math.min(13, width / 6)} fontWeight={depth === 1 ? 600 : 400} opacity={0.9}>
            {(name || '').length > 15 ? name.slice(0, 15) + '…' : name}
          </text>
        )}
        {width > 60 && height > 40 && (
          <text x={x + width / 2} y={y + height / 2 + 14} textAnchor="middle"
            fill="rgba(255,255,255,0.6)" fontSize={10}>{value} anot.</text>
        )}
      </g>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!data || !data.children || data.children.length === 0) return (
    <div className="flex items-center justify-center h-full">
      <div className="empty-state"><p className="text-xl">🗂️</p><p>Crea códigos y anotaciones para ver la jerarquía.</p></div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Mapa de Jerarquía</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Treemap del peso de cada categoría y código. Haz clic para ver los verbatims.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={data.children} dataKey="value" aspectRatio={4 / 3}
            content={<CustomContent onSelect={onSelect} />}>
            <Tooltip formatter={(val: number) => [`${val} anotaciones`]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
