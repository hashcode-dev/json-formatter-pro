import React, { useState, useRef, useEffect } from 'react';

interface ToolItem {
  name: string;
  desc: string;
  href: string;
  mode: string;
  icon: string;
}

interface Category {
  title: string;
  icon: string;
  items: ToolItem[];
}

const CATEGORIES: Category[] = [
  {
    title: 'Format & Validate',
    icon: '🛠️',
    items: [
      { name: 'JSON Formatter', desc: 'Beautify with 2/4 spaces or tabs', href: '/json-formatter', mode: 'formatted', icon: '✨' },
      { name: 'JSON Minifier', desc: 'Strip whitespace to minimal payload', href: '/json-minifier', mode: 'formatted', icon: '⚡' },
      { name: 'JSON Validator', desc: 'Tolerant AST parser with auto-fix hints', href: '/json-validator', mode: 'formatted', icon: '✅' },
    ],
  },
  {
    title: 'Converters',
    icon: '🔄',
    items: [
      { name: 'JSON to YAML', desc: 'Clean YAML document conversion', href: '/json-to-yaml', mode: 'yaml', icon: '📝' },
      { name: 'JSON to XML', desc: 'Structured XML with custom roots', href: '/json-to-xml', mode: 'xml', icon: '📄' },
      { name: 'JSON to CSV', desc: 'Tabular CSV / TSV spreadsheet format', href: '/json-to-csv', mode: 'csv', icon: '📊' },
      { name: 'JSON to TypeScript', desc: 'Generate typed TS interfaces', href: '/json-to-typescript', mode: 'typescript', icon: '🔷' },
      { name: 'JSON to Schema', desc: 'Draft-07 JSON Schema inference', href: '/json-to-json-schema', mode: 'schema', icon: '📐' },
    ],
  },
  {
    title: 'Query & Compare',
    icon: '🔍',
    items: [
      { name: 'Virtualized Tree', desc: 'High-speed O(1) node explorer', href: '/json-formatter', mode: 'tree', icon: '🌲' },
      { name: 'Structure & Metrics', desc: 'Depth, key count, and memory stats', href: '/json-formatter', mode: 'stats', icon: '📈' },
    ],
  },
  {
    title: 'Security & Utilities',
    icon: '🔒',
    items: [
      { name: 'JWT Inspector', desc: 'Decode header, payload & claim validity', href: '/jwt-decoder', mode: 'jwt', icon: '🔑' },
    ],
  },
];

export const ToolsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleToolClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, mode: string) => {
    setIsOpen(false);
    // If on the root page or current tool page, dispatch event for instantaneous mode switch
    if (window.location.pathname === href || window.location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('json-tool-select', { detail: { mode } }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={dropdownRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-subtle hover:text-fg hover:bg-muted transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>JSON Tools Hub</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[720px] max-w-[90vw] rounded-xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150"
          role="menu"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.title} className="space-y-2">
                <div className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wider text-accent/90">
                  <span>{cat.icon}</span>
                  <span>{cat.title}</span>
                </div>
                <div className="space-y-0.5">
                  {cat.items.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleToolClick(e, item.href, item.mode)}
                      className="group flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left hover:bg-muted/80 transition-colors"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-fg group-hover:text-accent">
                        <span className="text-sm">{item.icon}</span>
                        <span>{item.name}</span>
                      </div>
                      <span className="text-[11px] text-subtle line-clamp-1 leading-tight">
                        {item.desc}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
