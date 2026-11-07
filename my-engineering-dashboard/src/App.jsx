import React, { Suspense, startTransition, useEffect, useEffectEvent, useRef, useState } from 'react';
import { availableGroups, findTool, headingFor } from './tools';
import EstimatorIndex from './components/EstimatorIndex';
import Dashboard from './components/Dashboard';
import CommandPalette from './components/CommandPalette';
import { pushRecent } from './lib/recentTools';
import { initials, displayName, readUser, saveUser } from './lib/user';
import CalculatorFrame from './components/CalculatorFrame';
import ToolIcon from './components/ToolIcon';
import LoginPage from './components/LoginPage.jsx';
import LandingPage from './components/LandingPage.jsx';
import KineticGrid from './components/KineticGrid.jsx';
import { useUnit } from './context/UnitContext.jsx';
import { useCad } from './context/CadContext.jsx';

const readTheme = () => {
  try { return localStorage.getItem('civismetric-theme') === 'dark'; } catch { return false; }
};

// The login screen is a front door, not authentication; remembering it for the browser session
// spares a re-login on every reload.
const readSignedIn = () => {
  try { return sessionStorage.getItem('civismetric-signed-in') === '1'; } catch { return false; }
};

const readCollapsed = () => {
  try { return localStorage.getItem('civismetric-nav-collapsed') === '1'; } catch { return false; }
};

const readRoute = () => window.location.hash.replace(/^#\/?/, '');

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const Chevron = ({ className = '' }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
);

const Glyph = ({ d, className = 'w-[18px] h-[18px]' }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const MOON = 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z';
const SUN = 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4';
const SIGN_OUT = 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9';
const COLLAPSE = 'M11 6l-6 6 6 6M19 6l-6 6 6 6';

// Brand: full wordmark on a white plate when open, the mark alone when collapsed
// (the white plate keeps the logo's own colours legible on navy).
// The same transparent logo as the landing page (it carries the "Material Estimation Platform" line itself).
const Wordmark = ({ collapsed, onClick }) => (
  <button type="button" onClick={onClick} aria-label="CivisMetric, go to Dashboard" className={`block w-full rounded-md text-left transition-opacity duration-150 hover:opacity-90 ${collapsed ? 'flex justify-center' : 'px-1'}`}>
    {collapsed ? (
      <img src="/logo-mark-dark.webp" alt="CivisMetric" width="256" height="256" className="h-10 w-10 object-contain" />
    ) : (
      <img src="/logo-dark.webp" alt="" width="900" height="229" className="h-auto w-full max-w-[220px]" />
    )}
  </button>
);

// One navigation row. Collapsed rows are icon-only with a tooltip (hover and keyboard focus).
const NavItem = ({ id, icon, label, active, onSelect, indent = false, collapsed = false, itemRef }) => (
  <li>
    <button
      ref={itemRef}
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={`nav-tip relative w-full text-left text-sm rounded-md transition-colors duration-150 flex items-center ${
        collapsed ? 'justify-center h-10' : indent ? 'gap-2 py-1.5 pl-3 pr-3 text-[0.9375rem] font-normal' : 'gap-3 px-3 py-2'
      } ${active ? 'bg-white/15 text-on-nav font-semibold ring-1 ring-inset ring-white/10' : 'text-on-nav hover:bg-white/10'}`}
    >
      {active && <span aria-hidden="true" className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-stripe" />}
      {!indent && <ToolIcon id={icon ?? id} className="w-[18px] h-[18px] shrink-0" />}
      {!collapsed && label}
      {collapsed && <span className="nav-tip-label" aria-hidden="true">{label}</span>}
    </button>
  </li>
);

const GroupToggle = ({ group, icon, count, open, active, collapsed, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={collapsed ? undefined : open}
    aria-controls={collapsed ? undefined : `nav-${slug(group)}`}
    aria-label={collapsed ? group : undefined}
    className={`nav-tip relative w-full text-left text-sm rounded-md flex items-center transition-colors duration-150 hover:bg-white/10 text-on-nav text-[1rem] font-bold ${collapsed ? 'justify-center h-10' : 'gap-2.5 px-3 py-2'} ${collapsed && active ? 'bg-white/15' : ''}`}
  >
    <ToolIcon id={icon} className="w-[18px] h-[18px] shrink-0" />
    {!collapsed && <span className="flex-1 whitespace-nowrap">{group}</span>}
    {!collapsed && <span className="min-w-[1.35rem] rounded-full bg-white/15 px-1.5 text-center text-xs font-semibold tabular-nums">{count}</span>}
    {!collapsed && <Chevron className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />}
    {collapsed && <span className="nav-tip-label" aria-hidden="true">{group}</span>}
  </button>
);

// Footer actions share one look; the theme control is a real switch.
const FootButton = ({ icon, label, onClick, collapsed, role, checked, children }) => (
  <button
    type="button"
    role={role}
    aria-checked={checked}
    aria-label={collapsed ? label : undefined}
    onClick={onClick}
    className={`nav-tip relative w-full rounded-md text-sm text-on-nav hover:bg-white/10 transition-colors duration-150 flex items-center ${collapsed ? 'justify-center h-10' : 'gap-3 px-3 py-2'}`}
  >
    <Glyph d={icon} className="w-[18px] h-[18px] shrink-0" />
    {!collapsed && <span className="flex-1 text-left">{label}</span>}
    {!collapsed && children}
    {collapsed && <span className="nav-tip-label" aria-hidden="true">{label}</span>}
  </button>
);

const ThemeSwitch = ({ isDark, onToggle, collapsed }) => (
  <FootButton icon={isDark ? SUN : MOON} label="Dark theme" role="switch" checked={isDark} onClick={onToggle} collapsed={collapsed}>
    <span className={`relative block h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 ${isDark ? 'bg-stripe border-stripe' : 'bg-nav-2 border-on-nav/50'}`} aria-hidden="true">
      <span className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.4)] transition-transform duration-200 ease-out ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
    </span>
  </FootButton>
);

const UnitSwitch = () => {
  const { unitSystem, setUnitSystem } = useUnit();
  const option = (value, label) => (
    <button
      type="button"
      role="radio"
      aria-checked={unitSystem === value}
      onClick={() => setUnitSystem(value)}
      className={`px-3 py-1.5 text-sm rounded transition-colors ${unitSystem === value ? 'bg-primary text-on-primary font-medium' : 'text-ink-2 hover:text-ink'}`}
    >
      {label}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Units" className="flex p-0.5 rounded border border-line bg-sunken shrink-0">
      {option('metric', 'Metric')}
      {option('imperial', 'Imperial')}
    </div>
  );
};

const SideNav = ({ route, onNavigate, isDark, onToggleTheme, onSignOut, firstItemRef, isGroupOpen, onToggleGroup, collapsed = false, onToggleCollapse, onExpandGroup }) => (
  <div className="side-glass h-full flex flex-col text-on-nav border-r border-white/10">
    <div className={`pt-5 pb-4 border-b border-white/10 ${collapsed ? 'px-2' : 'px-3'}`}>
      <Wordmark collapsed={collapsed} onClick={() => onNavigate('')} />
    </div>
    <nav aria-label="Main" className={`flex-1 py-3 ${collapsed ? 'px-2 overflow-visible' : 'px-3 overflow-y-auto custom-scroll'}`}>
      <ul className="space-y-0.5">
        <NavItem id="" label="Dashboard" collapsed={collapsed} active={route === '' || (!findTool(route) && route !== 'estimators')} onSelect={() => onNavigate('')} itemRef={firstItemRef} />
        <NavItem id="estimators" label="All estimators" collapsed={collapsed} active={route === 'estimators'} onSelect={() => onNavigate('estimators')} />
      </ul>
      <div className="mt-3 pt-3 border-t border-white/10 space-y-0.5">
        {availableGroups.map(({ group, icon, tools }) => {
          const open = isGroupOpen(group);
          const hasActive = tools.some((t) => t.id === route);
          return (
            <div key={group}>
              <GroupToggle group={group} icon={icon} count={tools.length} open={open} active={hasActive} collapsed={collapsed} onToggle={() => (collapsed ? onExpandGroup(group) : onToggleGroup(group))} />
              {!collapsed && (
                <ul id={`nav-${slug(group)}`} hidden={!open} className="mt-1 mb-2 ml-[1.3rem] space-y-0.5 border-l border-white/25 pl-2">
                  {tools.map((tool) => (
                    <NavItem key={tool.id} id={tool.id} label={tool.label} indent active={route === tool.id} onSelect={() => onNavigate(tool.id)} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
    <div className={`py-3 border-t border-white/10 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
      <ThemeSwitch isDark={isDark} onToggle={onToggleTheme} collapsed={collapsed} />
      <FootButton icon={SIGN_OUT} label="Sign out" onClick={onSignOut} collapsed={collapsed} />
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-pressed={collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`nav-tip relative hidden lg:flex w-full rounded-md text-sm text-on-nav hover:bg-white/10 transition-colors duration-150 items-center ${collapsed ? 'justify-center h-10' : 'gap-3 px-3 py-2'}`}
        >
          <Glyph d={COLLAPSE} className={`w-[18px] h-[18px] shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
          {collapsed && <span className="nav-tip-label" aria-hidden="true">Expand sidebar</span>}
        </button>
      )}
    </div>
  </div>
);


const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
);

const SearchIcon = ({ className = 'w-4 h-4' }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);

const UserChip = ({ userId }) => {
  const name = displayName(userId);
  return (
    <div className="flex items-center gap-2.5 shrink-0" title={userId ? `Signed in as ${userId}` : 'Signed in'}>
      <span aria-hidden="true" className="grid place-items-center w-8 h-8 rounded-full bg-primary text-on-primary text-xs font-semibold">{initials(userId)}</span>
      <span className="hidden md:block leading-tight">
        <span className="block text-sm font-medium text-ink truncate max-w-[9rem]">{name || userId || 'Signed in'}</span>
      </span>
    </div>
  );
};

const App = () => {
  const [signedIn, setSignedIn] = useState(readSignedIn);
  const [userId, setUserId] = useState(readUser);
  const [isDark, setIsDark] = useState(readTheme);
  const [route, setRoute] = useState(readRoute);
  const [showLogin, setShowLogin] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [groupOverride, setGroupOverride] = useState({});
  const menuButtonRef = useRef(null);
  const drawerFirstItemRef = useRef(null);
  const contentRef = useRef(null);
  const paletteOpener = useRef(null);

  const tool = findTool(route);
  const pageTitle = tool ? headingFor(tool) : route === 'estimators' ? 'Estimators' : 'Dashboard';

  // A trade is open if you opened it, or it holds the current tool; Core materials starts open.
  const isGroupOpen = (group) => groupOverride[group] ?? (tool ? availableGroups.find((g) => g.group === group)?.tools.some((t) => t.id === tool.id) : group === 'Core materials');
  const toggleGroup = (group) => setGroupOverride((prev) => ({ ...prev, [group]: !isGroupOpen(group) }));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('civismetric-theme', isDark ? 'dark' : 'light'); } catch { /* storage unavailable */ }
  }, [isDark]);

  useEffect(() => {
    // A transition keeps the current page (and lets the drawer close at once) while a
    // calculator's code loads.
    const onHash = () => startTransition(() => setRoute(readRoute()));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (tool && signedIn) pushRecent(tool.id);
    document.title = signedIn ? `${pageTitle} · CivisMetric` : 'CivisMetric · Material Estimation Platform';
    // Each page starts at the top: the document scrolls below lg, the content column above.
    window.scrollTo(0, 0);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [tool, pageTitle, signedIn]);

  // Drawer: move focus in on open, close on Escape, hand focus back to the menu button once
  // the drawer is gone (main is inert until then, so it can't take focus earlier).
  const drawerWasOpen = useRef(false);
  useEffect(() => {
    if (!drawerOpen) {
      if (drawerWasOpen.current) menuButtonRef.current?.focus();
      drawerWasOpen.current = false;
      return;
    }
    drawerWasOpen.current = true;
    drawerFirstItemRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);
  const setNavCollapsed = (value) => {
    setCollapsed(value);
    try { localStorage.setItem('civismetric-nav-collapsed', value ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  const navigate = (id) => {
    window.location.hash = id ? `/${id}` : '';
    startTransition(() => setRoute(id));
    if (drawerOpen) closeDrawer();
  };

  // Search palette: Ctrl/⌘+K from anywhere; focus goes back to where it was when it closes.
  const openPalette = () => { paletteOpener.current = document.activeElement; setPaletteOpen(true); };
  const closePalette = () => {
    setPaletteOpen(false);
    setTimeout(() => paletteOpener.current?.focus?.(), 0);
  };
  const openPaletteEvent = useEffectEvent(() => { if (!paletteOpen) openPalette(); else closePalette(); });
  useEffect(() => {
    if (!signedIn) return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPaletteEvent(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [signedIn]);

  // Other screens (e.g. "Send to CAD" in the BOQ) open CAD Studio through the CAD context.
  const { registerCadNavigator } = useCad();
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; });
  useEffect(() => {
    registerCadNavigator(() => navigateRef.current('cad-studio'));
  }, [registerCadNavigator]);

  const setSession = (value) => {
    setSignedIn(value);
    try { value ? sessionStorage.setItem('civismetric-signed-in', '1') : sessionStorage.removeItem('civismetric-signed-in'); } catch { /* storage unavailable */ }
  };
  const signIn = (_role, id) => { saveUser(id); setUserId(id); setSession(true); };
  const signOut = () => { window.location.hash = ''; setDrawerOpen(false); setPaletteOpen(false); saveUser(''); setUserId(''); setSession(false); };

  const navProps = { route, onNavigate: navigate, isDark, onToggleTheme: () => setIsDark(!isDark), onSignOut: signOut, isGroupOpen, onToggleGroup: toggleGroup };

  if (!signedIn) {
    return showLogin ? <LoginPage onLogin={(r, id) => { setShowLogin(false); signIn(r, id); }} onBack={() => setShowLogin(false)} /> : <LandingPage onSignIn={() => setShowLogin(true)} />;
  }

  const blocked = drawerOpen || paletteOpen;

  return (
    <div className="app-glass relative isolate min-h-full lg:h-full flex bg-bg text-ink">
      {/* One backdrop behind the sidebar and every page: an interactive grid under frosted panels */}
      <KineticGrid className="absolute inset-0 -z-10 h-full w-full pointer-events-none" />
      <aside className={`hidden lg:block shrink-0 side-collapse ${collapsed ? 'w-[72px]' : 'w-64'}`} inert={blocked ? true : undefined}>
        <SideNav {...navProps} collapsed={collapsed} onToggleCollapse={() => setNavCollapsed(!collapsed)} onExpandGroup={(group) => { setGroupOverride((prev) => ({ ...prev, [group]: true })); setNavCollapsed(false); }} />
      </aside>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="drawer-scrim absolute inset-0 bg-black/40" onClick={closeDrawer} aria-hidden="true" />
          <div className="drawer-panel relative w-72 max-w-[85vw] h-full shadow-[0_8px_24px_rgb(0_0_0/0.12)]">
            <SideNav {...navProps} firstItemRef={drawerFirstItemRef} />
          </div>
        </div>
      )}

      {paletteOpen && <CommandPalette onClose={closePalette} onSelect={(id) => { closePalette(); navigate(id); }} />}

      <main className="relative flex-1 min-w-0 flex flex-col lg:h-full" inert={blocked ? true : undefined}>
        <header className="sticky top-0 z-20 lg:static shrink-0 flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-3 border-b border-line bg-surface/60 backdrop-blur-xl">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="lg:hidden -ml-1 p-2.5 rounded text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <MenuIcon />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink truncate">{pageTitle}</h1>
            {tool && <p className="hidden sm:block mt-0.5 text-sm text-muted truncate">{tool.summary}</p>}
          </div>
          {tool?.globalUnits && <UnitSwitch />}
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search tools and pages"
            aria-keyshortcuts="Control+K Meta+K"
            className="hidden md:flex items-center gap-2 w-60 lg:w-72 rounded border border-line-control bg-surface px-3 py-2 text-sm text-muted hover:text-ink hover:border-primary transition-colors"
          >
            <SearchIcon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left truncate">Search estimators…</span>
            <kbd aria-hidden="true" className="text-xs font-mono border border-line rounded px-1.5 py-0.5">{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
          </button>
          <button type="button" onClick={openPalette} aria-label="Search tools and pages" className="md:hidden p-2.5 rounded text-ink-2 hover:bg-sunken hover:text-ink">
            <SearchIcon className="w-5 h-5" />
          </button>
          <UserChip userId={userId} />
        </header>

        <div ref={contentRef} className="flex-1 lg:min-h-0 lg:overflow-y-auto custom-scroll p-4 sm:p-6 lg:p-8">
          {tool ? (
            <Suspense fallback={<p className="text-sm text-muted">Loading {tool.label.toLowerCase()}…</p>}>
              <CalculatorFrame key={tool.id}>
                <tool.component />
              </CalculatorFrame>
            </Suspense>
          ) : route === 'estimators' ? (
            <EstimatorIndex onNavigate={navigate} />
          ) : (
            <Dashboard onNavigate={navigate} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
