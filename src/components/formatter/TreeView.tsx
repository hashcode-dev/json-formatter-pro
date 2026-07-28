import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { clsx } from 'clsx';
import { ChevronDownIcon, ChevronRightIcon, SearchIcon } from './icons';
import type { JsonValue } from '@lib/json/types';
import { EmptyPane } from './EmptyPane';

type NodeKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

interface FlatRow {
  depth: number;
  key: string | number | null;
  kind: NodeKind;
  value: JsonValue;
  childrenCount: number;
  hasChildren: boolean;
  path: string;
}

function typeOf(v: JsonValue): NodeKind {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'object';
}

function childCount(kind: NodeKind, value: JsonValue): number {
  if (kind === 'array') return (value as unknown[]).length;
  if (kind === 'object') return Object.keys(value as object).length;
  return 0;
}

/**
 * Visit each child of a container, building its path. Callers decide whether to
 * descend further, which is why the two walkers below can share this.
 */
function eachChild(
  value: JsonValue,
  kind: NodeKind,
  path: string,
  visit: (child: JsonValue, key: string | number, childPath: string) => void,
): void {
  if (kind === 'array') {
    (value as JsonValue[]).forEach((child, i) => visit(child, i, `${path}[${i}]`));
  } else if (kind === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, JsonValue>)) {
      visit(v, k, `${path}.${k}`);
    }
  }
}

function flatten(root: JsonValue, expanded: Set<string>): FlatRow[] {
  const rows: FlatRow[] = [];
  const visit = (
    value: JsonValue,
    key: string | number | null,
    depth: number,
    rawPath: string,
  ): void => {
    const kind = typeOf(value);
    const path = rawPath || '$';
    const childrenCount = childCount(kind, value);
    const hasChildren = childrenCount > 0;
    rows.push({ depth, key, kind, value, childrenCount, hasChildren, path });
    // Descend only into containers the user has expanded.
    if (!hasChildren || !expanded.has(path)) return;
    eachChild(value, kind, path, (child, k, childPath) =>
      visit(child, k, depth + 1, childPath),
    );
  };
  visit(root, null, 0, '');
  return rows;
}

function primitivePreview(kind: NodeKind, value: JsonValue): string {
  switch (kind) {
    case 'string':
      return JSON.stringify(value);
    case 'number':
    case 'boolean':
      return String(value);
    case 'null':
      return 'null';
    default:
      return '';
  }
}

function matchesQuery(row: FlatRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const keyStr = row.key !== null ? String(row.key).toLowerCase() : '';
  if (keyStr.includes(needle)) return true;
  if (row.kind === 'string' && String(row.value).toLowerCase().includes(needle)) return true;
  if ((row.kind === 'number' || row.kind === 'boolean') && String(row.value).includes(needle)) return true;
  return false;
}

interface Props {
  root: JsonValue | null;
}

export function TreeView({ root }: Props): JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['$']));
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setExpanded(new Set(['$']));
  }, [root]);

  const rows = useMemo(() => (root === null ? [] : flatten(root, expanded)), [root, expanded]);
  const filtered = useMemo(
    () => (query ? rows.filter((r) => matchesQuery(r, query)) : rows),
    [rows, query],
  );

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 26,
    overscan: 12,
  });

  const toggle = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = (): void => {
    if (!root) return;
    const all = new Set<string>();
    const walk = (v: JsonValue, rawPath: string): void => {
      const kind = typeOf(v);
      const path = rawPath || '$';
      if (kind === 'object' || kind === 'array') all.add(path);
      eachChild(v, kind, path, (child, _k, childPath) => walk(child, childPath));
    };
    walk(root, '');
    setExpanded(all);
  };

  const collapseAll = (): void => setExpanded(new Set(['$']));

  if (!root) {
    return <EmptyPane>Enter valid JSON to explore the tree.</EmptyPane>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border p-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keys and values…"
            className="h-8 w-full rounded-md border border-border bg-muted pl-8 pr-3 text-sm placeholder:text-subtle"
            aria-label="Search JSON tree"
          />
        </div>
        <button type="button" onClick={expandAll} className="btn-ghost">Expand all</button>
        <button type="button" onClick={collapseAll} className="btn-ghost">Collapse all</button>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
        role="tree"
        aria-label="JSON tree"
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: 'relative',
            width: '100%',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = filtered[virtualRow.index];
            if (!row) return null;
            return (
              <TreeRow
                key={row.path}
                row={row}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                expanded={expanded.has(row.path)}
                onToggle={toggle}
              />
            );
          })}
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-subtle">No matches for "{query}".</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  row: FlatRow;
  style: React.CSSProperties;
  expanded: boolean;
  onToggle: (id: string) => void;
}

function TreeRow({ row, style, expanded, onToggle }: RowProps): JSX.Element {
  const indent = row.depth * 14 + 8;
  const isContainer = row.kind === 'object' || row.kind === 'array';
  const preview = isContainer
    ? row.kind === 'array'
      ? `[${row.childrenCount}]`
      : `{${row.childrenCount}}`
    : primitivePreview(row.kind, row.value);
  return (
    <div
      style={style}
      role="treeitem"
      aria-expanded={isContainer ? expanded : undefined}
      aria-level={row.depth + 1}
      className="flex h-[26px] items-center gap-1 px-2 font-mono text-[12.5px] hover:bg-muted"
    >
      <div style={{ width: indent }} className="shrink-0" />
      {isContainer ? (
        <button
          type="button"
          onClick={() => onToggle(row.path)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-subtle hover:text-fg"
        >
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </button>
      ) : (
        <span className="w-5" />
      )}
      {row.key !== null && (
        <span
          className={clsx(
            'shrink-0',
            typeof row.key === 'number' ? 'text-subtle' : 'text-fg',
          )}
        >
          {typeof row.key === 'number' ? `[${row.key}]` : `"${row.key}"`}
          <span className="text-subtle">: </span>
        </span>
      )}
      <span
        className={clsx('truncate', {
          'text-emerald-600 dark:text-emerald-400': row.kind === 'string',
          'text-amber-600 dark:text-amber-400': row.kind === 'number',
          'text-purple-600 dark:text-purple-400': row.kind === 'boolean',
          'text-subtle italic': row.kind === 'null',
          'text-subtle': isContainer,
        })}
        title={preview}
      >
        {preview}
      </span>
    </div>
  );
}
