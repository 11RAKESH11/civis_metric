import { useEffect, useRef, useState } from 'react';
import ToolIcon from '../components/ToolIcon';

// "Precision is the foundation..." strip. When it scrolls into view: the headline rises word by word,
// a line draws across the section with a pulsing node at each capability, and each icon draws itself
// inside its tile. Pure CSS transitions driven by one "seen" flag; nothing here claims figures.
const HEADLINE = 'Precision is the foundation of every successful project.'.split(' ');
const HIGHLIGHT = new Set(['foundation']);

const CAPABILITIES = [
  ['area', 'Intelligent quantity estimation'],
  ['concrete', 'Detailed material calculations'],
  ['cad-studio', 'CAD-based workflows'],
  ['project-boq', 'Structured BOQ generation'],
  ['material-cost', 'Project cost visibility'],
];

export default function PrecisionStrip() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} aria-labelledby="trust-h" className={`relative overflow-hidden bg-bg ${seen ? 'strip-in' : ''}`}>
      {/* Faint blueprint grid that fades out toward the left */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgb(var(--c-text)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-text)) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at 90% 0%, #000 0%, transparent 65%)', WebkitMaskImage: 'radial-gradient(ellipse at 90% 0%, #000 0%, transparent 65%)' }} />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <p className={`flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.28em] text-accent transition-all duration-700 sm:text-sm ${seen ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
          <span aria-hidden="true" className={`h-0.5 bg-stripe transition-[width] duration-700 ${seen ? 'w-10' : 'w-0'}`} />
          Built on accuracy
        </p>

        <h2 id="trust-h" className="mt-4 max-w-4xl font-display text-[clamp(2.4rem,6.2vw,4.6rem)] font-bold uppercase leading-[0.98] tracking-[0.005em]">
          {HEADLINE.map((w, i) => (
            <span key={`${w}-${i}`} className="mr-[0.22em] inline-block overflow-hidden align-bottom pb-[0.1em]">
              <span
                className={`inline-block transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${HIGHLIGHT.has(w) ? 'text-sheen-warm' : ''} ${seen ? 'translate-y-0' : 'translate-y-[115%]'}`}
                style={{ transitionDelay: `${150 + i * 70}ms` }}
              >
                {w}
              </span>
            </span>
          ))}
        </h2>

        <ul className="relative mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-5">
          {/* The line that draws across, with a node above each item */}
          <span aria-hidden="true" className={`absolute inset-x-0 top-0 hidden h-px origin-left bg-line-control transition-transform duration-[1600ms] ease-out lg:block ${seen ? 'scale-x-100' : 'scale-x-0'}`} style={{ transitionDelay: '500ms' }} />

          {CAPABILITIES.map(([icon, label], i) => (
            <li key={label} className="group relative lg:pt-9">
              <span aria-hidden="true" className={`strip-node absolute left-0 top-0 hidden h-3 w-3 -translate-y-1/2 rounded-full bg-primary transition-transform duration-500 lg:block ${seen ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: `${700 + i * 220}ms`, animationDelay: `${i * 0.4}s` }} />
              <div className={`transition-all duration-700 ease-out ${seen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`} style={{ transitionDelay: `${800 + i * 160}ms` }}>
                <span className="font-mono text-sm font-bold text-accent">0{i + 1}</span>
                <div className="mt-3 grid h-14 w-14 place-items-center rounded-[1.35rem] border border-line bg-surface text-primary shadow-e1 transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:border-transparent group-hover:bg-primary group-hover:text-on-primary group-hover:shadow-e2">
                  <span style={{ '--d': `${900 + i * 160}ms` }} className="contents"><ToolIcon id={icon} draw className="h-7 w-7" /></span>
                </div>
                <p className="mt-4 text-lg font-semibold leading-snug sm:text-xl">{label}</p>
                <span aria-hidden="true" className="mt-3 block h-0.5 w-0 bg-stripe transition-[width] duration-500 ease-out group-hover:w-12" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
