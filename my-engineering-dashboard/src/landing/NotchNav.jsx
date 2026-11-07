import { useEffect, useRef, useState } from 'react';

// "Notch" navigation (adapted from an adaptive notch nav component): the logo, the menu and the
// actions hang from the top edge of the page card as three tabs joined to the frame by curved wings.
// Below lg they collapse into one centred island with a dropdown. It is written without extra
// dependencies: the sliding active pill is measured with refs and animated with a CSS transition.
const WING_PATH = {
  left: 'M 0 0 C 11.046 0 20 8.954 20 20 H 21 V -1 H 0 Z',
  right: 'M 20 0 C 8.954 0 0 8.954 0 20 H -1 V -1 H 20 Z',
  cornerLeft: 'M 0 0 H 20 C 8.954 0 0 8.954 0 20 V 0 Z',
  cornerRight: 'M 20 0 H 0 C 11.046 0 20 8.954 20 20 V 0 Z',
};
const WING_POS = {
  left: 'right-full top-0',
  right: 'left-full top-0',
  cornerLeft: 'left-0 top-full',
  cornerRight: 'right-0 top-full',
};

const Wing = ({ kind }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" shapeRendering="geometricPrecision" className={`pointer-events-none absolute ${WING_POS[kind]} size-3 md:size-4 overflow-visible text-nav`}>
    <path d={WING_PATH[kind]} fill="currentColor" />
  </svg>
);

const Chevron = ({ open }) => (
  <svg aria-hidden="true" className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
);

function MenuPopover({ items, onPick }) {
  return (
    <div className="absolute left-1/2 top-full z-10 -translate-x-1/2 pt-3">
      <ul role="menu" className="page-enter min-w-[15rem] rounded-xl border border-white/15 bg-nav py-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.4)]">
        {items.map((it) => (
          <li key={it.label} role="none">
            <button type="button" role="menuitem" onClick={() => onPick(it)} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10">{it.label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param items        [{ id, label, onSelect?, menu?: [{ label, onSelect }] }] centre tabs
 * @param mobileItems  [{ label, onSelect }] flat list for the compact dropdown
 * @param activeId     id of the tab to highlight (null for none)
 */
export default function NotchNav({ items, mobileItems, activeId, logo, logoMark, onHome, onSignIn }) {
  const barRef = useRef(null);
  const pillRef = useRef(null);
  const tabRefs = useRef({});
  const wrapRef = useRef(null);
  const [openId, setOpenId] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const closeTimer = useRef(0);
  const openMenu = (id) => { clearTimeout(closeTimer.current); setOpenId(id); };
  const closeMenuSoon = () => { clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpenId(null), 160); };

  // Slide the pill under the active tab.
  useEffect(() => {
    const place = () => {
      const bar = barRef.current;
      const pill = pillRef.current;
      const tab = activeId ? tabRefs.current[activeId] : null;
      if (!bar || !pill) return;
      if (!tab) { pill.style.opacity = '0'; return; }
      const b = bar.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      pill.style.opacity = '1';
      pill.style.width = `${t.width}px`;
      pill.style.transform = `translateX(${t.left - b.left}px)`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [activeId, items]);

  // Close menus on outside press or Escape.
  useEffect(() => {
    if (openId === null && !drawer) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) { setOpenId(null); setDrawer(false); } };
    const onKey = (e) => { if (e.key === 'Escape') { setOpenId(null); setDrawer(false); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [openId, drawer]);

  const pick = (it) => { clearTimeout(closeTimer.current); setOpenId(null); setDrawer(false); it.onSelect(); };
  const activeLabel = items.find((i) => i.id === activeId)?.label || 'Menu';

  return (
    <div ref={wrapRef}>
      {/* Desktop: three tabs */}
      <aside aria-label="Brand" className="hidden lg:flex absolute left-0 top-0 z-50 h-10 items-center rounded-br-[24px] bg-nav px-5">
        <a href="#top" onClick={(e) => { e.preventDefault(); onHome(); }} aria-label="CivisMetric, back to top" className="flex items-center">{logo}</a>
        <Wing kind="right" />
        <Wing kind="cornerLeft" />
      </aside>

      <nav aria-label="Primary" className="hidden lg:flex absolute left-1/2 top-0 z-50 h-11 -translate-x-1/2 items-start rounded-b-[24px] bg-nav px-4 text-white">
        <Wing kind="left" />
        <Wing kind="right" />
        <div ref={barRef} className="relative flex items-center gap-1 pt-1">
          <span ref={pillRef} aria-hidden="true" className="absolute left-0 top-1 h-9 rounded-full bg-white/15 opacity-0 transition-[transform,width,opacity] duration-300 ease-out" style={{ width: 0 }} />
          {items.map((it) => {
            const active = it.id === activeId;
            return (
              <div key={it.id} className="relative" onMouseEnter={() => it.menu && openMenu(it.id)} onMouseLeave={() => it.menu && closeMenuSoon()}>
                <button
                  ref={(el) => { tabRefs.current[it.id] = el; }}
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  aria-haspopup={it.menu ? 'true' : undefined}
                  aria-expanded={it.menu ? openId === it.id : undefined}
                  onClick={() => (it.menu ? openMenu(it.id) : it.onSelect())}
                  className={`relative z-10 flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors hover:bg-white/10 ${active ? 'font-semibold' : 'font-medium'}`}
                >
                  {it.label}
                  {it.menu && <Chevron open={openId === it.id} />}
                </button>
                {it.menu && openId === it.id && <MenuPopover items={it.menu} onPick={pick} />}
              </div>
            );
          })}
        </div>
      </nav>

      <aside aria-label="Account" className="hidden lg:flex absolute right-0 top-0 z-50 h-10 items-center gap-2 rounded-bl-[24px] bg-nav pl-5 pr-5 text-white">
        <Wing kind="left" />
        <Wing kind="cornerRight" />
        <button type="button" onClick={onSignIn} className="rounded-full bg-stripe px-5 py-1.5 text-sm font-semibold text-black hover:brightness-110">Sign in</button>
      </aside>

      {/* Below lg: one island with a dropdown */}
      <div className="lg:hidden absolute left-1/2 top-0 z-50 -translate-x-1/2 rounded-b-[24px] bg-nav px-4 text-white" style={{ width: 'min(92vw, 24rem)' }}>
        <Wing kind="left" />
        <Wing kind="right" />
        <div className="flex h-10 items-center justify-between gap-2">
          <a href="#top" onClick={(e) => { e.preventDefault(); setDrawer(false); onHome(); }} aria-label="CivisMetric, back to top" className="flex shrink-0 items-center">{logoMark}</a>
          <button type="button" aria-expanded={drawer} aria-label="Toggle navigation menu" onClick={() => setDrawer(!drawer)} className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold hover:bg-white/10">
            <span className="truncate">{activeLabel}</span>
            <Chevron open={drawer} />
          </button>
          <button type="button" onClick={onSignIn} className="shrink-0 rounded-full bg-stripe px-3.5 py-1 text-sm font-semibold text-black hover:brightness-110">Sign in</button>
        </div>
        <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${drawer ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <ul className="flex flex-col gap-0.5 pb-3 pt-1.5" role="list">
              {mobileItems.map((it) => (
                <li key={it.label}>
                  <button type="button" onClick={() => pick(it)} tabIndex={drawer ? 0 : -1} className="w-full rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-white/10">{it.label}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
