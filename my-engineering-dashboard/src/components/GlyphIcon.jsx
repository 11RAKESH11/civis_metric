// Small one-stroke pictograms for CAD Studio's component library and the rebar shape picker.
// They replace text glyphs and emoji, which rendered differently on every system (or not at all).
const CAD = {
  footing: 'M3 20h18M6 20v-5h12v5M10 15V5h4v10',
  column: 'M7 3h10M8 6h8M10 6v12M14 6v12M8 18h8M7 21h10',
  beam: 'M3 9h18v6H3zM7 9v6M12 9v6M17 9v6',
  slab: 'M3 13l9-5 9 5-9 5zM3 13v3l9 5 9-5v-3',
  stairs: 'M3 20h4v-4h4v-4h4V8h4V4h2',
  wall_ext: 'M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19',
  wall_int: 'M3 8h18v8H3zM12 8v8',
  wall_glass: 'M4 4h16v16H4zM12 4v16M4 12h16',
  parapet: 'M3 19h18M4 19v-8h16v8M4 11V7h4v4M10 11V7h4v4M16 11V7h4v4',
  door_main: 'M6 21V4h12v17M3 21h18M14 12.5h.01',
  door_room: 'M6 21V4h8l4 2v15M3 21h18M12 13h.01',
  window_std: 'M5 4h14v16H5zM12 4v16M5 12h14',
  window_vent: 'M5 8h14v8H5zM8 8v8M11 8v8M14 8v8M17 8v8',
  room: 'M4 4h16v16H4zM4 14h8V4',
  bed: 'M3 18V7M3 14h18v4M21 18v-4a3 3 0 00-3-3h-7v3M7 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  sofa: 'M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3M3 13a2 2 0 014 0v2h10v-2a2 2 0 014 0v5H3zM6 18v2M18 18v2',
  kitchen: 'M3 10h18v10H3zM3 14h18M8 17h2M14 17h2M7 10V6h4v4',
  dining: 'M4 9h16M6 9v10M18 9v10M3 5h3M18 5h3M9 5h6',
  toilet: 'M7 3h8v5H7zM5 8h14c0 5-2 8-7 8s-7-3-7-8zM9 16v4h6v-4',
  car: 'M4 15v-3l2-5h12l2 5v3zM4 15v3M20 15v3M7 12h10M7.5 15h.01M16.5 15h.01',
  sump: 'M4 6h16v14H4zM4 11h16M7 15c1.5-1 2.5 1 4 0s2.5 1 4 0',
  septic: 'M3 8h18v12H3zM9 8v12M15 8v12M6 5h3M15 5h3',
  oht: 'M6 20h12M8 20v-6M16 20v-6M5 14h14V7H5zM9 4h6',
  db: 'M6 3h12v18H6zM9 7h6M9 11h6M9 15h3M15 15h.01',
  dimension: 'M3 8v8M21 8v8M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3',
};

const REBAR = {
  straight: 'M3 12h18',
  lbend: 'M5 5v14h14',
  cranked: 'M3 16h6l4-8h8',
  stirrup: 'M6 5h12v14H6zM18 5l-3 3',
  chair: 'M3 18h4l2-10h6l2 10h4',
};

const Glyph = ({ d, className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const CadToolIcon = ({ id, className = 'w-4 h-4 shrink-0' }) => (CAD[id] ? <Glyph d={CAD[id]} className={className} /> : null);
export const RebarShapeIcon = ({ id, className = 'w-5 h-5 shrink-0' }) => (REBAR[id] ? <Glyph d={REBAR[id]} className={className} /> : null);
export const RotateIcon = ({ className = 'w-4 h-4 shrink-0' }) => <Glyph d="M20 12a8 8 0 11-2.6-5.9M20 4v5h-5" className={className} />;
export const ChevronDownIcon = ({ className = 'w-3.5 h-3.5 shrink-0' }) => <Glyph d="M6 9l6 6 6-6" className={className} />;
