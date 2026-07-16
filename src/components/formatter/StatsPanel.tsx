import type { JsonStats } from '@lib/json/types';
import { formatBytes, formatCount } from '@lib/format-bytes';

interface Props {
  stats: JsonStats | null;
}

interface Card {
  label: string;
  value: string;
  hint?: string;
}

function toCards(s: JsonStats): Card[] {
  return [
    { label: 'Total keys', value: formatCount(s.keys) },
    { label: 'Objects', value: formatCount(s.objects) },
    { label: 'Arrays', value: formatCount(s.arrays) },
    { label: 'Max depth', value: formatCount(s.depth) },
    { label: 'Strings', value: formatCount(s.strings) },
    { label: 'Numbers', value: formatCount(s.numbers) },
    { label: 'Booleans', value: formatCount(s.booleans) },
    { label: 'Nulls', value: formatCount(s.nulls) },
    { label: 'Characters', value: formatCount(s.characters) },
    { label: 'Lines', value: formatCount(s.lines) },
    { label: 'File size', value: formatBytes(s.bytes), hint: `${formatCount(s.bytes)} bytes` },
    {
      label: 'Est. memory',
      value: formatBytes(s.estimatedMemoryBytes),
      hint: 'Approximate in-memory footprint',
    },
  ];
}

export function StatsPanel({ stats }: Props): JSX.Element {
  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-subtle">
        Statistics will appear here after successful validation.
      </div>
    );
  }
  const cards = toCards(stats);
  return (
    <div className="h-full min-h-0 overflow-auto p-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label} className="card p-4">
            <div className="text-xs uppercase tracking-wide text-subtle">{c.label}</div>
            <div className="mt-1 font-mono text-xl font-semibold text-fg">{c.value}</div>
            {c.hint && <div className="mt-0.5 text-xs text-subtle">{c.hint}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
