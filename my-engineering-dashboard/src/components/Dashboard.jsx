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
// The look is a frosted-glass layout over the house drawing (.glass / .glass-panel in index.css).
const QUICK = ['slab', 'paint', 'rebar-weight', 'concrete', 'bricks', 'mix-design'];

const PanelTitle = ({ id, children, action }) => (
  <div className="flex items-center justify-between gap-4 mb-4">
    <h2 id={id} className="text-base font-semibold text-ink">{children}</h2>
    {action}
  </div>
);

const LinkButton = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="text-sm font-medium text-primary hover:underline underline-offset-4">{children}</button>
);

const IconTile = ({ id, className = '' }) => (
  <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-lg bg-sunken/70 text-primary ${className}`}>
    <ToolIcon id={id} className="w-[18px] h-[18px]" />
  </span>
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
  const latestBoq = [...lineItems].slice(-3).reverse();

  return (
    <div className="page-enter">
      <div className="glass mx-auto max-w-6xl p-4 sm:p-7 space-y-5">
        <header>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">{greeting()}{name ? `, ${name.split(' ')[0]}` : ''}</h2>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)] gap-4">
          {/* Project value */}
          <section aria-labelledby="value-heading" className="glass-panel p-5 flex flex-col">
            <PanelTitle id="value-heading">Project value</PanelTitle>
            <p className="text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums text-ink">{formatMoney(grandTotal, currency)}</p>
            <p className="mt-3 inline-flex self-start rounded-md bg-primary/15 px-2.5 py-1 text-sm font-medium text-ink">
              {formatMoney(subtotal, currency)} before taxes
            </p>
            <button
              type="button"
              onClick={() => onNavigate('project-boq')}
              className="mt-auto pt-6 flex items-center gap-3 text-left group"
            >
              <IconTile id="project-boq" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{projectName}</span>
                <span className="block text-sm truncate">{clientName}</span>
              </span>
              <span aria-hidden="true" className="grid place-items-center w-10 h-10 rounded-full bg-sunken/70 group-hover:bg-primary group-hover:text-on-primary transition-colors">↗</span>
              <span className="sr-only">Open the project BOQ</span>
            </button>
          </section>

          {/* Cost by category */}
          <section aria-labelledby="cat-heading" className="glass-panel p-5">
            <PanelTitle id="cat-heading">Cost by category</PanelTitle>
            <dl className="mb-5 flex flex-wrap gap-x-10 gap-y-3">
              <div><dt className="text-sm">Estimators</dt><dd className="text-2xl font-semibold tabular-nums">{totalTools}</dd></div>
              <div><dt className="text-sm">BOQ line items</dt><dd className="text-2xl font-semibold tabular-nums">{lineItems.length}</dd></div>
            </dl>
            {byCategory.length === 0 ? (
              <p className="text-sm py-4 text-center">Nothing to break down yet.</p>
            ) : (
              <ul className="space-y-3.5">
                {byCategory.map(({ category, cost, pct }) => (
                  <li key={category}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">{category}</span>
                      <span className="tabular-nums shrink-0 font-medium">{formatMoney(cost, currency)} <span className="font-normal">· {pct.toFixed(0)}%</span></span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-line overflow-hidden" role="img" aria-label={`${category}: ${pct.toFixed(0)} percent of the subtotal`}>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4">
          {/* Project BOQ */}
          <section aria-labelledby="boq-heading" className="glass-panel p-5 min-w-0">
            <PanelTitle id="boq-heading" action={<LinkButton onClick={() => onNavigate('project-boq')}>Open BOQ →</LinkButton>}>Project BOQ</PanelTitle>
            {topItems.length === 0 ? (
              <p className="text-sm py-6 text-center">No line items yet. Use “Add to BOQ” in a calculator, or add items in the Project BOQ.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {topItems.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <IconTile id="project-boq" className="w-9 h-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate" title={it.description}>{it.description}</span>
                      <span className="block text-sm truncate">{it.category} · {Number(it.quantity).toLocaleString('en-IN')} {it.unit}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums whitespace-nowrap">{formatMoney(it.cost, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick estimators */}
          <section aria-labelledby="quick-heading" className="glass-panel p-5 min-w-0">
            <PanelTitle id="quick-heading" action={<LinkButton onClick={() => onNavigate('estimators')}>View all →</LinkButton>}>Quick estimators</PanelTitle>
            <ul className="grid grid-cols-2 gap-2.5">
              {QUICK.map(findTool).filter(Boolean).map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => onNavigate(t.id)} className="group w-full flex items-center gap-2.5 rounded-lg bg-sunken/55 px-3 py-2.5 text-left hover:bg-primary hover:text-on-primary transition-colors active:translate-y-px">
                    <ToolIcon id={t.id} className="w-[18px] h-[18px] shrink-0 text-primary group-hover:text-on-primary" />
                    <span className="text-sm font-medium leading-tight">{t.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4">
          {/* Recent activity */}
          <section aria-labelledby="act-heading" className="glass-panel p-5 min-w-0">
            <PanelTitle id="act-heading">Recent activity</PanelTitle>
            {recentTools.length === 0 && latestBoq.length === 0 ? (
              <p className="text-sm py-4 text-center">Nothing yet. Open an estimator to get started.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {recentTools.map(({ tool, at }) => (
                  <li key={tool.id}>
                    <button type="button" onClick={() => onNavigate(tool.id)} className="group w-full flex items-center gap-3 py-2.5 first:pt-0 text-left">
                      <IconTile id={tool.id} className="w-9 h-9" />
                      <span className="min-w-0 flex-1 text-sm truncate group-hover:text-primary">Opened {tool.label}</span>
                      <span className="text-sm shrink-0">{at ? timeAgo(at, now) : 'earlier'}</span>
                    </button>
                  </li>
                ))}
                {latestBoq.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-2.5">
                    <IconTile id="project-boq" className="w-9 h-9" />
                    <span className="min-w-0 flex-1 text-sm truncate" title={it.description}>In BOQ: {it.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Start an estimate */}
          <section aria-label="Start an estimate" className="relative overflow-hidden rounded-2xl bg-primary text-on-primary p-6 sm:p-7 flex flex-col justify-center">
            <span aria-hidden="true" className="absolute -right-8 top-0 h-full w-24 bg-stripe -skew-x-[24deg]" />
            <span aria-hidden="true" className="absolute right-20 top-0 h-full w-5 bg-on-primary/25 -skew-x-[24deg]" />
            <div className="relative max-w-md">
              <h2 className="text-2xl font-semibold tracking-tight">Start an estimate</h2>
              <p className="mt-2 text-base leading-relaxed">Pick a trade and enter dimensions and local rates, or open the drafting board and take quantities straight from a plan.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => onNavigate('estimators')} className="rounded-md bg-on-primary px-4 py-2.5 text-sm font-semibold text-primary hover:opacity-90 transition-opacity">New estimation →</button>
                <button type="button" onClick={() => onNavigate('cad-studio')} className="rounded-md border border-on-primary/70 px-4 py-2.5 text-sm font-semibold hover:bg-on-primary/10 transition-colors">Open CAD Studio</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
