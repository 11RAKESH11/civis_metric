import React, { useState, useRef, useEffect, useEffectEvent, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import disposeObject from '../lib/disposeObject';
import { useCad, ARCHITECTURAL_TEMPLATES } from '../context/CadContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import { CadToolIcon, ChevronDownIcon, RotateIcon } from './GlyphIcon';

// ──────────────────────────────────────────────────────────────
// SCALE & GEOMETRY CONSTANTS
// ──────────────────────────────────────────────────────────────
const SCALE = 20; // 20px = 1.000 Meter
const pxToM = (px) => (Number(px || 0) / SCALE).toFixed(2);
const mToPx = (m) => Number(m || 0) * SCALE;
const dist = (a, b) => {
  if (!a || !b) return 0;
  return Math.sqrt(((b.x || 0) - (a.x || 0)) ** 2 + ((b.y || 0) - (a.y || 0)) ** 2);
};
const angleDeg = (a, b) => {
  if (!a || !b) return 0;
  const rad = Math.atan2((b.y || 0) - (a.y || 0), (b.x || 0) - (a.x || 0));
  const deg = (rad * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
};

// Discipline Filters for Zero Visual Clutter
const DISCIPLINES = [
  { id: 'all',        label: 'Master Plan',       desc: 'Full composite view' },
  { id: 'structural', label: 'Structural Frame',  desc: 'Footings, Columns, Beams & Slabs' },
  { id: 'arch',       label: 'Architecture',      desc: 'Walls, Doors, Windows, Stairs' },
  { id: 'interior',   label: 'Interior & Rooms',  desc: 'Flooring zones & Furniture' },
  { id: 'mep',        label: 'MEP & Utilities',   desc: 'Sump, Septic & Electrical' },
];

// Categorized Building Construction Tools
const COMPONENT_CATEGORIES = [
  {
    cat: 'structural',
    title: 'Structural Frame',
    tools: [
      { id: 'footing',   name: 'RCC Footing',        icon: '',  hint: '1.8m × 1.8m Pad' },
      { id: 'column',    name: 'RCC Column',         icon: '',  hint: '230mm × 380mm' },
      { id: 'beam',      name: 'Plinth / Tie Beam',  icon: '═',  hint: 'Connects columns' },
      { id: 'slab',      name: 'Roof / Floor Slab',  icon: '▬',  hint: '150mm Slab' },
      { id: 'stairs',    name: 'RCC Staircase',      icon: '', hint: 'Dog-Legged Flight' },
    ]
  },
  {
    cat: 'envelope',
    title: 'Walls & Masonry',
    tools: [
      { id: 'wall_ext',  name: 'Exterior Wall 230',  icon: '❚',  hint: '9" Brick Enclosure' },
      { id: 'wall_int',  name: 'Partition Wall 115', icon: '❘',  hint: '4.5" Internal Wall' },
      { id: 'wall_glass',name: 'Glass Facade',       icon: '▯',  hint: 'Curtain Glazing' },
      { id: 'parapet',   name: 'Parapet Wall',       icon: '▰',  hint: '0.9m Roof Guard' },
    ]
  },
  {
    cat: 'openings',
    title: 'Doors & Windows',
    tools: [
      { id: 'door_main', name: 'Main Entrance Door', icon: '', hint: '1.0m Wide Entry' },
      { id: 'door_room', name: 'Bedroom / Bath Door',icon: '⌐',  hint: '0.9m / 0.75m Flush' },
      { id: 'window_std',name: 'Glazed Window',      icon: '⊞',  hint: '1.5m UPVC Window' },
      { id: 'window_vent',name:'Ventilator',         icon: '⊟',  hint: '0.6m Louver' },
    ]
  },
  {
    cat: 'interior',
    title: 'Interior & Rooms',
    tools: [
      { id: 'room',      name: 'Room Zone Area',     icon: '⬚',  hint: 'Auto Carpet m²' },
      { id: 'bed',       name: 'King Bed (2×2.2m)',  icon: '', hint: 'Master Bedroom' },
      { id: 'sofa',      name: '3-Seater Sofa',      icon: '', hint: 'Living Room' },
      { id: 'kitchen',   name: 'Kitchen Counter',    icon: '', hint: 'Hob + Sink Unit' },
      { id: 'dining',    name: 'Dining Table Set',   icon: '', hint: '4-Seat Dining' },
      { id: 'toilet',    name: 'WC Toilet Pot',      icon: '', hint: 'Sanitary Fixture' },
      { id: 'car',       name: 'Sedan Car (Porch)',  icon: '', hint: 'Parking Bay' },
    ]
  },
  {
    cat: 'mep',
    title: 'MEP & Site Utilities',
    tools: [
      { id: 'sump',      name: 'Water Sump (6000L)', icon: '', hint: 'Underground Tank' },
      { id: 'septic',    name: 'Septic Tank (3-Ch)', icon: '', hint: 'Sanitary Tank' },
      { id: 'oht',       name: 'Overhead Tank',      icon: '', hint: '1500L on Roof' },
      { id: 'db',        name: 'Electrical DB',      icon: '', hint: 'Distribution Board' },
    ]
  },
  {
    cat: 'annotation',
    title: 'Civil Annotations',
    tools: [
      { id: 'dimension', name: 'Linear Dimension',   icon: '',  hint: 'Meter / Feet Dim' },
    ]
  }
];

// Shared fallback for missing element lists: a stable reference, not a new array per render.
const EMPTY = [];

// CAD Studio drawing board: deep slate-green surfaces; the orange accent comes from the app tokens.
const CAD_DARK = { '--c-sunken': '16 30 34', '--c-border': '36 62 68', '--c-border-control': '30 120 112' };

// Drag grip used by every resize handle: a small pill with three dots that lights up teal on hover and while dragging,
// plus a thin guide line along the edge it moves.
function ResizeGrip({ vertical }) {
  return (
    <>
      <span aria-hidden="true" className={`pointer-events-none absolute bg-primary opacity-0 shadow-[0_0_10px_rgb(var(--c-primary)/0.6)] transition-opacity group-hover:opacity-80 group-active:opacity-100 ${vertical ? 'inset-y-0 left-1/2 w-0.5 -translate-x-1/2' : 'inset-x-0 top-1/2 h-0.5 -translate-y-1/2'}`} />
      <span aria-hidden="true" className={`pointer-events-none relative flex items-center justify-center gap-[3px] rounded-full border border-[#2a4a50] bg-[#10222a] shadow-e1 transition-all group-hover:border-primary group-hover:bg-[#12303a] group-active:scale-110 group-active:border-primary ${vertical ? 'h-11 w-3.5 flex-col' : 'h-3.5 w-11'}`}>
        {[0, 1, 2].map((i) => <span key={i} className="h-[3px] w-[3px] rounded-full bg-[#8fb5ba] transition-colors group-hover:bg-primary group-active:bg-primary" />)}
      </span>
    </>
  );
}

export default function CadStudio() {
  const {
    cadElements: contextElements,
    setCadElements: setContextElements,
    activeTemplate,
    loadTemplate,
    projectTitle,
    setProjectTitle,
    pendingImports,
    consumePendingImports,
    ARCHITECTURAL_TEMPLATES: templatesList
  } = useCad();

  const { addItemToProject } = useProject();

  // Local state with safe default
  const [cadElements, setLocalCadElements] = useState(() => {
    if (contextElements && contextElements.walls && contextElements.walls.length > 0) {
      return contextElements;
    }
    return templatesList ? templatesList['2bhk']?.elements || {} : {};
  });

  const setCadElements = useCallback((newVal) => {
    setLocalCadElements(newVal);
    if (typeof setContextElements === 'function') {
      setContextElements(newVal);
    }
  }, [setContextElements]);

  // ── Viewport & Mode States
  const [viewMode, setViewMode] = useState('2d'); // '2d' | '3d'
  const [activeDiscipline, setActiveDiscipline] = useState('all');
  const [showRoofIn3D, setShowRoofIn3D] = useState(false);
  const [zoom, setZoom] = useState(1.1);
  const [pan, setPan] = useState({ x: 35, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const spaceDown = useRef(false);
  const viewRef = useRef({ zoom: 1.1, pan: { x: 35, y: 30 } });

  // ── Active Tool & Category Drawer
  const [activeTool, setActiveTool] = useState('select');
  const [activeDrawerCat, setActiveDrawerCat] = useState('structural');
  const [orthoMode, setOrthoMode] = useState(true);
  const [snapGrid, setSnapGrid] = useState(true);

  // ── Selection & Interactive Modification
  const [selectedEl, setSelectedEl] = useState(null);
  const [selectedGrip, setSelectedGrip] = useState(null);
  const [isDraggingEl, setIsDraggingEl] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ── Drawing In-Progress
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  // ── Sidebars & Overlays
  const [showTemplates, setShowTemplates] = useState(false);
  // Height of the toolbar block; null = fit its content. Dragging the handle under it trades toolbar space for canvas.
  const [toolsH, setToolsH] = useState(null);
  const toolsRef = useRef(null);
  const dragTools = useRef(null);
  // Overall height of the whole studio; null = fill the page. Dragged from the grip under the status bar.
  const [studioH, setStudioH] = useState(null);
  const studioRef = useRef(null);
  const dragStudio = useRef(null);
  // Workspace width and left offset (null = fill the page), set by dragging the left or right edge.
  const [studioW, setStudioW] = useState(null);
  const [studioML, setStudioML] = useState(0);
  const dragSide = useRef(null);
  // Width of the Building Schedule side panel, resized by dragging its left edge.
  const [scheduleW, setScheduleW] = useState(320);
  const dragSchedule = useRef(null);
  // Width of the element library rail on the left (md and up).
  const [railW, setRailW] = useState(264);
  const dragRail = useRef(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [cmdLog, setCmdLog] = useState([
    'CivisMetric Professional Architectural & Structural CAD Studio Initialized.',
    'Select tools to draft, move, stretch vertices, or load pre-engineered templates.'
  ]);

  const [history, setHistory] = useState([cadElements]);
  const [histIdx, setHistIdx] = useState(0);

  const mountRef = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const log = (msg) => setCmdLog(prev => [...prev.slice(-15), msg]);
  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3500); };

  // Safe Arrays
  const wallsList = cadElements?.walls || EMPTY;
  const columnsList = cadElements?.columns || EMPTY;
  const beamsList = cadElements?.beams || EMPTY;
  const foundationsList = cadElements?.foundations || EMPTY;
  const slabsList = cadElements?.slabs || EMPTY;
  const roomsList = cadElements?.rooms || EMPTY;
  const furnitureList = cadElements?.furniture || EMPTY;
  const doorsList = cadElements?.doors || EMPTY;
  const windowsList = cadElements?.windows || EMPTY;
  const stairsList = cadElements?.stairs || EMPTY;
  const mepList = cadElements?.mep || EMPTY;
  const dimensionsList = cadElements?.dimensions || EMPTY;

  // ── Snapping & Ortho
  const gridSize = 20; // 1m
  const snapPt = useCallback((rawX, rawY) => {
    if (!snapGrid) return { x: rawX || 0, y: rawY || 0 };
    return {
      x: Math.round((rawX || 0) / gridSize) * gridSize,
      y: Math.round((rawY || 0) / gridSize) * gridSize
    };
  }, [snapGrid, gridSize]);

  const orthoConstrain = useCallback((start, current) => {
    if (!orthoMode || !start || !current) return current || { x: 0, y: 0 };
    const dx = Math.abs((current.x || 0) - (start.x || 0));
    const dy = Math.abs((current.y || 0) - (start.y || 0));
    if (dx >= dy) return { x: current.x, y: start.y };
    return { x: start.x, y: current.y };
  }, [orthoMode]);

  const commitChange = useCallback((newElements, logMessage = '') => {
    const newHistory = history.slice(0, histIdx + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistIdx(newHistory.length - 1);
    setCadElements(newElements);
    if (logMessage) log(logMessage);
  }, [history, histIdx, setCadElements]);

  const undo = () => {
    if (histIdx > 0) {
      const prev = history[histIdx - 1];
      setHistIdx(histIdx - 1);
      setCadElements(prev);
      log('Undo');
    }
  };

  const redo = () => {
    if (histIdx < history.length - 1) {
      const next = history[histIdx + 1];
      setHistIdx(histIdx + 1);
      setCadElements(next);
      log('Redo');
    }
  };

  // ── Safe Merge of Ingested Calculator Elements
  // Merges components sent from the calculators ("Add to CAD") into the drawing.
  const applyPendingImports = useEffectEvent(() => {
    const imports = consumePendingImports();
    let current = { ...cadElements };
    const minX = 100, minY = 80;

    imports.forEach((item) => {
      if (item.type === 'column') {
        const count = item.count || 1;
        const newCols = [];
        for (let i = 0; i < count; i++) {
          newCols.push({
            id: `col-imp-${Date.now()}-${i}`,
            x: minX + (i % 3) * 160,
            y: minY + Math.floor(i / 3) * 160,
            w: 16, h: 16,
            label: `C${(columnsList.length || 0) + i + 1}`,
            layer: 'columns'
          });
        }
        current.columns = [...columnsList, ...newCols];
      }
      if (item.type === 'slab') {
        current.slabs = [...slabsList, {
          id: `slab-imp-${Date.now()}`,
          x: minX, y: minY,
          w: mToPx(item.length || 10), h: mToPx(item.width || 8),
          thickness: item.thickness || 0.15,
          label: item.label || 'Slab', layer: 'slabs'
        }];
      }
      if (item.type === 'foundation') {
        current.foundations = [...foundationsList, {
          id: `fdn-imp-${Date.now()}`,
          x: minX - 12, y: minY - 12,
          w: 40, h: 40,
          label: 'F1 Footing', layer: 'foundations'
        }];
      }
      if (item.type === 'wall_rectangle') {
        const len = mToPx(item.length || 6);
        const wid = mToPx(item.width || 4);
        current.walls = [...wallsList,
          { id: `w-imp-1-${Date.now()}`, x1: minX, y1: minY, x2: minX + len, y2: minY, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
          { id: `w-imp-2-${Date.now()}`, x1: minX + len, y1: minY, x2: minX + len, y2: minY + wid, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
          { id: `w-imp-3-${Date.now()}`, x1: minX + len, y1: minY + wid, x2: minX, y2: minY + wid, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
          { id: `w-imp-4-${Date.now()}`, x1: minX, y1: minY + wid, x2: minX, y2: minY, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
        ];
      }
    });

    commitChange(current, `✓ Integrated ${imports.length} component(s) into Master Plan`);
    showToast(`✓ Merged ${imports.length} item(s) into Master Drawing`);
  });
  useEffect(() => {
    if (!pendingImports || pendingImports.length === 0) return;
    applyPendingImports();
  }, [pendingImports]);


  const screenToWorld = useCallback((sx, sy) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const rawX = (sx - rect.left - pan.x) / zoom;
    const rawY = (sy - rect.top - pan.y) / zoom;
    return snapPt(rawX, rawY);
  }, [pan, zoom, snapPt]);

  const handleDeleteSelected = () => {
    if (!selectedEl) return;
    let newEls = { ...cadElements };
    const { category, id } = selectedEl;
    if (newEls[category]) {
      newEls[category] = newEls[category].filter(el => el.id !== id);
      commitChange(newEls, `Deleted ${category} item`);
      setSelectedEl(null);
      showToast(`Deleted ${category} component`);
    }
  };

  // ── Keyboard Shortcuts
  const onKeyDown = useEffectEvent((e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { undo(); return; }
      if (e.key === 'y' && (e.ctrlKey || e.metaKey)) { redo(); return; }
      if (e.key === 'F8') { setOrthoMode(p => !p); return; }
      if (e.key === 'F9') { setSnapGrid(p => !p); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEl) handleDeleteSelected();
        return;
      }
      if (e.key === 'Escape') {
        setIsDrawing(false);
        setDrawStart(null);
        setSelectedEl(null);
        setSelectedGrip(null);
        setActiveTool('select');
        return;
      }
  });
  useEffect(() => {
    const onKey = (e) => onKeyDown(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleRotateSelected = () => {
    if (!selectedEl) return;
    let newEls = { ...cadElements };
    const { category, id } = selectedEl;
    if (newEls[category]) {
      newEls[category] = newEls[category].map(el => {
        if (el.id === id) {
          return { ...el, rotation: (((el.rotation || 0) + 90) % 360) };
        }
        return el;
      });
      commitChange(newEls, `Rotated 90°`);
      showToast(`Rotated 90°`);
    }
  };

  // ── Canvas Mouse Down Handler
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && (e.altKey || spaceDown.current))) {
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      return;
    }
    if (e.button !== 0 || viewMode !== '2d') return;
    const pt = screenToWorld(e.clientX, e.clientY);

    if (activeTool === 'select') {
      setSelectedEl(null);
      setSelectedGrip(null);
      // Dragging empty canvas pans the drawing.
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      return;
    }

    if (['wall_ext', 'wall_int', 'wall_glass', 'parapet', 'beam', 'dimension', 'slab', 'room'].includes(activeTool)) {
      setIsDrawing(true);
      setDrawStart(pt);
      return;
    }

    // Single Stamp Tools
    if (activeTool === 'footing') {
      const fW = 40, fH = 40;
      const newFdn = { id: `f-${Date.now()}`, x: pt.x - fW / 2, y: pt.y - fH / 2, w: fW, h: fH, label: `F${foundationsList.length + 1}`, layer: 'foundations' };
      commitChange({ ...cadElements, foundations: [...foundationsList, newFdn] }, `Footing placed`);
      return;
    }

    if (activeTool === 'column') {
      const cW = 16, cH = 16;
      const newCol = { id: `col-${Date.now()}`, x: pt.x - cW / 2, y: pt.y - cH / 2, w: cW, h: cH, label: `C${columnsList.length + 1}`, layer: 'columns' };
      commitChange({ ...cadElements, columns: [...columnsList, newCol] }, `Column placed`);
      return;
    }

    if (activeTool === 'stairs') {
      const newSt = { id: `st-${Date.now()}`, x: pt.x, y: pt.y, w: 36, h: 55, steps: 14, label: 'RCC Stairs', layer: 'stairs' };
      commitChange({ ...cadElements, stairs: [...stairsList, newSt] }, `Stairs placed`);
      return;
    }

    if (activeTool === 'door_main' || activeTool === 'door_room') {
      const isMain = activeTool === 'door_main';
      const newDoor = { id: `d-${Date.now()}`, x: pt.x, y: pt.y, w: isMain ? 22 : 18, rotation: 0, label: isMain ? 'Main Door (1.0m)' : 'Door (0.9m)', layer: 'doors' };
      commitChange({ ...cadElements, doors: [...doorsList, newDoor] }, `Door placed`);
      return;
    }

    if (activeTool === 'window_std' || activeTool === 'window_vent') {
      const isVent = activeTool === 'window_vent';
      const newWin = { id: `win-${Date.now()}`, x: pt.x - 15, y: pt.y - 4, w: isVent ? 16 : 30, rotation: 0, label: isVent ? 'Vent (0.6m)' : 'Window (1.5m)', layer: 'windows' };
      commitChange({ ...cadElements, windows: [...windowsList, newWin] }, `Window placed`);
      return;
    }

    // Interior Furniture Stamps
    const furnTypes = {
      bed: { type: 'bed', w: 40, h: 44, label: 'King Bed' },
      sofa: { type: 'sofa', w: 45, h: 22, label: '3-Seater Sofa' },
      kitchen: { type: 'kitchen_counter', w: 75, h: 16, label: 'Kitchen Counter + Hob' },
      dining: { type: 'dining', w: 32, h: 32, label: 'Dining Table' },
      toilet: { type: 'toilet', w: 16, h: 18, label: 'WC' },
      car: { type: 'car', w: 38, h: 75, label: 'Car Parking' },
    };

    if (furnTypes[activeTool]) {
      const f = furnTypes[activeTool];
      const newF = { id: `f-${Date.now()}`, type: f.type, x: pt.x - f.w / 2, y: pt.y - f.h / 2, w: f.w, h: f.h, rotation: 0, label: f.label, layer: 'furniture' };
      commitChange({ ...cadElements, furniture: [...furnitureList, newF] }, `Placed ${f.label}`);
      return;
    }

    // MEP Utilities Stamps
    const mepTypes = {
      sump: { type: 'water_sump', w: 35, h: 35, label: 'Water Sump (6000L)' },
      septic: { type: 'septic_tank', w: 40, h: 30, label: 'Septic Tank (3-Ch)' },
      oht: { type: 'overhead_tank', w: 28, h: 28, label: 'Overhead Tank (1500L)' },
      db: { type: 'electrical_db', w: 12, h: 6, label: 'Main DB Board' },
    };

    if (mepTypes[activeTool]) {
      const m = mepTypes[activeTool];
      const newM = { id: `mep-${Date.now()}`, type: m.type, x: pt.x - m.w / 2, y: pt.y - m.h / 2, w: m.w, h: m.h, label: m.label, layer: 'mep' };
      commitChange({ ...cadElements, mep: [...mepList, newM] }, `Placed ${m.label}`);
      return;
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isPanning && panStart.current) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.mx),
        y: panStart.current.py + (e.clientY - panStart.current.my)
      });
      return;
    }

    const pt = screenToWorld(e.clientX, e.clientY);

    // Grip vertex stretch
    if (selectedGrip && selectedEl) {
      const { category, id } = selectedEl;
      let newEls = { ...cadElements };
      if (newEls[category]) {
        newEls[category] = newEls[category].map(el => {
          if (el.id === id && (category === 'walls' || category === 'beams')) {
            if (selectedGrip === 'start') return { ...el, x1: pt.x, y1: pt.y };
            if (selectedGrip === 'end') return { ...el, x2: pt.x, y2: pt.y };
          }
          return el;
        });
        setCadElements(newEls);
      }
      return;
    }

    // Element moving
    if (isDraggingEl && selectedEl) {
      const newX = pt.x - dragOffset.x;
      const newY = pt.y - dragOffset.y;
      const { category, id } = selectedEl;
      let newEls = { ...cadElements };
      if (newEls[category]) {
        newEls[category] = newEls[category].map(el => {
          if (el.id === id) {
            if (['walls', 'beams', 'dimensions'].includes(category)) {
              const dx = newX - el.x1;
              const dy = newY - el.y1;
              return { ...el, x1: newX, y1: newY, x2: el.x2 + dx, y2: el.y2 + dy };
            }
            return { ...el, x: newX, y: newY };
          }
          return el;
        });
        setCadElements(newEls);
      }
      return;
    }

    setCursor(orthoConstrain(drawStart, pt));
  }, [isPanning, isDraggingEl, selectedGrip, selectedEl, dragOffset, cadElements, drawStart, screenToWorld, orthoConstrain, setCadElements]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
      return;
    }

    if (selectedGrip) {
      setSelectedGrip(null);
      commitChange(cadElements, `Vertex adjusted`);
      return;
    }

    if (isDraggingEl) {
      setIsDraggingEl(false);
      commitChange(cadElements, `Repositioned ${selectedEl?.category} item`);
      return;
    }

    if (!isDrawing || !drawStart) return;
    const endPt = orthoConstrain(drawStart, cursor);

    if (['wall_ext', 'wall_int', 'wall_glass', 'parapet'].includes(activeTool)) {
      const lenPx = dist(drawStart, endPt);
      if (lenPx < 8) { setIsDrawing(false); setDrawStart(null); return; }
      const thick = activeTool === 'wall_int' ? 0.115 : 0.23;
      const newWall = {
        id: `w-${Date.now()}`,
        x1: drawStart.x, y1: drawStart.y,
        x2: endPt.x, y2: endPt.y,
        thickness: thick,
        wallType: activeTool === 'wall_ext' ? 'exterior' : activeTool === 'wall_glass' ? 'glass_facade' : activeTool === 'parapet' ? 'parapet' : 'interior',
        layer: 'walls'
      };
      commitChange({ ...cadElements, walls: [...wallsList, newWall] }, `Drawn wall (${pxToM(lenPx)}m)`);
      setDrawStart(endPt);
      return;
    }

    if (activeTool === 'beam') {
      const lenPx = dist(drawStart, endPt);
      if (lenPx < 8) { setIsDrawing(false); setDrawStart(null); return; }
      const newBeam = {
        id: `bm-${Date.now()}`,
        x1: drawStart.x, y1: drawStart.y,
        x2: endPt.x, y2: endPt.y,
        width: 0.23, depth: 0.45,
        label: `Beam (${pxToM(lenPx)}m)`,
        layer: 'beams'
      };
      commitChange({ ...cadElements, beams: [...beamsList, newBeam] }, `Plinth beam added`);
    }

    if (activeTool === 'slab') {
      const w = Math.abs(endPt.x - drawStart.x);
      const h = Math.abs(endPt.y - drawStart.y);
      if (w < 15 || h < 15) { setIsDrawing(false); setDrawStart(null); return; }
      const newSlab = {
        id: `slab-${Date.now()}`,
        x: Math.min(drawStart.x, endPt.x),
        y: Math.min(drawStart.y, endPt.y),
        w, h,
        thickness: 0.15,
        label: `Slab ${pxToM(w)}m×${pxToM(h)}m`,
        layer: 'slabs'
      };
      commitChange({ ...cadElements, slabs: [...slabsList, newSlab] }, `Slab placed`);
    }

    if (activeTool === 'room') {
      const w = Math.abs(endPt.x - drawStart.x);
      const h = Math.abs(endPt.y - drawStart.y);
      if (w < 15 || h < 15) { setIsDrawing(false); setDrawStart(null); return; }
      const areaM2 = ((w / SCALE) * (h / SCALE)).toFixed(1);
      const newRoom = {
        id: `rm-${Date.now()}`,
        x: Math.min(drawStart.x, endPt.x),
        y: Math.min(drawStart.y, endPt.y),
        w, h,
        name: 'ROOM ZONE',
        area: `${areaM2} m²`,
        floor: 'Tile',
        color: '#0284c7'
      };
      commitChange({ ...cadElements, rooms: [...roomsList, newRoom] }, `Room zone: ${areaM2} m²`);
    }

    if (activeTool === 'dimension') {
      const lenPx = dist(drawStart, endPt);
      const newDim = {
        id: `dim-${Date.now()}`,
        x1: drawStart.x, y1: drawStart.y,
        x2: endPt.x, y2: endPt.y,
        text: `${pxToM(lenPx)} m (${((lenPx / SCALE) * 3.28084).toFixed(1)} ft)`,
        layer: 'dimensions'
      };
      commitChange({ ...cadElements, dimensions: [...dimensionsList, newDim] }, `Dimension added`);
    }

    setIsDrawing(false);
    setDrawStart(null);
  }, [isPanning, isDraggingEl, selectedGrip, isDrawing, drawStart, cursor, activeTool, cadElements, wallsList, beamsList, slabsList, roomsList, dimensionsList, commitChange, selectedEl, orthoConstrain]);

  const handleElementMouseDown = (e, category, item) => {
    e.stopPropagation();
    if (activeTool === 'select') {
      setSelectedEl({ category, id: item.id, item });
      setIsDraggingEl(true);
      const pt = screenToWorld(e.clientX, e.clientY);
      if (['walls', 'beams', 'dimensions'].includes(category)) {
        setDragOffset({ x: pt.x - item.x1, y: pt.y - item.y1 });
      } else {
        setDragOffset({ x: pt.x - item.x, y: pt.y - item.y });
      }
    }
  };

  // ── Push Full Real-Building Takeoff to Master BOQ
  const handlePushToMasterBOQ = () => {
    let totalWallM = 0;
    wallsList.forEach(w => { totalWallM += dist({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) / SCALE; });
    const brickCount = Math.round(totalWallM * 0.23 * 3.0 * 500);

    let totalBeamM = 0;
    beamsList.forEach(b => { totalBeamM += dist({ x: b.x1, y: b.y1 }, { x: b.x2, y: b.y2 }) / SCALE; });
    const beamConcrete = (totalBeamM * 0.23 * 0.45);
    const colConcrete = (columnsList.length * 0.23 * 0.38 * 3.0);
    const fdnConcrete = (foundationsList.length * 1.8 * 1.8 * 0.45);
    const totalSlabArea = slabsList.reduce((sum, s) => sum + (s.w / SCALE) * (s.h / SCALE), 0);
    const totalCarpet = roomsList.reduce((sum, r) => sum + (r.w / SCALE) * (r.h / SCALE), 0);

    if (fdnConcrete > 0) addItemToProject({ category: 'Earthwork & Foundations', module: 'CAD Studio', description: `RCC Isolated Footings (${foundationsList.length} units)`, quantity: Number(fdnConcrete.toFixed(2)), unit: 'm³', rate: 6800, cost: fdnConcrete * 6800 });
    if (colConcrete > 0) addItemToProject({ category: 'Concrete & RCC', module: 'CAD Studio', description: `RCC Columns (${columnsList.length} columns)`, quantity: Number(colConcrete.toFixed(2)), unit: 'm³', rate: 7100, cost: colConcrete * 7100 });
    if (beamConcrete > 0) addItemToProject({ category: 'Concrete & RCC', module: 'CAD Studio', description: `Plinth & Floor Beams (${totalBeamM.toFixed(1)}m length)`, quantity: Number(beamConcrete.toFixed(2)), unit: 'm³', rate: 7100, cost: beamConcrete * 7100 });
    if (totalSlabArea > 0) addItemToProject({ category: 'Concrete & RCC', module: 'CAD Studio', description: `RCC Roof Slab (${totalSlabArea.toFixed(1)} m² area)`, quantity: Number((totalSlabArea * 0.15).toFixed(2)), unit: 'm³', rate: 6900, cost: totalSlabArea * 0.15 * 6900 });
    if (brickCount > 0) addItemToProject({ category: 'Masonry Work', module: 'CAD Studio', description: `Brick Masonry (${totalWallM.toFixed(1)}m length)`, quantity: brickCount, unit: 'Nos', rate: 11.5, cost: brickCount * 11.5 });
    if (doorsList.length > 0) addItemToProject({ category: 'Joinery & Woodwork', module: 'CAD Studio', description: `Doors & Frames`, quantity: doorsList.length, unit: 'Sets', rate: 8500, cost: doorsList.length * 8500 });
    if (windowsList.length > 0) addItemToProject({ category: 'Joinery & Woodwork', module: 'CAD Studio', description: `UPVC Glazed Windows`, quantity: windowsList.length, unit: 'Sets', rate: 6200, cost: windowsList.length * 6200 });
    if (totalCarpet > 0) addItemToProject({ category: 'Finishes & Flooring', module: 'CAD Studio', description: `Floor Finishes (${totalCarpet.toFixed(1)} m²)`, quantity: Number(totalCarpet.toFixed(1)), unit: 'm²', rate: 1450, cost: totalCarpet * 1450 });

    showToast(`Exported building takeoff to Project BOQ`);
    log('Building takeoff synchronized with Master BOQ.');
  };

  // ── Live Metrics Takeoff
  const metrics = useMemo(() => {
    let wallLen = 0;
    wallsList.forEach(w => { wallLen += dist({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) / SCALE; });
    const carpetM2 = roomsList.reduce((s, r) => s + (r.w / SCALE) * (r.h / SCALE), 0);
    const builtupM2 = slabsList.length > 0 ? slabsList.reduce((s, sl) => s + (sl.w / SCALE) * (sl.h / SCALE), 0) : carpetM2 * 1.25;

    return {
      wallLen: wallLen.toFixed(1),
      cols: columnsList.length,
      beams: beamsList.length,
      fdns: foundationsList.length,
      doors: doorsList.length,
      windows: windowsList.length,
      rooms: roomsList.length,
      carpetM2: carpetM2.toFixed(1),
      carpetSqft: (carpetM2 * 10.7639).toFixed(0),
      builtupM2: builtupM2.toFixed(1),
      builtupSqft: (builtupM2 * 10.7639).toFixed(0),
      bricks: Math.round(wallLen * 0.23 * 3.0 * 500)
    };
  }, [wallsList, columnsList, beamsList, foundationsList, slabsList, doorsList, windowsList, roomsList]);

  // ── 3D BIM WebGL Engine
  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    let renderer;
    let controls;
    let rafId;
    let scene;

    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x080c16);
      scene.fog = new THREE.FogExp2(0x080c16, 0.01);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(28, 32, 38);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 1.5, 0);

      scene.add(new THREE.GridHelper(80, 80, 0x0284c7, 0x1e293b));
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));

      const dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
      dirLight.position.set(30, 50, 25);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const ox = 240, oz = 260;

      // 1. Footings
      foundationsList.forEach(f => {
        const fx = (f.x - ox + f.w / 2) / SCALE;
        const fz = (f.y - oz + f.h / 2) / SCALE;
        const fMesh = new THREE.Mesh(
          new THREE.BoxGeometry(f.w / SCALE, 0.45, f.h / SCALE),
          new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.8 })
        );
        fMesh.position.set(fx, -0.9, fz);
        scene.add(fMesh);
      });

      // 2. Columns
      columnsList.forEach(c => {
        const cx = (c.x - ox + c.w / 2) / SCALE;
        const cz = (c.y - oz + c.h / 2) / SCALE;
        const colMesh = new THREE.Mesh(
          new THREE.BoxGeometry(c.w / SCALE, 4.2, c.h / SCALE),
          new THREE.MeshStandardMaterial({ color: 0x818cf8, metalness: 0.2, roughness: 0.4 })
        );
        colMesh.position.set(cx, 1.2, cz);
        scene.add(colMesh);
      });

      // 3. Walls
      wallsList.forEach(w => {
        const x1 = (w.x1 - ox) / SCALE, z1 = (w.y1 - oz) / SCALE;
        const x2 = (w.x2 - ox) / SCALE, z2 = (w.y2 - oz) / SCALE;
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.1) return;
        const ang = Math.atan2(dz, dx);
        const isGlass = w.wallType === 'glass_facade';

        const wallMesh = new THREE.Mesh(
          new THREE.BoxGeometry(len, 3.0, w.thickness || 0.23),
          new THREE.MeshStandardMaterial({
            color: isGlass ? 0x38bdf8 : w.wallType === 'exterior' ? 0x0284c7 : 0x64748b,
            transparent: isGlass,
            opacity: isGlass ? 0.4 : 1.0,
            roughness: isGlass ? 0.1 : 0.6
          })
        );
        wallMesh.position.set((x1 + x2) / 2, 1.5, (z1 + z2) / 2);
        wallMesh.rotation.y = -ang;
        scene.add(wallMesh);
      });

      // 4. Roof Slab in 3D
      if (showRoofIn3D && slabsList.length > 0) {
        slabsList.forEach(sl => {
          const sx = (sl.x - ox + sl.w / 2) / SCALE;
          const sz = (sl.y - oz + sl.h / 2) / SCALE;
          const slabMesh = new THREE.Mesh(
            new THREE.BoxGeometry(sl.w / SCALE, 0.18, sl.h / SCALE),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, transparent: true, opacity: 0.9 })
          );
          slabMesh.position.set(sx, 3.09, sz);
          scene.add(slabMesh);
        });
      }

      const animate = () => {
        rafId = requestAnimationFrame(animate);
        if (controls) controls.update();
        // Skip drawing while the tab is in the background or the canvas is hidden.
        if (document.hidden || container.clientWidth === 0) return;
        if (renderer) renderer.render(scene, camera);
      };
      animate();
    } catch (err) {
      console.warn('3D WebGL render notice:', err);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (scene) disposeObject(scene);
      if (renderer) renderer.dispose();
    };
  }, [viewMode, showRoofIn3D, foundationsList, columnsList, wallsList, slabsList]);

  // Discipline Filter
  const shouldRender = (layerName) => {
    if (activeDiscipline === 'all') return true;
    if (activeDiscipline === 'structural') return ['foundations', 'columns', 'beams', 'slabs', 'stairs'].includes(layerName);
    if (activeDiscipline === 'arch') return ['walls', 'doors', 'windows', 'stairs', 'dimensions'].includes(layerName);
    if (activeDiscipline === 'interior') return ['rooms', 'furniture', 'dimensions'].includes(layerName);
    if (activeDiscipline === 'mep') return ['mep', 'walls', 'dimensions'].includes(layerName);
    return true;
  };

  // Wheel zooms the drawing. React registers onWheel as passive, which can't stop the page from
  // scrolling too, so the listener is attached natively as non-passive.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const { zoom: z, pan: p } = viewRef.current;
      const nz = Math.min(4, Math.max(0.3, z * (e.deltaY < 0 ? 1.12 : 0.89)));
      const k = nz / z;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Zoom about the pointer, so the point under the cursor stays put.
      setZoom(nz);
      setPan({ x: mx - (mx - p.x) * k, y: my - (my - p.y) * k });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => { viewRef.current = { zoom, pan }; }, [zoom, pan]);

  // Hold Space to pan with any tool; finish a pan even if the mouse is released outside the canvas.
  useEffect(() => {
    const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    const down = (e) => { if (e.code === 'Space' && !typing(e.target)) { spaceDown.current = true; e.preventDefault(); } };
    const up = (e) => { if (e.code === 'Space') spaceDown.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (!isPanning) return undefined;
    const end = () => { setIsPanning(false); panStart.current = null; };
    window.addEventListener('mouseup', end);
    return () => window.removeEventListener('mouseup', end);
  }, [isPanning]);

  const zoomBy = (factor) => {
    const el = containerRef.current;
    const { zoom: z, pan: p } = viewRef.current;
    const nz = Math.min(4, Math.max(0.3, z * factor));
    const k = nz / z;
    const w = el ? el.clientWidth / 2 : 0;
    const h = el ? el.clientHeight / 2 : 0;
    setZoom(nz);
    setPan({ x: w - (w - p.x) * k, y: h - (h - p.y) * k });
  };
  const resetView = () => { setZoom(1.1); setPan({ x: 35, y: 30 }); };

  // The drafting board is dark in both themes: "dark" scopes the palette tokens inside it.
  return (
    <div ref={studioRef} style={{ ...(studioH == null ? null : { height: studioH, minHeight: 0 }), ...(studioW == null ? null : { width: studioW, maxWidth: 'none', flexShrink: 0, marginLeft: studioML }), '--rail-w': railW + 'px' }} className="relative flex flex-col md:flex-row gap-4 w-full h-full min-h-[calc(100svh-5rem)] lg:min-h-0 select-none text-ink font-sans">
      {['left', 'right'].map((side) => (
        <div
          key={side}
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize workspace from the ${side}`}
          title="Drag to resize the width. Double-click to reset."
          onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } dragSide.current = { side, x: e.clientX, w: studioRef.current ? studioRef.current.offsetWidth : 0, ml: studioML }; }}
          onPointerMove={(e) => {
            const d = dragSide.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            if (d.side === 'right') {
              setStudioW(Math.max(480, Math.min(2600, d.w + dx)));
            } else {
              // Left edge: moving it right narrows the workspace; moving it back left (never past the page edge) widens it again.
              const ml = Math.max(0, d.ml + dx);
              setStudioML(ml);
              setStudioW(Math.max(480, Math.min(2600, d.w - (ml - d.ml))));
            }
          }}
          onPointerUp={() => { dragSide.current = null; }}
          onPointerCancel={() => { dragSide.current = null; }}
          onDoubleClick={() => { setStudioW(null); setStudioML(0); }}
          className={`group absolute inset-y-0 z-30 flex w-4 cursor-col-resize touch-none items-center justify-center ${side === 'left' ? 'left-0' : 'right-0'}`}
        >
          <ResizeGrip vertical />
        </div>
      ))}

      {/* ═══════════════════ ELEMENT LIBRARY (left card) ═══════════════════ */}
      <aside className="relative z-10 flex max-h-72 w-full shrink-0 flex-col gap-4 rounded-lg border border-line bg-surface p-5 md:max-h-none md:w-[var(--rail-w)]" aria-label="Element library">
        <div className="flex shrink-0 items-center justify-between border-b border-line pb-3">
          <h2 className="text-sm font-semibold text-ink">Element library</h2>
          <span className="whitespace-nowrap text-xs font-medium text-ink">{COMPONENT_CATEGORIES.reduce((n, c) => n + c.tools.length, 0)} tools</span>
        </div>

        <div className="custom-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <button
            onClick={() => setActiveTool('select')}
            className={`flex h-11 w-full items-center gap-2.5 rounded-lg px-3.5 text-sm font-semibold transition-all ${activeTool === 'select' ? 'bg-primary text-on-primary shadow-e1' : 'border border-line bg-surface text-ink hover:bg-sunken'}`}
          >
            Select / Move
          </button>

          <div className="space-y-1.5">
            {COMPONENT_CATEGORIES.map((c) => {
              const open = activeDrawerCat === c.cat;
              return (
                <div key={c.cat} className={`rounded-lg border transition-colors ${open ? 'border-line-control bg-sunken' : 'border-line bg-surface'}`}>
                  <button
                    onClick={() => setActiveDrawerCat(c.cat)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-sunken"
                  >
                    <span>{c.title}</span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-ink">{c.tools.length}</span>
                      <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {open && (
                    <div className="grid grid-cols-1 gap-1.5 px-2 pb-2">
                      {c.tools.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => setActiveTool(tool.id)}
                          title={`${tool.name} · ${tool.hint}`}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all ${
                            activeTool === tool.id
                              ? 'border-primary bg-primary text-on-primary shadow-e1'
                              : 'border-line bg-surface text-ink hover:border-line-control hover:bg-sunken'
                          }`}
                        >
                          <CadToolIcon id={tool.id} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{tool.name}</span>
                            <span className="block truncate text-xs font-normal text-ink">{tool.hint}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedEl && (
            <div className="space-y-2 rounded-lg border border-line-control bg-sunken p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink">Selected: {selectedEl.category}</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleRotateSelected} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-sm font-semibold text-ink hover:bg-primary hover:text-on-primary">
                  <RotateIcon /> 90&deg;
                </button>
                <button onClick={handleDeleteSelected} className="h-9 rounded-lg border border-line bg-surface text-sm font-semibold text-error hover:bg-error hover:text-ink">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drag this grip, in the gap between the cards, to change the library width */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize element library"
          title="Drag to resize. Double-click to reset."
          onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } dragRail.current = { x: e.clientX, w: railW }; }}
          onPointerMove={(e) => { const d = dragRail.current; if (d) setRailW(Math.max(220, Math.min(480, d.w + e.clientX - d.x))); }}
          onPointerUp={() => { dragRail.current = null; }}
          onPointerCancel={() => { dragRail.current = null; }}
          onDoubleClick={() => setRailW(264)}
          className="group absolute -right-4 inset-y-0 hidden w-4 cursor-col-resize touch-none items-center justify-center md:flex"
        >
          <ResizeGrip vertical />
        </div>
      </aside>

      {/* ═══════════════════ DRAWING WORKSPACE (right card) ═══════════════════ */}
      <div className="flex min-w-0 flex-1 flex-col">
      {/* ═══════════════════ PROJECT HEADER (top card) ═══════════════════ */}
      <div ref={toolsRef} className="shrink-0 overflow-y-auto custom-scroll rounded-lg border border-line bg-surface" style={toolsH == null ? undefined : { height: toolsH }}>
        <div className="space-y-4 p-4 sm:p-5">

          {/* Title, live quantities and the 2D / 3D switch */}
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label="Project title"
                  type="text"
                  value={projectTitle || 'CivisMetric Project'}
                  onChange={(e) => setProjectTitle && setProjectTitle(e.target.value)}
                  className="w-64 max-w-full truncate border-b border-transparent bg-transparent text-lg font-bold text-ink outline-none transition-all hover:border-line focus:border-primary"
                />
                <span className="rounded-full border border-line-control bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-ink">BIM Level 2</span>
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
                {[
                  ['Built-up', `${metrics.builtupM2} m²`],
                  ['Carpet', `${metrics.carpetM2} m²`],
                  ['Columns', metrics.cols],
                  ['Footings', metrics.fdns],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink">{label}</dt>
                    <dd className="text-xl font-bold tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex items-center gap-2">
              {viewMode === '3d' && (
                <button
                  onClick={() => setShowRoofIn3D(p => !p)}
                  className={`h-10 whitespace-nowrap rounded-lg border px-3.5 text-sm font-semibold transition-all ${showRoofIn3D ? 'border-primary bg-primary/20 text-ink' : 'border-line bg-surface text-ink hover:bg-sunken'}`}
                >
                  {showRoofIn3D ? 'Roof: ON' : 'Open Top Cutaway'}
                </button>
              )}
              {/* 2D / 3D Toggle */}
              <div className="flex gap-1 rounded-xl border border-line bg-bg p-1">
                {['2d', '3d'].map(m => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`h-8 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-all ${viewMode === m ? 'bg-primary text-on-primary shadow-e1' : 'text-ink hover:bg-sunken'}`}
                  >
                    {m === '2d' ? '2D Plan' : '3D BIM'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Discipline filter and actions */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
            <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-bg p-1">
              {DISCIPLINES.map(d => (
                <button
                  key={d.id}
                  onClick={() => setActiveDiscipline(d.id)}
                  className={`h-8 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-all ${
                    activeDiscipline === d.id
                      ? 'bg-primary text-on-primary shadow-e1'
                      : 'text-ink hover:bg-sunken'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {toastMsg && (
                <span role="status" className="fixed bottom-14 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 truncate rounded-lg border border-line-control bg-[#0e1a1d] px-4 py-2 text-sm font-bold text-white shadow-e2">
                  {toastMsg}
                </span>
              )}

              {/* Templates Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowTemplates(p => !p)}
                  className="flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-sm font-semibold text-ink transition-all hover:bg-sunken"
                >
                  Templates <ChevronDownIcon />
                </button>
                {showTemplates && templatesList && (
                  <div className="absolute left-0 z-50 mt-2 w-72 max-w-[calc(100vw-3rem)] space-y-1 rounded-lg border border-line bg-surface p-2 font-sans shadow-e2">
                    {Object.entries(templatesList).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => { if (loadTemplate) loadTemplate(key); commitChange(t.elements, `Template loaded: ${t.name}`); setSelectedEl(null); setShowTemplates(false); showToast(`Loaded ${t.name}`); }}
                        className={`w-full rounded-lg border p-2.5 text-left text-sm transition-all ${activeTemplate === key ? 'border-line-control bg-sunken' : 'border-transparent hover:bg-sunken'}`}
                      >
                        <p className="font-semibold text-ink">{t.name}</p>
                        <p className="truncate text-xs text-ink">{t.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowSchedule(p => !p)}
                className={`h-10 whitespace-nowrap rounded-lg border px-3.5 text-sm font-semibold transition-all ${showSchedule ? 'border-primary bg-primary/20 text-ink' : 'border-line bg-surface text-ink hover:bg-sunken'}`}
              >
                Schedule
              </button>

              {/* Snap & Ortho Mode Toggles */}
              <button
                onClick={() => setSnapGrid(p => !p)}
                aria-pressed={snapGrid}
                className={`h-10 whitespace-nowrap rounded-lg border px-3.5 text-sm font-semibold transition-all ${snapGrid ? 'border-primary bg-primary/20 text-ink' : 'border-line bg-surface text-ink hover:bg-sunken'}`}
              >
                SNAP (F9)
              </button>
              <button
                onClick={() => setOrthoMode(p => !p)}
                aria-pressed={orthoMode}
                className={`h-10 whitespace-nowrap rounded-lg border px-3.5 text-sm font-semibold transition-all ${orthoMode ? 'border-primary bg-primary/20 text-ink' : 'border-line bg-surface text-ink hover:bg-sunken'}`}
              >
                ORTHO (F8)
              </button>

              {/* Export to BOQ */}
              <button
                onClick={handlePushToMasterBOQ}
                className="h-10 whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary shadow-e1 transition-all hover:bg-primary-hover"
              >
                Export to BOQ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drag to resize: pull up for a bigger drawing area, down for more room above. Double-click resets. */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize header and drawing area"
        title="Drag to resize. Double-click to reset."
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } dragTools.current = { y: e.clientY, h: toolsRef.current ? toolsRef.current.offsetHeight : 0 }; }}
        onPointerMove={(e) => { const d = dragTools.current; if (d) setToolsH(Math.max(0, Math.min(600, d.h + e.clientY - d.y))); }}
        onPointerUp={() => { dragTools.current = null; }}
        onPointerCancel={() => { dragTools.current = null; }}
        onDoubleClick={() => setToolsH(null)}
        className="group relative z-10 flex h-4 shrink-0 cursor-row-resize touch-none items-center justify-center"
      >
        <ResizeGrip />
      </div>

      {/* ═══════════════════ DRAWING WORKSPACE (dark card) ═══════════════════ */}
      <div style={CAD_DARK} className="dark flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#1d3338] bg-[#0a1214] md:min-h-0">

      {/* ═══════════════════ MAIN VIEWPORT ═══════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden relative md:flex-row">


        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-[#050b0c]"
          style={{ cursor: isPanning || isDraggingEl ? 'grabbing' : activeTool === 'select' ? 'grab' : 'crosshair' }}
        >
          {/* View controls: zoom, reset, and a hint for panning */}
          {viewMode === '2d' && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-xl border border-[#1d3338] bg-[#0e1a1d]/95 p-1 shadow-e2" onMouseDown={(e) => e.stopPropagation()}>
              <button type="button" aria-label="Zoom out" onClick={() => zoomBy(0.8)} className="grid h-8 w-8 place-items-center rounded-lg text-lg font-semibold text-ink hover:bg-sunken">&minus;</button>
              <span className="min-w-[3.25rem] text-center text-[13px] font-semibold tabular-nums text-ink">{Math.round((zoom / 1.1) * 100)}%</span>
              <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.25)} className="grid h-8 w-8 place-items-center rounded-lg text-lg font-semibold text-ink hover:bg-sunken">+</button>
              <button type="button" onClick={resetView} className="ml-1 h-8 rounded-lg px-2.5 text-[13px] font-semibold text-primary hover:bg-sunken">Reset view</button>
            </div>
          )}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden text-xs text-ink sm:block">Drag empty space or hold Space to pan · scroll to zoom</div>

          {/* Dynamic Distance & Angle Tooltip */}
          {isDrawing && drawStart && (
            <div className="absolute top-3 left-3 z-20 bg-surface border border-primary text-primary px-3 py-1.5 rounded-lg text-[13px] font-medium pointer-events-none">
              Length: <strong>{pxToM(dist(drawStart, cursor))}m</strong> · Angle: <strong>{angleDeg(drawStart, cursor).toFixed(1)}°</strong>
            </div>
          )}

          {viewMode === '2d' ? (
            <svg
              ref={svgRef}
              className="w-full h-full block"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <defs>
                <pattern id="cadGridCleanTitanium" width={gridSize * zoom} height={gridSize * zoom} patternUnits="userSpaceOnUse" x={pan.x % (gridSize * zoom)} y={pan.y % (gridSize * zoom)}>
                  <path d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`} fill="none" stroke="#13262a" strokeWidth="0.8" />
                </pattern>
                <pattern id="cadGridBigTitanium" width={gridSize * zoom * 5} height={gridSize * zoom * 5} patternUnits="userSpaceOnUse" x={pan.x % (gridSize * zoom * 5)} y={pan.y % (gridSize * zoom * 5)}>
                  <rect width={gridSize * zoom * 5} height={gridSize * zoom * 5} fill="url(#cadGridCleanTitanium)" />
                  <path d={`M ${gridSize * zoom * 5} 0 L 0 0 0 ${gridSize * zoom * 5}`} fill="none" stroke="#1d3338" strokeWidth="1.2" opacity="0.6" />
                </pattern>
              </defs>

              <rect width="100%" height="100%" fill="url(#cadGridBigTitanium)" />

              {/* Cursor Guide Lines */}
              <line x1={cursor.x * zoom + pan.x} y1="0" x2={cursor.x * zoom + pan.x} y2="10000" stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="3 3" />
              <line x1="0" y1={cursor.y * zoom + pan.y} x2="10000" y2={cursor.y * zoom + pan.y} stroke="#1e3a5f" strokeWidth="0.5" strokeDasharray="3 3" />

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

                {/* 1. Footings (Underground) */}
                {shouldRender('foundations') && foundationsList.map(f => (
                  <g key={f.id} onMouseDown={(e) => handleElementMouseDown(e, 'foundations', f)}>
                    <rect
                      x={f.x} y={f.y} width={f.w} height={f.h}
                      fill="#eab30818" stroke="#eab308" strokeWidth={1.5 / zoom}
                    />
                    <text x={f.x + f.w / 2} y={f.y + f.h / 2} fill="#eab308" fontSize={8 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">{f.label}</text>
                  </g>
                ))}

                {/* 2. Plinth / Tie Beams */}
                {shouldRender('beams') && beamsList.map(bm => (
                  <g key={bm.id} onMouseDown={(e) => handleElementMouseDown(e, 'beams', bm)}>
                    <line
                      x1={bm.x1} y1={bm.y1} x2={bm.x2} y2={bm.y2}
                      stroke="#818cf8" strokeWidth={5 / zoom} strokeDasharray={`${6 / zoom} ${3 / zoom}`}
                    />
                  </g>
                ))}

                {/* 3. Slabs */}
                {shouldRender('slabs') && slabsList.map(sl => (
                  <g key={sl.id} onMouseDown={(e) => handleElementMouseDown(e, 'slabs', sl)}>
                    <rect
                      x={sl.x} y={sl.y} width={sl.w} height={sl.h}
                      fill="#a855f712" stroke="#a855f7" strokeWidth={1 / zoom} strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                    />
                  </g>
                ))}

                {/* 4. Rooms & Flooring Zones */}
                {shouldRender('rooms') && roomsList.map(r => (
                  <g key={r.id} onMouseDown={(e) => handleElementMouseDown(e, 'rooms', r)}>
                    <rect
                      x={r.x} y={r.y} width={r.w} height={r.h}
                      fill={`${r.color || '#0284c7'}15`} stroke={r.color || '#0284c7'} strokeWidth={0.8 / zoom} rx={2}
                    />
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 5} fill="#f8fafc" fontSize={9 / zoom} fontWeight="bold" textAnchor="middle">{r.name}</text>
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 8} fill="#38bdf8" fontSize={8 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{r.area} ({r.floor})</text>
                  </g>
                ))}

                {/* 5. MEP Utilities (Sump, Septic, DB) */}
                {shouldRender('mep') && mepList.map(m => (
                  <g key={m.id} onMouseDown={(e) => handleElementMouseDown(e, 'mep', m)}>
                    <rect
                      x={m.x} y={m.y} width={m.w} height={m.h}
                      fill="#06b6d425" stroke="#06b6d4" strokeWidth={1.5 / zoom} rx={2}
                    />
                    <text x={m.x + m.w / 2} y={m.y + m.h / 2} fill="#22d3ee" fontSize={7 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">{m.label}</text>
                  </g>
                ))}

                {/* 6. Staircases */}
                {shouldRender('stairs') && stairsList.map(st => (
                  <g key={st.id} onMouseDown={(e) => handleElementMouseDown(e, 'stairs', st)}>
                    <rect x={st.x} y={st.y} width={st.w} height={st.h} fill="#33415544" stroke="#94a3b8" strokeWidth={1.2 / zoom} />
                    {Array.from({ length: 7 }).map((_, i) => (
                      <line key={i} x1={st.x} y1={st.y + (i * st.h) / 7} x2={st.x + st.w} y2={st.y + (i * st.h) / 7} stroke="#94a3b8" strokeWidth={0.6 / zoom} />
                    ))}
                    <text x={st.x + st.w / 2} y={st.y + st.h / 2} fill="#e2e8f0" fontSize={7 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">UP</text>
                  </g>
                ))}

                {/* 7. Furniture Blocks */}
                {shouldRender('furniture') && furnitureList.map(f => (
                  <g
                    key={f.id}
                    transform={`rotate(${f.rotation || 0}, ${f.x + f.w / 2}, ${f.y + f.h / 2})`}
                    onMouseDown={(e) => handleElementMouseDown(e, 'furniture', f)}
                  >
                    <rect
                      x={f.x} y={f.y} width={f.w} height={f.h}
                      fill="#ec489922" stroke={selectedEl?.id === f.id ? '#f43f5e' : '#ec4899'} strokeWidth={1 / zoom} rx={2}
                    />
                    <text x={f.x + f.w / 2} y={f.y + f.h / 2} fill="#f472b6" fontSize={6.5 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" dominantBaseline="middle">{f.label}</text>
                  </g>
                ))}

                {/* 8. Masonry Walls */}
                {shouldRender('walls') && wallsList.map(w => {
                  const wt = w.thickness === 0.115 ? 4 : 8;
                  const lenPx = dist({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
                  const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
                  const isGlass = w.wallType === 'glass_facade';
                  const isSelected = selectedEl?.id === w.id;

                  return (
                    <g key={w.id} onMouseDown={(e) => handleElementMouseDown(e, 'walls', w)}>
                      <line
                        x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                        stroke={isSelected ? '#38bdf8' : isGlass ? '#38bdf8' : w.wallType === 'exterior' ? '#0ea5e9' : '#64748b'}
                        strokeWidth={wt / zoom}
                        strokeLinecap="square"
                      />
                      <text x={mx} y={my - 6 / zoom} fill="#94a3b8" fontSize={7 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{pxToM(lenPx)}m</text>

                      {/* Grip Points */}
                      {isSelected && (
                        <>
                          <rect
                            x={w.x1 - 3 / zoom} y={w.y1 - 3 / zoom} width={6 / zoom} height={6 / zoom}
                            fill="#0284c7" stroke="#ffffff" strokeWidth={0.5 / zoom}
                            onMouseDown={(e) => { e.stopPropagation(); setSelectedGrip('start'); }}
                          />
                          <rect
                            x={w.x2 - 3 / zoom} y={w.y2 - 3 / zoom} width={6 / zoom} height={6 / zoom}
                            fill="#0284c7" stroke="#ffffff" strokeWidth={0.5 / zoom}
                            onMouseDown={(e) => { e.stopPropagation(); setSelectedGrip('end'); }}
                          />
                        </>
                      )}
                    </g>
                  );
                })}

                {/* 9. Columns */}
                {shouldRender('columns') && columnsList.map(col => (
                  <g key={col.id} onMouseDown={(e) => handleElementMouseDown(e, 'columns', col)}>
                    <rect
                      x={col.x} y={col.y} width={col.w} height={col.h}
                      fill="#818cf866" stroke="#818cf8" strokeWidth={1.5 / zoom}
                    />
                    <line x1={col.x} y1={col.y} x2={col.x + col.w} y2={col.y + col.h} stroke="#818cf8" strokeWidth={0.6 / zoom} />
                    <line x1={col.x + col.w} y1={col.y} x2={col.x} y2={col.y + col.h} stroke="#818cf8" strokeWidth={0.6 / zoom} />
                    <text x={col.x + col.w / 2} y={col.y - 3 / zoom} fill="#a5b4fc" fontSize={6.5 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{col.label}</text>
                  </g>
                ))}

                {/* 10. Doors */}
                {shouldRender('doors') && doorsList.map(d => (
                  <g key={d.id} transform={`rotate(${d.rotation || 0}, ${d.x}, ${d.y})`} onMouseDown={(e) => handleElementMouseDown(e, 'doors', d)}>
                    <line x1={d.x} y1={d.y} x2={d.x + d.w} y2={d.y} stroke="#f59e0b" strokeWidth={3 / zoom} strokeLinecap="round" />
                    <path d={`M ${d.x} ${d.y} A ${d.w} ${d.w} 0 0 1 ${d.x + d.w} ${d.y + d.w}`} fill="none" stroke="#f59e0b" strokeWidth={0.8 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} />
                  </g>
                ))}

                {/* 11. Windows */}
                {shouldRender('windows') && windowsList.map(w => (
                  <g key={w.id} onMouseDown={(e) => handleElementMouseDown(e, 'windows', w)}>
                    <rect x={w.x} y={w.y} width={w.w} height={8 / zoom} fill="#064e3b" stroke="#34d399" strokeWidth={1.2 / zoom} />
                    <text x={w.x + w.w / 2} y={w.y - 4 / zoom} fill="#34d399" fontSize={6 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{w.label}</text>
                  </g>
                ))}

                {/* 12. Dimensions */}
                {shouldRender('dimensions') && dimensionsList.map(d => (
                  <g key={d.id} onMouseDown={(e) => handleElementMouseDown(e, 'dimensions', d)}>
                    <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#e2e8f0" strokeWidth={0.8 / zoom} />
                    <line x1={d.x1} y1={d.y1 - 8 / zoom} x2={d.x1} y2={d.y1 + 8 / zoom} stroke="#e2e8f0" strokeWidth={0.8 / zoom} />
                    <line x1={d.x2} y1={d.y2 - 8 / zoom} x2={d.x2} y2={d.y2 + 8 / zoom} stroke="#e2e8f0" strokeWidth={0.8 / zoom} />
                    <text x={(d.x1 + d.x2) / 2} y={d.y1 - 10 / zoom} fill="#f8fafc" fontSize={7.5 / zoom} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">{d.text}</text>
                  </g>
                ))}

                {/* Live Drawing In-Progress Preview */}
                {isDrawing && drawStart && (
                  <line
                    x1={drawStart.x} y1={drawStart.y} x2={cursor.x} y2={cursor.y}
                    stroke="#22d3ee" strokeWidth={3 / zoom} strokeDasharray={`${5 / zoom} ${3 / zoom}`}
                  />
                )}

              </g>
            </svg>
          ) : (
            <div ref={mountRef} className="w-full h-full bg-[#0a1214]" />
          )}
        </div>

        {/* ═══════════════════ ARCHITECTURAL SCHEDULE SLIDEOUT ═══════════════════ */}
        {showSchedule && (
          <div style={{ width: scheduleW }} className="relative max-w-[85%] bg-[#0e1a1d] border-l border-[#1d3338] flex flex-col shrink-0 text-xs overflow-y-auto p-4 space-y-4">
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize schedule panel"
              title="Drag to resize. Double-click to reset."
              onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } dragSchedule.current = { x: e.clientX, w: scheduleW }; }}
              onPointerMove={(e) => { const d = dragSchedule.current; if (d) setScheduleW(Math.max(240, Math.min(720, d.w + d.x - e.clientX))); }}
              onPointerUp={() => { dragSchedule.current = null; }}
              onPointerCancel={() => { dragSchedule.current = null; }}
              onDoubleClick={() => setScheduleW(320)}
              className="group absolute inset-y-0 left-0 z-10 flex w-4 cursor-col-resize touch-none items-center justify-center"
            >
              <ResizeGrip vertical />
            </div>
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h3 className="font-bold text-ink font-sans">Building Schedule</h3>
              <button onClick={() => setShowSchedule(false)} className="rounded-lg px-2 py-1 text-[13px] font-semibold text-ink hover:bg-sunken">Close</button>
            </div>

            <div className="bg-surface rounded-lg border border-line p-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted">Footings (F)</span><span className="text-accent font-bold">{metrics.fdns} Units</span></div>
              <div className="flex justify-between"><span className="text-muted">RCC Columns (C)</span><span className="text-primary font-bold">{metrics.cols} Units</span></div>
              <div className="flex justify-between"><span className="text-muted">Plinth Beams</span><span className="text-primary font-bold">{metrics.beams} Beams</span></div>
              <div className="flex justify-between"><span className="text-muted">Masonry Walls</span><span className="text-ink font-bold">{metrics.wallLen} m</span></div>
              <div className="flex justify-between"><span className="text-muted">Doors / Windows</span><span className="text-ink font-bold">{metrics.doors} D / {metrics.windows} W</span></div>
              <div className="flex justify-between"><span className="text-muted">Estimated Bricks</span><span className="text-accent font-bold">{metrics.bricks.toLocaleString('en-IN')} Nos</span></div>
            </div>

            <button
              onClick={handlePushToMasterBOQ}
              className="w-full py-2.5 bg-primary text-on-primary rounded-lg font-semibold text-xs hover:bg-sunken transition-all"
            >
              Export Takeoff to Master BOQ
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════ FOOTER STATUS BAR ═══════════════════ */}
      <div className="shrink-0 bg-[#0a1214] border-t border-[#1d3338] px-3 py-1.5 flex items-center gap-4 text-[13px] font-medium text-muted whitespace-nowrap">
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-primary font-bold uppercase">{activeTool}</span>
          <span>X <strong className="text-ink tabular-nums">{pxToM(cursor.x)} m</strong></span>
          <span>Y <strong className="text-ink tabular-nums">{pxToM(cursor.y)} m</strong></span>
          <span className={orthoMode ? 'text-primary font-bold' : ''}>ORTHO {orthoMode ? 'ON' : 'OFF'}</span>
          <span className={snapGrid ? 'text-primary font-bold' : ''}>SNAP {snapGrid ? 'ON' : 'OFF'}</span>
        </div>
        <span className="hidden min-w-0 flex-1 truncate border-l border-[#1d3338] pl-4 sm:block" title={cmdLog[cmdLog.length - 1]}>{cmdLog[cmdLog.length - 1]}</span>
        <span className="ml-auto hidden shrink-0 text-ink-2 sm:block">Scale 1:50 · 20 px = 1.0 m</span>
      </div>

      {/* Drag down to make the whole drawing workspace taller (the page scrolls). Double-click resets. */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize workspace height"
        title="Drag to make the workspace taller or shorter. Double-click to reset."
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } dragStudio.current = { y: e.clientY, h: studioRef.current ? studioRef.current.offsetHeight : 0 }; }}
        onPointerMove={(e) => { const d = dragStudio.current; if (d) setStudioH(Math.max(320, Math.min(3000, d.h + e.clientY - d.y))); }}
        onPointerUp={() => { dragStudio.current = null; }}
        onPointerCancel={() => { dragStudio.current = null; }}
        onDoubleClick={() => setStudioH(null)}
        className="group flex h-4 shrink-0 cursor-row-resize touch-none items-center justify-center border-t border-[#1d3338] bg-[#0e1a1d]"
      >
        <ResizeGrip />
      </div>

      </div>
      </div>
    </div>
  );
}
