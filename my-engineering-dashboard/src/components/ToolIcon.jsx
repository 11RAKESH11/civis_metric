// One stroked icon style for every tool: 24px grid, 1.5px stroke, no fills. Tools share a small set
// of glyphs by trade; the map at the bottom picks one per tool id (see src/tools.js).
const G = {
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  bricks: 'M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  column: 'M7 3h10M8 6h8M10 6v12M14 6v12M8 18h8M7 21h10',
  beam: 'M3 9h18v6H3zM7 9v6M12 9v6M17 9v6',
  stairs: 'M3 20h4v-4h4v-4h4V8h4V4h2',
  pit: 'M3 7h18M5 7l2 12h10l2-12',
  foundation: 'M4 20h16M6 20v-6h12v6M9 14V8h6v6',
  ruler: 'M3 17L17 3l4 4L7 21l-4-4zM8 12l2 2M11 9l2 2M14 6l2 2',
  roller: 'M5 4h12v5H5zM17 6.5h2v5h-7v3M11 14.5v6',
  grid: 'M4 4h16v16H4zM12 4v16M4 12h16',
  calc: 'M6 3h12v18H6zM9 7h6M9 11h2M13 11h2M9 15h2M13 15h2',
  people: 'M9 8a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 9a2.5 2.5 0 100-5M17 15c2.5 0 4 1.7 4 4',
  bolt: 'M13 2L5 14h6l-1 8 8-12h-6l1-8z',
  rebar: 'M4 18L18 4M8 20L20 8M6 16l2 2M10 12l2 2M14 8l2 2',
  thermo: 'M10 14V5a2 2 0 114 0v9a4 4 0 11-4 0z',
  waves: 'M3 10c3-3 5 3 9 0s6 3 9 0M3 16c3-3 5 3 9 0s6 3 9 0',
  pen: 'M3 21l3-1 12-12-2-2L4 18l-1 3zM14 6l4 4',
  clipboard: 'M9 4h6v3H9zM6 5h3M15 5h3M6 5v16h12V5',
  flask: 'M9 3h6M10 3v6L4 19a2 2 0 002 2h12a2 2 0 002-2L14 9V3',
  cut: 'M6 8a2 2 0 100-4 2 2 0 000 4zM6 20a2 2 0 100-4 2 2 0 000 4zM8 7l12 11M8 17L20 6',
  land: 'M3 20l6-12 4 7 3-4 5 9z',
  trowel: 'M4 20l8-8M12 12l6-6 2 2-6 6zM3 21l1-1',
  grains: 'M6 18h.01M10 18h.01M14 18h.01M18 18h.01M8 14h.01M12 14h.01M16 14h.01M10 10h.01M14 10h.01M12 6h.01',
  area: 'M4 20V4h16M4 20L20 4',
  home: 'M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
};

const BY_TOOL = {
  '': 'home', estimators: 'list', home: 'home',
  'cad-studio': 'pen', 'project-tracker': 'clipboard', 'project-boq': 'clipboard', 'bbs-optimizer': 'cut', 'mix-design': 'flask',
  cement: 'cube', sand: 'grains', aggregate: 'grains', bricks: 'bricks', concrete: 'layers', steel: 'rebar',
  foundation: 'foundation', excavation: 'pit', slab: 'layers', column: 'column', beam: 'beam', staircase: 'stairs',
  area: 'area', volume: 'cube', 'land-area': 'land',
  paint: 'roller', plaster: 'trowel', tile: 'grid',
  'material-cost': 'calc', 'labour-cost': 'people', 'project-estimate': 'calc',
  'rebar-weight': 'rebar', mortar: 'trowel', insulation: 'thermo', electrical: 'bolt', pool: 'waves',
};

// `draw` makes the stroke draw itself in when an ancestor has the .strip-in class (see index.css).
export default function ToolIcon({ id, className = 'w-4 h-4', draw = false }) {
  const d = G[BY_TOOL[id]] || G.cube;
  const dots = BY_TOOL[id] === 'grains';
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={dots ? 3 : 1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} pathLength={draw ? 1 : undefined} className={draw ? 'icon-draw' : undefined} />
    </svg>
  );
}
