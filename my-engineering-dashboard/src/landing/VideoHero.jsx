import { useEffect, useRef, useState } from 'react';
import ToolIcon from '../components/ToolIcon';
import { availableGroups } from '../tools';

// Scroll-driven video hero (adapted from a scroll-triggered video hero component). The footage stays
// pinned while three full-screen slides scroll up over it: each slide fades and drifts with the scroll
// position, and the footage slowly pushes in. No animation library. Without the footage file the stage
// falls back to a dark grid. Footage: public/videos/construction-promo.webm.
const toolCount = availableGroups.reduce((n, g) => n + g.tools.length, 0);

const CHAPTERS = [
  { lead: 'Every', word: 'Measurement.', label: 'Measure', text: 'Take lengths, areas and volumes from your dimensions or straight off a CAD drawing, with the workings shown.' },
  { lead: 'Every', word: 'Material.', label: 'Material', text: 'Cement, sand, aggregate, bricks, concrete and steel, each calculated from your own local rates.' },
  { lead: 'Every', word: 'Project.', label: 'Project', text: 'Roll everything into a bill of quantities with GST and margins, ready to print or save.' },
];

const CHIPS = [
  ['calc', 'Workings shown'],
  ['area', 'Metric and imperial'],
  ['clipboard', 'Print-ready reports'],
  ['estimators', `${toolCount} estimators`],
];

const GRAIN = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export default function VideoHero({ onExplore, onDemo }) {
  const sec = useRef(null);
  const videoRef = useRef(null);
  const slideRefs = useRef([]);
  const pillRef = useRef(null);
  const [active, setActive] = useState(0);
  // The footage is optional: if the file is missing the stage keeps its dark grid.
  const [videoOk, setVideoOk] = useState(true);

  // Scroll progress through the section picks the slide and drives --p (push-in, ring).
  useEffect(() => {
    const el = sec.current;
    if (!el) return undefined;
    const scroller = el.closest('.landing-scroll') || window;
    const update = () => {
      const r = el.getBoundingClientRect();
      const view = scroller === window ? window.innerHeight : scroller.clientHeight;
      const p = clamp01(-r.top / Math.max(1, r.height - view));
      el.style.setProperty('--p', p.toFixed(3));
      setActive(Math.min(CHAPTERS.length - 1, Math.floor(p * CHAPTERS.length)));
      // Each slide fades and drifts as it moves away from the middle of the screen. Positions come from the
      // section, not from the slide itself, so the drift can't feed back into the measurement.
      const base = r.top - (scroller === window ? 0 : scroller.getBoundingClientRect().top);
      // The pill fades out as the hero scrolls away, so it never trails over the next section.
      if (pillRef.current) pillRef.current.style.opacity = clamp01((r.bottom - (scroller === window ? 0 : scroller.getBoundingClientRect().top) - view * 0.2) / (view * 0.3)).toFixed(3);
      slideRefs.current.forEach((node, i) => {
        if (!node) return;
        const h = node.offsetHeight;
        const d = (base + i * h + h / 2 - view / 2) / view;
        node.style.opacity = clamp01(1 - Math.abs(d) * 1.7).toFixed(3);
        node.style.transform = `translateY(${(d * 70).toFixed(1)}px)`;
      });
    };
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => { scroller.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Play only while on screen, and not at all for reduced-motion users.
  useEffect(() => {
    const el = sec.current;
    const v = videoRef.current;
    if (!el || !v) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { v.pause(); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [videoOk]);

  const jumpTo = (i) => {
    const el = sec.current;
    const scroller = el?.closest('.landing-scroll');
    if (!el || !scroller) return;
    const travel = el.offsetHeight - scroller.clientHeight;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: top + travel * ((i + 0.5) / CHAPTERS.length) });
  };

  const c = CHAPTERS[active];

  return (
    <section ref={sec} id="top" aria-label="CivisMetric" className="relative" style={{ height: `${CHAPTERS.length * 100}svh`, '--p': 0 }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-nav-deep text-white md:h-[calc(100svh-1rem)]">
        {/* Footage, pushed in as you scroll */}
        {videoOk ? (
          <video
            ref={videoRef}
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
            style={{ transform: 'scale(calc(1.02 + var(--p) * 0.14))' }}
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setVideoOk(false)}
          >
            <source src="/videos/construction-promo.webm" type="video/webm" onError={() => setVideoOk(false)} />
          </video>
        ) : (
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgb(var(--c-tint)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-tint)) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        )}
        {/* Light veil so the footage stays clear: an even tint plus a little extra on the text side */}
        <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      </div>

      {/* Slides scroll over the pinned footage */}
      <div className="absolute inset-0 z-10 text-white">
        <div ref={pillRef} className="sticky top-[calc(100svh-5.5rem)] z-20 h-0 md:top-[calc(100svh-6.5rem)]">
            {/* Slide pill: dots jump between slides, the ring shows progress through the hero */}
            <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-black/55 py-2 pl-6 pr-2 backdrop-blur-md sm:left-auto sm:right-6 sm:translate-x-0">
              <div className="flex flex-col">
                <span className="whitespace-nowrap text-xs uppercase tracking-widest">Scroll · {active + 1} / {CHAPTERS.length}</span>
                <span className="min-w-[5.5rem] text-sm font-bold">{c.label}</span>
              </div>
              <div className="flex items-center gap-1.5" role="group" aria-label="Jump to slide">
                {CHAPTERS.map((ch, i) => (
                  <button key={ch.label} type="button" aria-label={`${ch.lead} ${ch.word}`} aria-current={i === active ? 'true' : undefined} onClick={() => jumpTo(i)} className={`h-2.5 rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-stripe' : 'w-2.5 bg-white/40 hover:bg-white/70'}`} style={{ minHeight: 0 }} />
                ))}
              </div>
              <svg aria-hidden="true" className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="18" fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="2.5" />
                <circle cx="24" cy="24" r="18" fill="none" stroke="rgb(var(--c-stripe))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="113" style={{ strokeDashoffset: 'calc(113px * (1 - var(--p, 0)))' }} />
              </svg>
            </div>

        </div>

        {CHAPTERS.map((c, i) => (
          <div key={c.label} ref={(node) => { slideRefs.current[i] = node; }} className="flex h-[100svh] items-center will-change-transform" style={{ opacity: i === 0 ? 1 : 0 }}>
            <div className="mx-auto w-full max-w-7xl px-5 pt-20 sm:px-8">
              <span aria-hidden="true" className="mb-5 block h-1 w-16 rounded-full" style={{ background: 'linear-gradient(90deg, #ffb066, #f28c28)' }} />
              <h2 className="font-display font-bold uppercase leading-[0.9] tracking-[0.01em] text-white" style={{ fontSize: 'clamp(2.8rem, min(11vw, 17vh), 8rem)' }}>
                <span className="block font-mono text-[0.22em] font-bold tracking-[0.3em] text-stripe">{c.lead}</span>
                <span className="text-sheen block">{c.word}</span>
              </h2>

              <div className="mt-5 max-w-2xl rounded-2xl border border-white/25 bg-white/10 p-4 text-white backdrop-blur-md sm:p-5">
                <span className="block font-mono text-xs font-bold uppercase tracking-[0.22em] text-sheen-soft sm:text-sm">0{i + 1} · {c.label}</span>
                <span className="mt-1.5 block text-lg font-medium leading-snug sm:text-xl md:text-2xl">{c.text}</span>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" onClick={onExplore} className="btn-glass-orange inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-black transition active:scale-[0.98]">Explore the Platform <span aria-hidden="true">→</span></button>
                <button type="button" onClick={onDemo} className="btn-glass-clear inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white transition active:scale-[0.98]">View Platform Demo</button>
              </div>

              {i === 0 && (
                <ul className="mt-6 hidden flex-wrap items-center gap-x-6 gap-y-2 text-white md:flex">
                  {CHIPS.map(([icon, label]) => (
                    <li key={label} className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                      <ToolIcon id={icon} className="h-[18px] w-[18px]" />
                      {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
