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
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      return;
    }
    if (e.button !== 0 || viewMode !== '2d') return;
    const pt = screenToWorld(e.clientX, e.clientY);

    if (activeTool === 'select') {
      setSelectedEl(null);
      setSelectedGrip(null);
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

    showToast(`✓ Exported building takeoff directly to Master BOQ!`);
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
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom((prev) => Math.min(4, Math.max(0.3, prev * factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // The drafting board is dark in both themes: "dark" scopes the palette tokens inside it.
  return (
    <div className="dark flex flex-col w-full h-full select-none text-ink font-sans bg-[#080c16] rounded-lg overflow-hidden">

      {/* ═══════════════════ TOP COMMAND HEADER ═══════════════════ */}
      <div className="shrink-0 bg-[#080c16] border-b border-[#1e293b] px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
        
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <input aria-label="Project title"
                type="text"
                value={projectTitle || 'CivisMetric Project'}
                onChange={(e) => setProjectTitle && setProjectTitle(e.target.value)}
                className="bg-transparent text-sm font-bold text-ink outline-none border-b border-transparent hover:border-line focus:border-primary transition-all w-60 truncate"
              />
              <span className="text-xs bg-sunken text-primary px-2 py-0.5 rounded font-mono font-bold border border-line-control">
                BIM Level 2
              </span>
            </div>
            <p className="text-xs text-muted font-mono">
              Built-up: <strong className="text-primary">{metrics.builtupM2}m²</strong> · Carpet: <strong className="text-ink">{metrics.carpetM2}m²</strong> · {metrics.cols} Cols · {metrics.fdns} Footings
            </p>
          </div>
        </div>

        {/* Discipline Filter Tabs (No Visual Clutter) */}
        <div className="flex bg-[#0b1120] rounded-lg border border-[#1e293b] p-0.5">
          {DISCIPLINES.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDiscipline(d.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                activeDiscipline === d.id
                  ? 'bg-primary text-on-primary '
                  : 'text-muted hover:text-ink'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {toastMsg && (
            <span className="text-xs font-bold text-ink bg-sunken border border-line-control px-3 py-1 rounded-lg animate-fade-in">
              {toastMsg}
            </span>
          )}

          {/* Templates Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(p => !p)}
              className="px-3 py-1.5 bg-[#0f172a] hover:bg-sunken border border-line rounded-lg text-xs font-mono font-bold text-ink transition-all flex items-center gap-1"
            >
Templates <ChevronDownIcon />
            </button>
            {showTemplates && templatesList && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0b1120] border border-line rounded-lg p-2 z-50 space-y-1 font-sans">
                {Object.entries(templatesList).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => { if (loadTemplate) loadTemplate(key); setShowTemplates(false); showToast(`Loaded ${t.name}`); }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all ${activeTemplate === key ? 'bg-sunken text-primary border border-line-control' : 'hover:bg-sunken text-ink-2'}`}
                  >
                    <p className="font-bold">{t.name}</p>
                    <p className="text-xs text-muted truncate">{t.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2D / 3D Toggle */}
          <div className="flex bg-[#0b1120] rounded-lg border border-[#1e293b] p-0.5">
            {['2d', '3d'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1 rounded text-xs font-bold font-mono transition-all ${viewMode === m ? 'bg-primary text-on-primary ' : 'text-muted hover:text-ink'}`}
              >
                {m === '2d' ? '2D PLAN' : '3D BIM'}
              </button>
            ))}
          </div>

          {viewMode === '3d' && (
            <button
              onClick={() => setShowRoofIn3D(p => !p)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${showRoofIn3D ? 'bg-sunken border-primary text-primary' : 'border-line text-muted'}`}
            >
              {showRoofIn3D ? 'Roof: ON' : 'Open Top Cutaway'}
            </button>
          )}

          {/* Export to BOQ */}
          <button
            onClick={handlePushToMasterBOQ}
            className="px-3 py-1.5 bg-sunken hover:bg-primary text-ink hover:text-ink border border-line-control rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5"
          >
Export to BOQ
          </button>

          <button
            onClick={() => setShowSchedule(p => !p)}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-all ${showSchedule ? 'bg-sunken text-primary border-primary' : 'border-line text-muted'}`}
          >
            Schedule
          </button>
        </div>
      </div>

      {/* ═══════════════════ CONSTRUCTION ELEMENT PALETTE ═══════════════════ */}
      <div className="shrink-0 bg-[#0b1120] border-b border-[#1e293b] flex items-center gap-2 px-3 py-1.5 overflow-x-auto no-scrollbars">
        
        {/* Pointer / Selection Tool */}
        <button
          onClick={() => setActiveTool('select')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
            activeTool === 'select'
              ? 'bg-primary text-on-primary  scale-105'
              : 'text-ink-2 hover:bg-sunken'
          }`}
        >
Select / Move
        </button>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 pl-2 border-l border-line">
          {COMPONENT_CATEGORIES.map(c => (
            <button
              key={c.cat}
              onClick={() => setActiveDrawerCat(c.cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                activeDrawerCat === c.cat
                  ? 'bg-sunken text-primary font-bold border border-line'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>

        {/* Active Category Tools Drawer */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-line">
          {COMPONENT_CATEGORIES.find(c => c.cat === activeDrawerCat)?.tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.name} · ${tool.hint}`}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all ${
                activeTool === tool.id
                  ? 'bg-primary text-on-primary font-bold border-primary '
                  : 'bg-surface hover:bg-sunken text-ink-2 border-line'
              }`}
            >
              <CadToolIcon id={tool.id} />
              <span>{tool.name}</span>
            </button>
          ))}
        </div>

        {/* Selection Actions (Rotate & Delete) */}
        {selectedEl && (
          <div className="flex items-center gap-1.5 pl-3 ml-auto border-l border-line animate-fade-in">
            <span className="text-xs text-accent font-mono font-bold">Selected: {selectedEl.category}</span>
            <button
              onClick={handleRotateSelected}
              className="px-2 py-1 bg-sunken hover:bg-primary text-primary hover:text-on-primary rounded text-xs font-bold font-mono inline-flex items-center gap-1.5"
            >
              <RotateIcon /> 90°
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-2 py-1 bg-sunken hover:bg-primary text-error hover:text-ink rounded text-xs font-bold font-mono"
            >
              ✕ Del
            </button>
          </div>
        )}

        {/* Snap & Ortho Mode Toggles */}
        <div className="flex items-center gap-1 pl-2 ml-auto border-l border-line">
          <button
            onClick={() => setSnapGrid(p => !p)}
            className={`px-2 py-1 rounded text-xs font-mono font-bold border transition-all ${
              snapGrid ? 'bg-sunken text-primary border-line-control' : 'text-muted border-line'
            }`}
          >
            SNAP (F9)
          </button>
          <button
            onClick={() => setOrthoMode(p => !p)}
            className={`px-2 py-1 rounded text-xs font-mono font-bold border transition-all ${
              orthoMode ? 'bg-sunken text-primary border-line-control' : 'text-muted border-line'
            }`}
          >
            ORTHO (F8)
          </button>
        </div>
      </div>

      {/* ═══════════════════ MAIN VIEWPORT ═══════════════════ */}
      <div className="flex flex-1 overflow-hidden relative">

        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-[#030508]"
          style={{ cursor: activeTool === 'select' ? (isDraggingEl ? 'grabbing' : 'default') : 'crosshair' }}
        >
          {/* Dynamic Distance & Angle Tooltip */}
          {isDrawing && drawStart && (
            <div className="absolute top-3 left-3 z-20 bg-surface border border-primary text-primary px-3 py-1.5 rounded-lg text-xs font-mono pointer-events-none">
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
                  <path d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`} fill="none" stroke="#0f172a" strokeWidth="0.8" />
                </pattern>
                <pattern id="cadGridBigTitanium" width={gridSize * zoom * 5} height={gridSize * zoom * 5} patternUnits="userSpaceOnUse" x={pan.x % (gridSize * zoom * 5)} y={pan.y % (gridSize * zoom * 5)}>
                  <rect width={gridSize * zoom * 5} height={gridSize * zoom * 5} fill="url(#cadGridCleanTitanium)" />
                  <path d={`M ${gridSize * zoom * 5} 0 L 0 0 0 ${gridSize * zoom * 5}`} fill="none" stroke="#1e293b" strokeWidth="1.2" opacity="0.6" />
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
                    <text x={f.x + f.w / 2} y={f.y + f.h / 2} fill="#eab308" fontSize={8 / zoom} fontFamily="monospace" textAnchor="middle" dominantBaseline="middle">{f.label}</text>
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
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 8} fill="#38bdf8" fontSize={8 / zoom} fontFamily="monospace" textAnchor="middle">{r.area} ({r.floor})</text>
                  </g>
                ))}

                {/* 5. MEP Utilities (Sump, Septic, DB) */}
                {shouldRender('mep') && mepList.map(m => (
                  <g key={m.id} onMouseDown={(e) => handleElementMouseDown(e, 'mep', m)}>
                    <rect
                      x={m.x} y={m.y} width={m.w} height={m.h}
                      fill="#06b6d425" stroke="#06b6d4" strokeWidth={1.5 / zoom} rx={2}
                    />
                    <text x={m.x + m.w / 2} y={m.y + m.h / 2} fill="#22d3ee" fontSize={7 / zoom} fontFamily="monospace" textAnchor="middle" dominantBaseline="middle">{m.label}</text>
                  </g>
                ))}

                {/* 6. Staircases */}
                {shouldRender('stairs') && stairsList.map(st => (
                  <g key={st.id} onMouseDown={(e) => handleElementMouseDown(e, 'stairs', st)}>
                    <rect x={st.x} y={st.y} width={st.w} height={st.h} fill="#33415544" stroke="#94a3b8" strokeWidth={1.2 / zoom} />
                    {Array.from({ length: 7 }).map((_, i) => (
                      <line key={i} x1={st.x} y1={st.y + (i * st.h) / 7} x2={st.x + st.w} y2={st.y + (i * st.h) / 7} stroke="#94a3b8" strokeWidth={0.6 / zoom} />
                    ))}
                    <text x={st.x + st.w / 2} y={st.y + st.h / 2} fill="#e2e8f0" fontSize={7 / zoom} fontFamily="monospace" textAnchor="middle">UP</text>
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
                    <text x={f.x + f.w / 2} y={f.y + f.h / 2} fill="#f472b6" fontSize={6.5 / zoom} fontFamily="monospace" textAnchor="middle" dominantBaseline="middle">{f.label}</text>
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
                      <text x={mx} y={my - 6 / zoom} fill="#94a3b8" fontSize={7 / zoom} fontFamily="monospace" textAnchor="middle">{pxToM(lenPx)}m</text>

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
                    <text x={col.x + col.w / 2} y={col.y - 3 / zoom} fill="#a5b4fc" fontSize={6.5 / zoom} fontFamily="monospace" textAnchor="middle">{col.label}</text>
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
                    <text x={w.x + w.w / 2} y={w.y - 4 / zoom} fill="#34d399" fontSize={6 / zoom} fontFamily="monospace" textAnchor="middle">{w.label}</text>
                  </g>
                ))}

                {/* 12. Dimensions */}
                {shouldRender('dimensions') && dimensionsList.map(d => (
                  <g key={d.id} onMouseDown={(e) => handleElementMouseDown(e, 'dimensions', d)}>
                    <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#e2e8f0" strokeWidth={0.8 / zoom} />
                    <line x1={d.x1} y1={d.y1 - 8 / zoom} x2={d.x1} y2={d.y1 + 8 / zoom} stroke="#e2e8f0" strokeWidth={0.8 / zoom} />
                    <line x1={d.x2} y1={d.y2 - 8 / zoom} x2={d.x2} y2={d.y2 + 8 / zoom} stroke="#e2e8f0" strokeWidth={0.8 / zoom} />
                    <text x={(d.x1 + d.x2) / 2} y={d.y1 - 10 / zoom} fill="#f8fafc" fontSize={7.5 / zoom} fontFamily="monospace" textAnchor="middle">{d.text}</text>
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
            <div ref={mountRef} className="w-full h-full bg-[#080c16]" />
          )}
        </div>

        {/* ═══════════════════ ARCHITECTURAL SCHEDULE SLIDEOUT ═══════════════════ */}
        {showSchedule && (
          <div className="w-80 bg-[#0b1120] border-l border-[#1e293b] flex flex-col shrink-0 text-xs overflow-y-auto p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h3 className="font-bold text-ink font-mono">Building Schedule</h3>
              <button onClick={() => setShowSchedule(false)} className="text-muted hover:text-ink">✕</button>
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
              className="w-full py-2.5 bg-primary text-on-primary rounded-lg font-bold font-mono text-xs hover:bg-sunken transition-all"
            >
              Export Takeoff to Master BOQ
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════ FOOTER STATUS BAR ═══════════════════ */}
      <div className="shrink-0 bg-[#080c16] border-t border-[#1e293b] px-3 py-1 flex items-center justify-between text-xs font-mono text-muted">
        <div className="flex items-center gap-3">
          <span className="text-primary font-bold">{activeTool}</span>
          <span>X: <strong className="text-ink">{pxToM(cursor.x)}m</strong></span>
          <span>Y: <strong className="text-ink">{pxToM(cursor.y)}m</strong></span>
          <span className={orthoMode ? 'text-primary font-bold' : ''}>ORTHO: {orthoMode ? 'ON' : 'OFF'}</span>
          <span className={snapGrid ? 'text-primary font-bold' : ''}>SNAP: {snapGrid ? 'ON' : 'OFF'}</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-muted">
          <span>{cmdLog[cmdLog.length - 1]}</span>
          <span className="text-ink-2">|</span>
          <span className="text-muted">Scale 1:50 · 20px=1.0m</span>
        </div>
      </div>

    </div>
  );
}
