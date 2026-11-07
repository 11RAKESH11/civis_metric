import { useMemo, useState } from 'react';
import { availableGroups, findTool } from '../tools';
import { useProject } from '../context/ProjectContext.jsx';
import { useUnit } from '../context/UnitContext.jsx';
import { readRecentDetailed } from '../lib/recentTools';
import { formatMoney, greeting, timeAgo } from '../lib/format';
import { displayName, readUser } from '../lib/user';
import ToolIcon from './ToolIcon';

// Everything here comes from state the app really has: the tool list, the project's BOQ line items
// and totals, and which tools were opened in this browser. There are no invented projects or trends.
// The look is a frosted-glass layout over the drawing backdrop (.glass / .glass-panel in index.css).
const QUICK = ['slab', 'paint', 'rebar-weight', 'concrete', 'bricks', 'mix-design'];

// Category colours for the cost split: theme tokens only, so they follow light and dark.
const SLICES = ['--c-primary', '--c-violet', '--c-cyan', '--c-success', '--c-warning', '--c-accent'];
const sliceColor = (i) => `rgb(var(${SLICES[i % SLICES.length]}))`;

const PanelTitle = ({ id, children, action }) => (
  <div className="mb-4 flex items-center justify-between gap-4">
    <h2 id={id} className="text-base font-semibold text-ink">{children}</h2>
    {action}
  </div>
);

const LinkButton = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{children}</button>
);

const IconTile = ({ id, className = '' }) => (
  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ${className}`}>
    <ToolIcon id={id} className="h-[18px] w-[18px]" />
  </span>
);

const Stat = ({ icon, label, value, note, delay }) => (
  <div className="glass-panel hdr-rise flex items-start gap-3.5 p-4 sm:p-5" style={{ '--d': `${delay}ms` }}>
    <IconTile id={icon} className="h-11 w-11" />
    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold uppercase tracking-wider text-ink">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-ink sm:text-3xl">{value}</p>
      {note && <p className="mt-0.5 text-sm leading-snug text-ink">{note}</p>}
    </div>
  </div>
);

export default function Dashboard({ onNavigate }) {
  const { projectName, clientName, lineItems, subtotal, grandTotal } = useProject();
  const { currency } = useUnit();
  // Read once when the page opens (recents don't change while you're looking at it).
  const [recent] = useState(readRecentDetailed);
  const [now] = useState(() => Date.now());
  const name = displayName(readUser());

  const totalTools = useMemo(() => availableGroups.reduce((n, g) => n + g.tools.length, 0), []);
  const byCategory = useMemo(() => {
    const map = new Map();
    lineItems.forEach((it) => map.set(it.category, (map.get(it.category) || 0) + (Number(it.cost) || 0)));
    const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
    return [...map.entries()].map(([category, cost]) => ({ category, cost, pct: (cost / total) * 100 })).sort((a, b) => b.cost - a.cost);
  }, [lineItems]);
  const topItems = useMemo(() => [...lineItems].sort((a, b) => (Number(b.cost) || 0) - (Number(a.cost) || 0)).slice(0, 5), [lineItems]);
  const recentTools = recent.map((r) => ({ ...r, tool: findTool(r.id) })).filter((r) => r.tool).slice(0, 4);
  const today = new Date(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="page-enter">
      <div className="glass mx-auto max-w-6xl space-y-5 p-4 sm:p-7">
        {/* Welcome band */}
        <header className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface/80 p-5 sm:p-6">
          <span aria-hidden="true" className="hdr-grid pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3" />
          <span aria-hidden="true" className="hdr-bar pointer-events-none absolute inset-x-0 bottom-0 h-0.5" />
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="flex min-w-0 items-center gap-4">
              <span aria-hidden="true" className="hdr-tile hidden shrink-0 sm:grid">
                <svg className="relative z-10 h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="7.5" height="9" rx="2" />
                  <rect x="13" y="3.5" width="7.5" height="5" rx="2" />
                  <rect x="13" y="11" width="7.5" height="9.5" rx="2" />
                  <rect x="3.5" y="15" width="7.5" height="5.5" rx="2" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="hdr-rise flex items-center gap-2 text-[11px] font-bold uppercase leading-none tracking-[0.2em] text-primary" style={{ '--d': '60ms' }}>
                  <span aria-hidden="true" className="hdr-line" />{today}
                </p>
                <h2 className="hdr-rise mt-1.5 text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl" style={{ '--d': '120ms' }}>
                  {greeting()}{name ? `, ${name.split(' ')[0]}` : ''}
                </h2>
                {(projectName || clientName) && (
                  <p className="hdr-rise mt-0.5 text-sm font-medium text-ink" style={{ '--d': '200ms' }}>
                    {[projectName, clientName].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={() => onNavigate('estimators')} className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary shadow-e1 transition-all hover:bg-primary-hover active:scale-[0.98]">New estimation</button>
              <button type="button" onClick={() => onNavigate('cad-studio')} className="h-11 rounded-lg border border-line-control bg-surface px-5 text-sm font-semibold text-ink transition-all hover:bg-sunken active:scale-[0.98]">Open CAD Studio</button>
              <button type="button" onClick={() => onNavigate('project-boq')} className="h-11 rounded-lg border border-line-control bg-surface px-5 text-sm font-semibold text-ink transition-all hover:bg-sunken active:scale-[0.98]">Project BOQ</button>
            </div>
          </div>
        </header>

        {/* Key figures */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <Stat icon="material-cost" label="Project value" value={formatMoney(grandTotal, currency)} note="Including taxes and margins" delay={80} />
          <Stat icon="calc" label="Before taxes" value={formatMoney(subtotal, currency)} note="Direct cost subtotal" delay={140} />
          <Stat icon="project-boq" label="BOQ line items" value={lineItems.length} note={lineItems.length ? 'In the project BOQ' : 'None added yet'} delay={200} />
          <Stat icon="estimators" label="Estimators" value={totalTools} note="Ready to use" delay={260} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Cost split */}
          <section aria-labelledby="cat-heading" className="glass-panel min-w-0 p-5">
            <PanelTitle id="cat-heading" action={<LinkButton onClick={() => onNavigate('project-boq')}>Open BOQ</LinkButton>}>Cost by category</PanelTitle>
            {byCategory.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-ink">Nothing to break down yet.</p>
                <button type="button" onClick={() => onNavigate('estimators')} className="mt-3 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover">Add your first item</button>
              </div>
            ) : (
              <>
                <div className="flex h-3.5 overflow-hidden rounded-full bg-line" role="img" aria-label="Share of the subtotal by category">
                  {byCategory.map(({ category, pct }, i) => (
                    <span key={category} title={`${category}: ${pct.toFixed(0)}%`} className="h-full transition-[width] duration-700" style={{ width: `${pct}%`, background: sliceColor(i) }} />
                  ))}
                </div>
                <ul className="mt-5 space-y-3">
                  {byCategory.map(({ category, cost, pct }, i) => (
                    <li key={category} className="flex items-center gap-3 text-sm">
                      <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: sliceColor(i) }} />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{category}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-ink">{formatMoney(cost, currency)}</span>
                      <span className="w-10 shrink-0 text-right tabular-nums text-ink">{pct.toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Largest BOQ lines */}
          <section aria-labelledby="boq-heading" className="glass-panel min-w-0 p-5">
            <PanelTitle id="boq-heading" action={<LinkButton onClick={() => onNavigate('project-boq')}>View all</LinkButton>}>Largest BOQ lines</PanelTitle>
            {topItems.length === 0 ? (
              <p className="py-8 text-center text-sm font-medium text-ink">No line items yet. Use “Add to BOQ” in a calculator, or add items in the Project BOQ.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {topItems.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <IconTile id="project-boq" className="h-9 w-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink" title={it.description}>{it.description}</span>
                      <span className="block truncate text-sm text-ink">{it.category} · {Number(it.quantity).toLocaleString('en-IN')} {it.unit}</span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{formatMoney(it.cost, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Jump back in */}
          <section aria-labelledby="act-heading" className="glass-panel min-w-0 p-5">
            <PanelTitle id="act-heading">Jump back in</PanelTitle>
            {recentTools.length === 0 ? (
              <p className="py-6 text-center text-sm font-medium text-ink">Nothing yet. Open an estimator and it will appear here.</p>
            ) : (
              <ul className="space-y-2">
                {recentTools.map(({ tool, at }) => (
                  <li key={tool.id}>
                    <button type="button" onClick={() => onNavigate(tool.id)} className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface/80 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-line-control hover:shadow-e1">
                      <IconTile id={tool.id} className="h-9 w-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{tool.label}</span>
                        <span className="block truncate text-xs text-ink">{tool.tagline || tool.summary}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-ink">{at ? timeAgo(at, now) : 'earlier'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick estimators */}
          <section aria-labelledby="quick-heading" className="glass-panel min-w-0 p-5">
            <PanelTitle id="quick-heading" action={<LinkButton onClick={() => onNavigate('estimators')}>View all</LinkButton>}>Quick estimators</PanelTitle>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {QUICK.map(findTool).filter(Boolean).map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => onNavigate(t.id)} className="group flex h-full w-full flex-col items-start gap-2 rounded-xl border border-line bg-surface/80 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-on-primary hover:shadow-e1 active:scale-[0.98]">
                    <ToolIcon id={t.id} className="h-5 w-5 shrink-0 text-primary group-hover:text-on-primary" />
                    <span className="text-sm font-semibold leading-tight">{t.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
