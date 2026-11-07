import { useEffect, useMemo, useRef, useState } from 'react';
import { toolGroups } from '../tools';
import ToolIcon from './ToolIcon';

// Ctrl/⌘+K: jump to any tool, or to the Dashboard and the Estimators index, from anywhere.
const PAGES = [
  { id: '', label: 'Dashboard', summary: 'Overview of your project, quick estimators and recent activity.', group: 'Pages' },
  { id: 'estimators', label: 'All estimators', summary: 'Every tool, by trade, with search.', group: 'Pages' },
];

export default function CommandPalette({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const items = useMemo(() => {
    const all = [
      ...PAGES,
      ...toolGroups.flatMap(({ group, tools }) => tools.filter((t) => t.component).map((t) => ({ id: t.id, label: t.label, summary: t.summary, group }))),
    ];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    const score = (it) => {
      const label = it.label.toLowerCase();
      if (label === q) return 0;
      if (label.startsWith(q)) return 1;
      if (label.includes(q)) return 2;
      if (`${it.summary} ${it.group}`.toLowerCase().includes(q)) return 3;
      return 9;
    };
    return all.map((it) => [score(it), it]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0]).map(([, it]) => it);
  }, [query]);

  const safeActive = Math.min(active, Math.max(0, items.length - 1));

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [safeActive, items]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((safeActive + 1) % Math.max(1, items.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((safeActive - 1 + items.length) % Math.max(1, items.length)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[safeActive]) onSelect(items[safeActive].id); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'Tab') { e.preventDefault(); } // keep focus in the box; arrows move the selection
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search tools and pages">
      <div className="drawer-scrim absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="page-enter relative w-full max-w-xl rounded-lg border border-line bg-surface shadow-[0_8px_24px_rgb(0_0_0/0.18)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <svg aria-hidden="true" className="w-4 h-4 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[safeActive] ? `palette-opt-${items[safeActive].id || 'home'}` : undefined}
            aria-label="Search tools and pages"
            placeholder="Search estimators, pages…"
            className="flex-1 min-w-0 bg-transparent py-3.5 text-base text-ink placeholder:text-muted outline-none"
          />
          <kbd aria-hidden="true" className="hidden sm:inline text-xs text-muted font-mono border border-line rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul id="palette-list" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto custom-scroll py-1">
          {items.length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">Nothing matches “{query.trim()}”.</li>}
          {items.map((it, i) => (
            <li
              key={it.id || 'home'}
              id={`palette-opt-${it.id || 'home'}`}
              role="option"
              aria-selected={i === safeActive}
              onMouseMove={() => setActive(i)}
              onClick={() => onSelect(it.id)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${i === safeActive ? 'bg-sunken' : ''}`}
            >
              <span className="grid place-items-center w-8 h-8 shrink-0 rounded border border-line bg-surface text-primary">
                <ToolIcon id={it.id} className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{it.label}</span>
                <span className="block text-xs text-muted truncate">{it.summary}</span>
              </span>
              <span className="hidden sm:block text-xs text-muted shrink-0">{it.group}</span>
            </li>
          ))}
        </ul>
        <p className="px-4 py-2 border-t border-line text-xs text-muted">↑ ↓ to move · Enter to open · Esc to close</p>
      </div>
    </div>
  );
}
