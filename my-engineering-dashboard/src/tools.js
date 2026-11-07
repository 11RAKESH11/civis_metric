import { lazy } from 'react';

// Single source of truth for navigation and routing: the sidebar, the Estimators index and the
// view switch in App all read from here. A tool without `component` is listed as planned and
// can't be opened. `globalUnits` marks the tools that follow the header's Metric/Imperial switch;
// the others have their own unit selector.
const c = (load) => lazy(load);

export const toolGroups = [
  {
    group: 'CAD & project', icon: 'cad-studio',
    tools: [
      { id: 'cad-studio', tagline: "Draw to scale with live material takeoff", heading: 'CAD Studio', label: 'CAD Studio', summary: 'Interactive 2D drafting canvas with snap grid, live material takeoff and 3D extrusion.', component: c(() => import('./components/CadStudio')) },
      { id: 'project-tracker', tagline: "Milestones, curing timers and site log", heading: 'Project tracker', label: 'Project tracker', summary: '5-phase construction milestones, IS 456 curing timers and a daily site log.', component: c(() => import('./components/ProjectTracker')) },
      { id: 'project-boq', tagline: "Multi-trade BOQ with GST", globalUnits: true, heading: 'Project bill of quantities', label: 'Project BOQ', summary: 'Multi-trade bill of quantities with GST, margins and export.', component: c(() => import('./components/ProjectMasterBOQ')) },
      { id: 'bbs-optimizer', tagline: "Bar bending schedule and cutting plan", heading: 'BBS rebar optimizer', label: 'BBS rebar optimizer', summary: 'IS 2502 shape codes, bend deductions and 12 m stock cutting to reduce scrap.', component: c(() => import('./components/RebarCuttingOptimizer')) },
      { id: 'mix-design', tagline: "IS 10262 concrete mix proportions", heading: 'IS 10262 mix design', label: 'IS 10262 mix design', summary: "Target strength f'ck, absolute volume method, moisture correction and one-bag batching.", component: c(() => import('./components/ConcreteMixDesignIS10262')) },
    ],
  },
  {
    group: 'Core materials', icon: 'cement',
    tools: [
      { id: 'cement', tagline: "Bags, volume and water-cement ratio", label: 'Cement', summary: 'OPC/PPC bags, volume, bag batching and water-cement ratio.', component: c(() => import('./components/CementCalculator')) },
      { id: 'sand', tagline: "Quantity with bulking and moisture", label: 'Sand', summary: 'River or M-sand quantity with bulking, moisture and brass volume.', component: c(() => import('./components/SandCalculator')) },
      { id: 'aggregate', tagline: "10 mm and 20 mm quantity with voids", label: 'Aggregate', summary: '10 mm and 20 mm aggregate quantity with voids and compaction.', component: c(() => import('./components/AggregateCalculator')) },
      { id: 'bricks', tagline: "Brick count, mortar and labour days", label: 'Bricks', summary: 'Brick count, mortar cement and sand, and labor days for a wall with openings.', component: c(() => import('./components/BricksCalculator')) },
      { id: 'concrete', tagline: "M15 to M25 batching quantities", label: 'Concrete', summary: 'M15, M20 and M25 batching with the dry volume multiplier.', component: c(() => import('./components/ConcreteCalculator')) },
      { id: 'steel', tagline: "TMT weight by diameter and bundles", label: 'Steel', summary: 'TMT rebar weight by diameter and bundle logistics.', component: c(() => import('./components/SteelCalculator')) },
    ],
  },
  {
    group: 'Structural', icon: 'column',
    tools: [
      { id: 'foundation', tagline: "Slab, footing and stem wall takeoff", globalUnits: true, label: 'Foundation', summary: 'Slab-on-grade, isolated footing and stem wall concrete and rebar.', component: c(() => import('./components/FoundationCalculator')) },
      { id: 'excavation', tagline: "Earthwork volume and truck trips", label: 'Excavation', summary: 'Pit and trench earthwork with side slope and soil swell, plus truck trips.', component: c(() => import('./components/ExcavationCalculator')) },
      { id: 'slab', tagline: "RCC slab mesh and cranked bars", label: 'Slab', summary: 'One-way and two-way slab RCC rebar mesh and cranked bars.', component: c(() => import('./components/SlabCalculator')) },
      { id: 'column', tagline: "Concrete, rebar and formwork", label: 'Column', summary: 'Concrete, rebar and formwork for rectangular or circular columns.', component: c(() => import('./components/ColumnCalculator')) },
      { id: 'beam', tagline: "Main bars and stirrup spacing", label: 'Beam', summary: 'Flexural reinforcement and shear stirrup distribution.', component: c(() => import('./components/BeamCalculator')) },
      { id: 'staircase', tagline: "Riser, tread, waist slab and RCC", label: 'Staircase', summary: 'Riser, tread, waist slab thickness and landing RCC takeoff.', component: c(() => import('./components/StaircaseCalculator')) },
    ],
  },
  {
    group: 'Measurements', icon: 'area',
    tools: [
      { id: 'area', tagline: "Plot area from irregular shapes", label: 'Area', summary: 'Irregular polygon, Heron formula and trapezoidal plot survey.', component: c(() => import('./components/AreaCalculator')) },
      { id: 'volume', tagline: "Cylinder, frustum, prism and pyramid", label: 'Volume', summary: 'Cylinder, frustum, prism and pyramid volumes.', component: c(() => import('./components/VolumeCalculator')) },
      { id: 'land-area', tagline: "Acres, guntha, cents, bigha and more", heading: 'Land area converter', label: 'Land area converter', summary: 'Acres, guntha, cents, ground, square yards, bigha and hectares.', component: c(() => import('./components/LandAreaConverter')) },
    ],
  },
  {
    group: 'Finishing', icon: 'paint',
    tools: [
      { id: 'paint', tagline: "Primer, putty and coat coverage", label: 'Paint', summary: 'Primer, wall putty and multi-coat interior or exterior paint coverage.', component: c(() => import('./components/PaintCalculator')) },
      { id: 'plaster', tagline: "Cement and sand for 12 and 20 mm", label: 'Plaster', summary: '12 mm and 20 mm interior or exterior cement plaster batching.', component: c(() => import('./components/PlasterCalculator')) },
      { id: 'tile', tagline: "Tile count, spacers and adhesive", label: 'Tile', summary: 'Floor and wall tile counts with spacers and adhesive.', component: c(() => import('./components/TileCalculator')) },
    ],
  },
  {
    group: 'Costing', icon: 'material-cost',
    tools: [
      { id: 'material-cost', tagline: "Itemised materials with supplier rates", label: 'Material cost', summary: 'Itemized material schedule with supplier pricing and variance.', component: c(() => import('./components/MaterialCostCalculator')) },
      { id: 'labour-cost', tagline: "Daily wages by trade", label: 'Labour cost', summary: 'Daily wages for masons, bar benders, carpenters and helpers.', component: c(() => import('./components/LabourCostCalculator')) },
      { id: 'project-estimate', tagline: "Turnkey estimate with contingency", heading: 'Total project estimate', label: 'Total project estimate', summary: 'Turnkey civil estimate with contingency breakdown.', component: c(() => import('./components/TotalProjectEstimator')) },
    ],
  },
  {
    group: 'Advanced', icon: 'electrical',
    tools: [
      { id: 'rebar-weight', tagline: "Bar weight by the D²/162 formula", label: 'Rebar weight', summary: 'Bar bending schedule and the D²/162 weight formula.', component: c(() => import('./components/RebarWeightCalculator')) },
      { id: 'mortar', tagline: "Mortar mixes from 1:3 to 1:6", label: 'Mortar', summary: '1:3 to 1:6 mortar batching with the dry volume factor.', component: c(() => import('./components/MortarCalculator')) },
      { id: 'insulation', tagline: "R-value, U-factor and insulation packs", label: 'Insulation', summary: 'Thermal R-value, U-factor and insulation packs.', component: c(() => import('./components/InsulationEstimator')) },
      { id: 'electrical', tagline: "Load, wire, conduit and MCBs", label: 'Electrical wiring', summary: 'Connected load, wire coils, conduit and MCBs.', component: c(() => import('./components/ElectricalWiringCalculator')) },
      { id: 'pool', tagline: "Excavation, shell, finish and coping", label: 'Pool', summary: 'Excavation, shell concrete, interior finish and coping for a pool. Imperial rates in USD.', component: c(() => import('./components/Pool')) },
    ],
  },
];

export const availableGroups = toolGroups
  .map(({ group, icon, tools }) => ({ group, icon, tools: tools.filter((t) => t.component) }))
  .filter(({ tools }) => tools.length > 0);

export const plannedTools = toolGroups.flatMap(({ tools }) => tools.filter((t) => !t.component));

// Page heading: an explicit `heading`, else "<label> estimator".
export const headingFor = (tool) => tool.heading || `${tool.label} estimator`;

export const findTool = (id) => toolGroups.flatMap(({ tools }) => tools).find((t) => t.id === id && t.component);

// Jobs people come to the index to do, each opening the tool that does it. Shown above the full list.
export const commonJobs = [
  { id: 'bricks', title: 'Build a wall', detail: 'Bricks, mortar and labor, with door and window openings.' },
  { id: 'concrete', title: 'Pour concrete', detail: 'Slabs, walls or post holes, as ready-mix or bags.' },
  { id: 'foundation', title: 'Dig and lay a foundation', detail: 'Excavation, blinding, concrete and formwork.' },
  { id: 'project-boq', title: 'Cost a whole project', detail: 'Multi-trade bill of quantities with GST and margins.' },
];
