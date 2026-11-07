import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { availableGroups } from '../tools';
import ToolIcon from './ToolIcon';
import NotchNav from '../landing/NotchNav';
import ChapterTour from '../landing/ChapterTour';
import VideoHero from '../landing/VideoHero';
import PrecisionStrip from '../landing/PrecisionStrip';
import MiniEstimator from '../landing/MiniEstimator';
import { BoqVisual, CadVisual, EstimatorVisual, MaterialsVisual, RebarVisual, ReportVisual, TrackerVisual } from '../landing/visuals';

// Public front page, shown before sign-in. Every button either scrolls to a section or signs in and
// then opens the named page of the app (the hash is set first, so the app lands there after login).
// Preview figures are labelled samples; nothing here claims users, customers, accuracy or savings.
const BuildingScene = lazy(() => import('../landing/BuildingScene'));

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toolCount = availableGroups.reduce((n, g) => n + g.tools.length, 0);

const setRoute = (target) => { window.location.hash = target ? `/${target}` : ''; };

const scrollToId = (id) => (e) => {
  e?.preventDefault();
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
};

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ '--i': delay }} className={`reveal min-w-0 ${seen ? 'is-visible' : ''} ${className}`}>{children}</div>;
}

// CTA that leans a few pixels toward the pointer.
function Magnetic({ className, children, ...rest }) {
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 8}px, ${((e.clientY - r.top) / r.height - 0.5) * 6}px)`;
  };
  const leave = (e) => { e.currentTarget.style.transform = ''; };
  return <button type="button" onMouseMove={move} onMouseLeave={leave} className={`transition-transform duration-200 ${className}`} {...rest}>{children}</button>;
}

const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-md bg-stripe text-black px-6 py-3.5 text-base font-semibold hover:brightness-110 active:brightness-95 shadow-[0_6px_20px_rgb(242_140_40/0.28)]';
const BTN_GHOST = 'inline-flex items-center justify-center gap-2 rounded-md border border-white/55 text-white px-6 py-3.5 text-base font-semibold hover:bg-white/10';

const MODULES = [
  { id: 'estimators', n: '01', title: 'Intelligent Estimators', go: 'estimators', cta: 'Open the estimators', text: 'Calculate construction quantities and material requirements with structured inputs, accurate calculations and transparent cost breakdowns.', visual: <EstimatorVisual /> },
  { id: 'cad', n: '02', title: 'CAD Studio', go: 'cad-studio', cta: 'Open CAD Studio', text: 'Turn engineering drawings into measurable construction workflows with an integrated drafting and material takeoff environment.', visual: <CadVisual /> },
  { id: 'boq', n: '03', title: 'Project BOQ', go: 'project-boq', cta: 'Open Project BOQ', text: 'Organise quantities, material rates, costs, taxes and margins into structured bills of quantities.', visual: <BoqVisual /> },
  { id: 'rebar', n: '04', title: 'BBS Rebar Optimizer', go: 'bbs-optimizer', cta: 'Open the optimizer', text: 'Streamline reinforcement calculations with bar bending schedules, shape codes and stock optimisation.', visual: <RebarVisual /> },
  { id: 'tracker', n: '05', title: 'Project Tracker', go: 'project-tracker', cta: 'Open Project Tracker', text: 'Monitor project milestones, construction phases, progress and site activities from a unified workspace.', visual: <TrackerVisual /> },
  { id: 'materials', n: '06', title: 'Material Intelligence', go: 'concrete', cta: 'Open the material estimators', text: 'Work across essential construction materials with dedicated estimation workflows for quantities and costs.', visual: <MaterialsVisual /> },
];

const STEPS = [
  ['Enter project dimensions', 'Length, width and thickness, in metric or imperial.'],
  ['Select application and material specifications', 'Grade, mix ratio and wastage.'],
  ['Calculate quantities', 'Cement bags, sand and aggregate, updated as you type.'],
  ['Analyse material costs', 'Add your local rates for a material cost.'],
  ['Generate structured reports', 'Itemised, with GST, and ready to print.'],
];

const WHY = [
  ['Precision-driven estimation', 'Inputs are validated and units are shown on every field, so a blank or zero never turns into a silent wrong answer.'],
  ['Transparent calculation workflows', 'Each estimator has a Math view that lays out the working line by line.'],
  ['Integrated engineering tools', 'Estimators, CAD takeoff, rebar scheduling and mix design sit in one workspace.'],
  ['Structured material costing', 'Quantities carry through to rates, GST and margins in the project BOQ.'],
  ['Connected project workflows', 'Send quantities from an estimator to the BOQ, and from a drawing to a takeoff.'],
  ['Professional reporting', 'Itemised reports that print cleanly and export from the BOQ.'],
];

const AUDIENCE = [
  ['column', 'Civil Engineers', 'Check every quantity against the formula behind it.'],
  ['pen', 'Architects', 'Draft in CAD Studio and read areas and lengths straight off the plan.'],
  ['calc', 'Quantity Surveyors', 'Build a bill of quantities with rates, GST and margins.'],
  ['foundation', 'Construction Contractors', 'Price a trade or a whole job from local rates.'],
  ['land', 'Infrastructure Consultants', 'Earthwork, concrete and reinforcement in one set of tools.'],
  ['clipboard', 'Project Managers', 'Follow phases, milestones and the daily site log.'],
];

function Platform({ go }) {
  return (
    <section id="platform" className="scroll-mt-16 bg-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-8 pt-4 lg:pt-10">
        <Reveal><p className="text-sm font-semibold tracking-[0.14em] uppercase text-accent">One platform, complete control</p></Reveal>
        <Reveal><h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight max-w-3xl">Everything construction estimation needs. In one place.</h2></Reveal>
        <div className="mt-14 space-y-20 lg:space-y-28">
          {MODULES.map((m, i) => (
            <div key={m.id} id={m.id} className="scroll-mt-24 grid lg:grid-cols-12 gap-8 lg:gap-14 items-center">
              <Reveal className={`lg:col-span-5 ${i % 2 ? 'lg:order-2' : ''}`}>
                <span className="font-mono text-5xl font-semibold text-line-control">{m.n}</span>
                <h3 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">{m.title}</h3>
                <p className="mt-3 text-lg">{m.text}</p>
                <button type="button" onClick={() => go(m.go)} className="group mt-5 inline-flex items-center gap-2 text-base font-semibold text-primary underline underline-offset-4">
                  {m.cta} <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </Reveal>
              <Reveal delay={1} className={`lg:col-span-7 ${i % 2 ? 'lg:order-1' : ''}`}>{m.visual}</Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section id="workflow" className="scroll-mt-16 mt-20 bg-sunken">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <Reveal><h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-3xl">From dimensions to detailed estimates.</h2></Reveal>
        <div className="mt-10 grid lg:grid-cols-12 gap-10 items-start">
          <ol className="lg:col-span-4 relative min-w-0">
            <span aria-hidden="true" className="absolute left-[15px] top-3 bottom-3 w-px bg-line-control" />
            {STEPS.map(([t, d], i) => (
              <li key={t} className="relative pl-12 pb-6 last:pb-0">
                <span className="absolute left-0 top-0 grid place-items-center w-8 h-8 rounded-full bg-nav text-on-nav text-sm font-semibold font-mono">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-base font-semibold">{t}</p>
                <p className="text-base">{d}</p>
              </li>
            ))}
          </ol>
          <Reveal className="lg:col-span-8"><MiniEstimator /></Reveal>
        </div>
      </div>
    </section>
  );
}

const LAYERS = [
  ['Concrete volume', 'Slab and column volume from length × width × thickness.'],
  ['Reinforcement', 'Bar weight and cutting from the bending schedule.'],
  ['Masonry quantities', 'Brick count and mortar, net of openings.'],
  ['Material layers', 'Cement, sand and aggregate split by mix ratio.'],
];

function Visual() {
  const sec = useRef(null);
  const explode = useRef(0);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = sec.current;
    if (!el) return undefined;
    const scroller = el.closest('.landing-scroll') || window;
    const update = () => {
      const r = el.getBoundingClientRect();
      const p = clamp01((window.innerHeight - r.top) / (window.innerHeight + r.height));
      explode.current = clamp01((p - 0.35) / 0.3);
      el.style.setProperty('--p', p.toFixed(3));
    };
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '100% 0px' });
    io.observe(el);
    update();
    return () => { scroller.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); io.disconnect(); };
  }, []);
  return (
    <section ref={sec} id="visual" aria-labelledby="visual-h" className="relative bg-nav-deep text-white overflow-hidden" style={{ '--p': 0 }}>
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgb(var(--c-tint)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-tint)) 1px, transparent 1px)', backgroundSize: '40px 40px', transform: 'translateY(calc((var(--p) - 0.5) * -60px))' }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 lg:py-28">
        <Reveal><h2 id="visual-h" className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight max-w-3xl">See the structure. Understand the quantities.</h2></Reveal>
        <div className="mt-10 grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 relative h-[26rem] sm:h-[34rem] lg:h-[40rem] -mx-4 sm:mx-0">
            {near && <Suspense fallback={null}><BuildingScene className="absolute inset-0" explodeRef={explode} rotate={false} distance={34} /></Suspense>}
          </div>
          <ul className="lg:col-span-4 space-y-4" style={{ transform: 'translateY(calc((var(--p) - 0.5) * -36px))' }}>
            {LAYERS.map(([t, d], i) => (
              <li key={t} className="border-l-[3px] border-stripe pl-4">
                <Reveal delay={i}><p className="text-lg font-semibold">{t}</p><p className="text-base">{d}</p></Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section id="why" className="scroll-mt-16 bg-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 lg:py-28">
        <Reveal><h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">Built around the way construction actually works.</h2></Reveal>
        <ol className="mt-12 grid md:grid-cols-2 gap-x-16">
          {WHY.map(([t, d], i) => (
            <li key={t} className={`border-t border-line-control py-7 ${i % 2 ? 'md:mt-14' : ''}`}>
              <Reveal delay={i % 2}>
                <div className="flex gap-5">
                  <span className="font-mono text-4xl font-semibold text-primary leading-none">{String(i + 1).padStart(2, '0')}</span>
                  <div><h3 className="text-xl font-semibold">{t}</h3><p className="mt-2 text-base">{d}</p></div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Reporting({ go }) {
  return (
    <section id="reporting" className="scroll-mt-16 bg-nav text-on-nav">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 lg:py-28 grid lg:grid-cols-12 gap-12 items-center">
        <Reveal className="lg:col-span-5">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Every calculation deserves a professional report.</h2>
          <p className="mt-4 text-lg">Project information, material quantities, an itemised BOQ with unit rates, the tax breakdown and the total, laid out as a document you can print or save as PDF.</p>
          <Magnetic className={`${BTN_PRIMARY} mt-7`} onClick={() => go('project-boq')}>Explore Reporting <span aria-hidden="true">→</span></Magnetic>
        </Reveal>
        <Reveal delay={1} className="lg:col-span-7"><div className="lg:rotate-1"><ReportVisual /></div></Reveal>
      </div>
    </section>
  );
}

function Audience({ go }) {
  return (
    <section id="audience" className="scroll-mt-16 bg-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20 lg:py-28">
        <Reveal><h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Who is CivisMetric for?</h2></Reveal>
        <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-line-control">
          {AUDIENCE.map(([icon, name, text]) => (
            <li key={name} className="border-b border-r border-line-control">
              <button type="button" onClick={() => go('estimators')} className="group h-full w-full text-left p-6 transition-colors duration-200 hover:bg-nav hover:text-on-nav">
                <ToolIcon id={icon} className="w-8 h-8 text-primary group-hover:text-stripe transition-colors" />
                <p className="mt-4 text-xl font-semibold">{name}</p>
                <p className="mt-1 text-base">{text}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta({ onSignIn, go }) {
  return (
    <section className="relative overflow-hidden bg-nav-deep text-white">
      <img src="/house.webp" alt="" aria-hidden="true" loading="lazy" width="800" height="600" className="absolute right-0 top-0 h-full w-auto max-w-none opacity-30 mix-blend-screen invert hue-rotate-180 pointer-events-none" />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgb(var(--c-nav-deep)) 35%, transparent 90%)' }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-24 lg:py-32">
        <Reveal>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">Build smarter.<br />Estimate with confidence.</h2>
          <p className="mt-5 text-lg sm:text-xl max-w-xl">Bring your construction estimation, material calculations and project workflows together with CivisMetric.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Magnetic className={BTN_PRIMARY} onClick={() => onSignIn()}>Get Started Today <span aria-hidden="true">→</span></Magnetic>
            <Magnetic className={BTN_GHOST} onClick={() => go('estimators')}>Explore Estimators</Magnetic>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer({ go }) {
  const col = 'text-sm font-semibold tracking-[0.12em] uppercase';
  const item = 'block py-1 text-base hover:underline underline-offset-4 text-left';
  return (
    <footer className="bg-nav-deep text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <img src="/logo-dark.webp" alt="CivisMetric" width="900" height="229" loading="lazy" className="h-12 w-auto" />
          <p className="mt-3 text-base">Material Estimation Platform</p>
          <p className="mt-1 text-sm">{toolCount} estimators across {availableGroups.length} trades, with CAD Studio and a project BOQ.</p>
        </div>
        <nav aria-label="Platform" className="md:col-span-4">
          <p className={col}>Platform</p>
          <ul className="mt-3">
            {[['Dashboard', ''], ['All Estimators', 'estimators'], ['CAD Studio', 'cad-studio'], ['Project BOQ', 'project-boq'], ['Project Tracker', 'project-tracker']].map(([l, t]) => (
              <li key={l}><button type="button" onClick={() => go(t)} className={item}>{l}</button></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="On this page" className="md:col-span-3">
          <p className={col}>Explore</p>
          <ul className="mt-3">
            {[['Platform modules', 'platform'], ['Estimation workflow', 'workflow'], ['Reporting', 'reporting'], ['Who it is for', 'audience']].map(([l, id]) => (
              <li key={l}><a href={`#${id}`} onClick={scrollToId(id)} className={item}>{l}</a></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15"><p className="mx-auto max-w-7xl px-4 sm:px-6 py-5 text-sm">© CivisMetric. All rights reserved.</p></div>
    </footer>
  );
}

// Which nav tab a section belongs to, for highlighting while you scroll.
const SECTION_TAB = { tour: 'platform', platform: 'platform', workflow: 'resources', visual: 'platform', why: 'features', reporting: 'resources', audience: 'solutions' };

export default function LandingPage({ onSignIn }) {
  const [activeTab, setActiveTab] = useState(null);
  // Open a page of the app after sign-in: set the route first, then show the login screen.
  const go = (target) => { setRoute(target); onSignIn(); };
  const jump = (id) => () => scrollToId(id)();

  const onScroll = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    let current = null;
    for (const id of Object.keys(SECTION_TAB)) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top - box.top <= box.height * 0.35) current = SECTION_TAB[id];
    }
    setActiveTab(current);
  };

  const items = [
    { id: 'platform', label: 'Platform', menu: MODULES.map((m) => ({ label: m.title, onSelect: jump(m.id) })) },
    { id: 'estimators', label: 'Estimators', menu: [{ label: 'All estimators', onSelect: () => go('estimators') }, ...availableGroups.map((g) => ({ label: `${g.group} (${g.tools.length})`, onSelect: () => go(g.tools[0].id) }))] },
    { id: 'solutions', label: 'Solutions', onSelect: jump('audience') },
    { id: 'features', label: 'Features', onSelect: jump('why') },
    { id: 'resources', label: 'Resources', menu: [{ label: 'Estimation workflow', onSelect: jump('workflow') }, { label: 'Reporting', onSelect: jump('reporting') }] },
  ];
  const mobileItems = [
    { label: 'Platform', onSelect: jump('platform') }, { label: 'Estimation workflow', onSelect: jump('workflow') },
    { label: 'Solutions', onSelect: jump('audience') }, { label: 'Features', onSelect: jump('why') },
    { label: 'Reporting', onSelect: jump('reporting') }, { label: 'All estimators', onSelect: () => go('estimators') },
  ];

  return (
    <div className="fixed inset-0 bg-nav p-0 md:p-2">
      <div className="relative h-full overflow-hidden bg-bg md:rounded-2xl">
        <NotchNav
          items={items}
          mobileItems={mobileItems}
          activeId={activeTab}
          logo={<img src="/logo-dark.webp" alt="" width="900" height="229" className="h-8 w-auto" />}
          logoMark={<img src="/logo-mark-dark.webp" alt="" width="256" height="256" className="h-7 w-7 object-contain" />}
          onHome={jump('top')}
          onSignIn={() => onSignIn()}
        />
        <div className="landing-scroll absolute inset-0 overflow-y-auto overflow-x-hidden text-ink" onScroll={onScroll}>
          <main>
            <VideoHero onExplore={jump('platform')} onDemo={jump('workflow')} />
            <PrecisionStrip />
            <ChapterTour go={go} />
            <Platform go={go} />
            <Workflow />
            <Visual />
            <Why />
            <Reporting go={go} />
            <Audience go={go} />
            <FinalCta onSignIn={onSignIn} go={go} />
          </main>
          <Footer go={go} />
        </div>
      </div>
    </div>
  );
}
