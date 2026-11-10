import { useEffect, useMemo, useRef, useState } from 'react';
import { availableGroups, plannedTools, commonJobs, findTool } from '../tools';
import { readRecent } from '../lib/recentTools';
import ToolIcon from './ToolIcon';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fades a block in the first time it scrolls into view (see .reveal in index.css). `index` staggers
// neighbours by 60ms each. Without IntersectionObserver the block is simply shown.
function Reveal({ as = 'div', index = 0, className = '', children, ...rest }) {
  const Tag = as;
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { el.classList.add('is-visible'); return undefined; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('is-visible'); io.disconnect(); }
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--i': index }} {...rest}>
      {children}
    </Tag>
  );
}

const IconBox = ({ id }) => (
  <span className="grid place-items-center w-9 h-9 shrink-0 rounded border border-line bg-surface text-primary group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary transition-colors duration-150">
    <ToolIcon id={id} className="w-[18px] h-[18px]" />
  </span>
);

const ToolRow = ({ tool, onOpen }) => (
  <li className="border-b border-line">
    <button
      type="button"
      onClick={() => onOpen(tool.id)}
      className="group w-full grid grid-cols-[2.25rem_1fr] gap-x-3 items-start text-left py-3.5 -mx-2 px-2 rounded hover:bg-surface transition-colors active:translate-y-px"
    >
      <IconBox id={tool.id} />
      <span className="min-w-0">
        <span className="block font-medium text-ink group-hover:text-primary group-hover:underline underline-offset-4">{tool.label}</span>
        <span className="block mt-0.5 text-sm text-ink-2 leading-snug line-clamp-2">{tool.summary}</span>
      </span>
    </button>
  </li>
);

export default function EstimatorIndex({ onNavigate }) {
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const [recent] = useState(readRecent);

  const q = query.trim().toLowerCase();
  const total = useMemo(() => availableGroups.reduce((n, g) => n + g.tools.length, 0), []);
  const groups = useMemo(
    () =>
      availableGroups
        .map(({ group, tools }) => ({ group, tools: tools.filter((t) => !q || `${t.label} ${t.summary}`.toLowerCase().includes(q)) }))
        .filter(({ tools }) => tools.length > 0),
    [q],
  );
  const matches = groups.reduce((n, g) => n + g.tools.length, 0);

  // "/" jumps to the search box, as on most documentation sites.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    document.querySelector('section[id^="trade-"]')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  const jumpTo = (group) => {
    document.getElementById(`trade-${slug(group)}`)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  const recentTools = recent.slice(0, 4).map(findTool).filter(Boolean);
  const jobs = commonJobs.map((j) => ({ ...j, tool: findTool(j.id) })).filter((j) => j.tool);

  return (
    <div className="page-enter max-w-5xl">
      {/* Banner: intro and search on the left, the building drawing and stripes on the right */}
      <div className="relative overflow-hidden rounded-lg border border-line bg-surface md:min-h-[300px]">
        <span aria-hidden="true" className="md:hidden absolute -right-5 top-0 h-full w-10 bg-stripe -skew-x-[24deg]" />
        <span aria-hidden="true" className="md:hidden absolute right-7 top-0 h-full w-2 bg-stripe/50 -skew-x-[24deg]" />
        {/* Decorative photo-style render; light theme multiplies away its white, dark theme inverts it onto the banner */}
        <img
          src="/house.webp"
          alt=""
          aria-hidden="true"
          width="744"
          height="556"
          className="hidden md:block absolute right-0 bottom-0 h-full w-auto max-w-[62%] object-cover object-left pointer-events-none select-none mix-blend-multiply dark:mix-blend-screen dark:invert dark:hue-rotate-180 [mask-image:linear-gradient(to_right,transparent,black_22%)]"
        />
        <div className="relative z-10 p-6 pr-12 sm:p-8 sm:pr-14 md:max-w-[52%] md:pr-8">
          <div aria-hidden="true" className="flex items-center gap-1.5 mb-4">
            <span className="block w-10 h-1.5 bg-stripe -skew-x-[35deg]" />
            <span className="block w-5 h-1.5 bg-stripe/60 -skew-x-[35deg]" />
            <span className="block w-2.5 h-1.5 bg-stripe/30 -skew-x-[35deg]" />
          </div>
          <p className="max-w-[46ch] text-base leading-relaxed text-ink-2">
            Enter dimensions and local rates to get quantities and an itemized cost. Every estimator shows its workings step by step and prints as a report.
          </p>
          <form role="search" onSubmit={onSearchSubmit} className="mt-5 max-w-md">
            <label htmlFor="tool-search" className="block text-sm font-semibold text-ink mb-1.5">Find a tool</label>
            <div className="relative flex">
              <svg aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input
                ref={searchRef}
                id="tool-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. slab, paint, rebar"
                className="min-w-0 flex-1 rounded-l border border-r-0 border-line-control bg-surface pl-9 pr-9 py-2.5 text-sm text-ink placeholder:text-muted"
              />
              {!query && (
                <kbd aria-hidden="true" className="hidden md:grid place-items-center absolute right-14 top-1/2 -translate-y-1/2 h-5 w-5 rounded border border-line text-xs text-muted font-mono">/</kbd>
              )}
              <button type="submit" aria-label="Search tools" className="grid place-items-center w-12 shrink-0 rounded-r bg-primary text-on-primary hover:bg-primary-hover transition-colors">
                <svg aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      <p className="sr-only" role="status">
        {q ? `${matches} ${matches === 1 ? 'tool matches' : 'tools match'} “${query.trim()}”` : ''}
      </p>

      {!q && (
        <>
          {/* Common jobs: a ruled strip, like the cells of a drawing sheet */}
          <Reveal as="section" className="mt-8" aria-labelledby="jobs-heading">
            <h2 id="jobs-heading" className="text-sm font-semibold text-ink mb-3 border-l-[3px] border-stripe pl-2.5">Common jobs</h2>
            <ul className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line border border-line rounded overflow-hidden">
              {jobs.map(({ id, title, detail, tool }, i) => (
                <Reveal as="li" key={id} index={i + 1} className="bg-surface">
                  <button
                    type="button"
                    onClick={() => onNavigate(id)}
                    className="group h-full w-full text-left p-3 sm:p-4 hover:bg-sunken transition-colors active:bg-line/40 flex flex-col"
                  >
                    <span className="flex items-center justify-between text-xs text-muted font-mono">
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-primary transition-transform duration-200 group-hover:scale-110"><ToolIcon id={tool.id} className="w-[18px] h-[18px]" /></span>
                    </span>
                    <span className="mt-3 font-semibold text-ink group-hover:text-primary">{title}</span>
                    <span className="hidden sm:block mt-1 text-sm text-ink-2 leading-snug">{detail}</span>
                    <span className="mt-auto pt-3"><span className="block pt-3 border-t border-line text-sm text-primary group-hover:underline underline-offset-4">Open {tool.label} <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span></span></span>
                  </button>
                </Reveal>
              ))}
            </ul>
          </Reveal>

          {recentTools.length > 0 && (
            <section className="mt-6" aria-labelledby="recent-heading">
              <h2 id="recent-heading" className="inline text-sm font-semibold text-ink mr-3">Recently opened</h2>
              <ul className="inline-flex flex-wrap gap-2 align-middle">
                {recentTools.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => onNavigate(t.id)} className="pill-tab pill-tab-inactive inline-flex items-center gap-2">
                      <ToolIcon id={t.id} className="w-4 h-4 text-primary" />
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Trade jump links: the sidebar isn't visible below the lg breakpoint */}
          <nav className="mt-8 flex flex-wrap items-center gap-2" aria-label="Jump to a trade">
            <span className="text-sm font-semibold text-ink mr-1">All tools by trade</span>
            {availableGroups.map(({ group, tools }) => (
              <button key={group} type="button" onClick={() => jumpTo(group)} className="pill-tab pill-tab-inactive">
                {group} <span className="text-muted">{tools.length}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      {q && (
        <p className="mt-8 text-sm text-muted">
          {matches > 0 ? `${matches} ${matches === 1 ? 'tool matches' : 'tools match'} “${query.trim()}”.` : `No tool matches “${query.trim()}”. Try a material or a trade, like “concrete” or “paint”.`}
        </p>
      )}

      {/* Full list, by trade, two columns on wide screens */}
      {groups.map(({ group, tools }) => (
        <Reveal as="section" key={group} id={`trade-${slug(group)}`} className="mt-10 scroll-mt-24" aria-labelledby={`h-${slug(group)}`}>
          <div className="flex items-baseline justify-between pb-2 border-b-2 border-ink">
            <h2 id={`h-${slug(group)}`} className="text-base font-semibold text-ink border-l-[3px] border-stripe pl-2.5">{group}</h2>
            <span className="text-xs text-muted font-mono">{tools.length} {tools.length === 1 ? 'tool' : 'tools'}</span>
          </div>
          <ul className="grid md:grid-cols-2 md:gap-x-10">
            {tools.map((tool) => (
              <ToolRow key={tool.id} tool={tool} onOpen={onNavigate} />
            ))}
          </ul>
        </Reveal>
      ))}

      {plannedTools.length > 0 && !q && (
        <section className="mt-10 mb-6" aria-labelledby="planned-heading">
          <h2 id="planned-heading" className="text-sm font-semibold text-ink pb-2 border-b border-line">In development</h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">{plannedTools.map((t) => t.label).join(' · ')}</p>
        </section>
      )}

      {!q && <p className="mt-8 text-xs text-muted">{total} tools in {availableGroups.length} trades.</p>}
    </div>
  );
}
