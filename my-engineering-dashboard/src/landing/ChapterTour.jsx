import { useEffect, useRef, useState } from 'react';
import { CadVisual, EstimatorVisual, ReportVisual } from './visuals';
import ToolIcon from '../components/ToolIcon';

// Platform tour: icon tabs joined to a card by a curved stem (the active tab flows into the card).
// It advances by itself every 5 seconds (a ring around the active tab shows the countdown), pauses while
// the pointer or keyboard focus is inside or the section is off screen, and the tabs and arrows work as
// plain controls. No animation library: the stem is two SVG fillets, the timer is a CSS animation.
const CHAPTERS = [
  {
    id: '01', label: 'Measure', icon: 'cad-studio', title: 'Draw it to scale.', go: 'cad-studio', cta: 'Open CAD Studio',
    text: 'Sketch walls, columns and slabs on a snap grid. Lengths, areas and volumes are taken off as you draw.',
    visual: <CadVisual />,
  },
  {
    id: '02', label: 'Estimate', icon: 'material-cost', title: 'Every quantity, with the workings.', go: 'estimators', cta: 'Browse the estimators',
    text: 'Enter dimensions and local rates. Each result shows the calculation behind it, line by line.',
    visual: <EstimatorVisual />,
  },
  {
    id: '03', label: 'Report', icon: 'project-boq', title: 'Hand over a clean report.', go: 'project-boq', cta: 'Open Project BOQ',
    text: 'Collect quantities into a bill of quantities with GST and margins, then print or save it.',
    visual: <ReportVisual />,
  },
];

// The two concave fillets where the stem meets the card's top edge.
const Fillet = ({ side }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className={`absolute bottom-0 size-4 text-bg ${side === 'left' ? 'right-full' : 'left-full'}`}>
    <path d={side === 'left' ? 'M20 0 V20 H0 C11 20 20 11 20 0 Z' : 'M0 0 V20 H20 C9 20 0 11 0 0 Z'} fill="currentColor" />
  </svg>
);

const Chevron = ({ dir }) => (
  <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></svg>
);

export default function ChapterTour({ go }) {
  const sec = useRef(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);
  // Reduced-motion visitors get no automatic changes (and no timer ring).
  const [auto] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const el = sec.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const jumpTo = (i) => setActive((i + CHAPTERS.length) % CHAPTERS.length);
  const running = inView && !held;

  const c = CHAPTERS[active];

  return (
    <section ref={sec} id="tour" aria-label="Platform tour in three chapters" className="relative scroll-mt-16">
      <div className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(180deg, #7d8fe3 0%, #a79bee 36%, #d98fe2 70%, #f6b4a0 100%)' }}>
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

        <div className="relative mx-auto flex max-w-5xl flex-col justify-center px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20" onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
          {/* Icon tabs */}
          <div className="mx-auto flex items-center gap-2 pb-4">
            <button type="button" aria-label="Previous chapter" onClick={() => jumpTo(active - 1)} className="group grid h-9 w-9 place-items-center rounded-full">
              <span className="transition-transform duration-150 group-hover:-translate-x-1"><Chevron dir="left" /></span>
            </button>
            <div role="tablist" aria-label="Platform chapters" className="flex items-end gap-2">
              {CHAPTERS.map((ch, i) => {
                const on = i === active;
                return (
                  <div key={ch.id} className="relative">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={on}
                      aria-label={`${ch.id} ${ch.label}`}
                      onClick={() => jumpTo(i)}
                      className={`relative z-10 grid h-12 w-12 place-items-center rounded-[1.15rem] border transition-all duration-300 ease-out sm:h-14 sm:w-14 sm:rounded-[1.35rem] ${on ? 'border-transparent bg-bg text-ink' : 'border-white/60 bg-white/25 text-white hover:bg-white/40'}`}
                    >
                      <ToolIcon id={ch.icon} className="h-6 w-6" />
                    </button>
                    {on && auto && (
                      <svg aria-hidden="true" viewBox="0 0 64 64" className="pointer-events-none absolute -inset-1 z-20 h-[calc(100%+8px)] w-[calc(100%+8px)]">
                        <rect key={`${active}`} className="tour-timer" x="2" y="2" width="60" height="60" rx="22" fill="none" stroke="#4b3fb8" strokeWidth="3" strokeLinecap="round" pathLength="1" style={{ animationPlayState: running ? 'running' : 'paused' }} onAnimationEnd={() => jumpTo(active + 1)} />
                      </svg>
                    )}
                    {on && (
                      <span aria-hidden="true" className="hero-rise absolute inset-x-0 top-full z-0 mx-auto h-4 w-7 bg-bg" style={{ animationDuration: '0.35s' }}>
                        <Fillet side="left" />
                        <Fillet side="right" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" aria-label="Next chapter" onClick={() => jumpTo(active + 1)} className="group grid h-9 w-9 place-items-center rounded-full">
              <span className="transition-transform duration-150 group-hover:translate-x-1"><Chevron dir="right" /></span>
            </button>
          </div>

          {/* Card */}
          <div role="tabpanel" aria-label={c.label} className="min-h-0 overflow-hidden rounded-3xl bg-bg p-5 text-ink shadow-[0_28px_60px_-20px_rgb(80_60_160/0.45)] sm:p-8">
            <div key={c.id} className="hero-rise grid items-center gap-5 md:grid-cols-[1fr_1.15fr] md:gap-8">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#b8a4f2] text-ink"><ToolIcon id={c.icon} className="h-5 w-5" /></span>
                  <span className="text-base font-semibold">{c.label}</span>
                  <span className="rounded-md bg-[#efeafb] px-2 py-0.5 text-sm font-semibold">{c.id} / 0{CHAPTERS.length}</span>
                </div>
                <h2 className="mt-4 text-3xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">{c.title}</h2>
                <p className="mt-3 max-w-md text-base sm:text-lg">{c.text}</p>
                <button type="button" onClick={() => go(c.go)} className="group mt-5 inline-flex items-center gap-2 border-b-2 border-ink pb-1 text-base font-semibold">
                  {c.cta} <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </div>
              <div className="min-w-0 rounded-2xl bg-[#e9e2fa] p-3 sm:p-5">
                <div className="origin-top scale-[0.92] sm:scale-100">{c.visual}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
