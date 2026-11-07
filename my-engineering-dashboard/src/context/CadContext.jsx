import React, { createContext, useContext, useState, useCallback } from 'react';

const CadContext = createContext();

// ──────────────────────────────────────────────────────────────
// FULL REAL-WORLD BUILDING ARCHITECTURAL & CIVIL TEMPLATES
// ──────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components -- shared template data used by CAD Studio
export const ARCHITECTURAL_TEMPLATES = {
  '2bhk': {
    name: '2-BHK Residential Villa (30ft × 40ft / 9.1m × 12.2m)',
    description: 'Complete with Footings, Plinth Beams, RCC Columns, 230mm Brickwork, Doors, Windows, Staircase & Sump',
    plot: { width: 9.14, length: 12.19 },
    elements: {
      foundations: [
        { id: 'f-1', x: 75, y: 55, w: 42, h: 42, label: 'F1 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
        { id: 'f-2', x: 235, y: 55, w: 42, h: 42, label: 'F2 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
        { id: 'f-3', x: 355, y: 55, w: 42, h: 42, label: 'F3 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
        { id: 'f-4', x: 75, y: 215, w: 42, h: 42, label: 'F4 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
        { id: 'f-5', x: 235, y: 215, w: 42, h: 42, label: 'F5 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
        { id: 'f-6', x: 355, y: 215, w: 42, h: 42, label: 'F6 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
        { id: 'f-7', x: 75, y: 415, w: 42, h: 42, label: 'F7 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
        { id: 'f-8', x: 235, y: 415, w: 42, h: 42, label: 'F8 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
        { id: 'f-9', x: 355, y: 415, w: 42, h: 42, label: 'F9 (1.8×1.8m)', layer: 'foundations', depth: 1.5 },
      ],
      columns: [
        { id: 'col-1', x: 92, y: 72, w: 16, h: 16, label: 'C1', layer: 'columns', size: '230×380mm' },
        { id: 'col-2', x: 252, y: 72, w: 16, h: 16, label: 'C2', layer: 'columns', size: '230×380mm' },
        { id: 'col-3', x: 372, y: 72, w: 16, h: 16, label: 'C3', layer: 'columns', size: '230×380mm' },
        { id: 'col-4', x: 92, y: 232, w: 16, h: 16, label: 'C4', layer: 'columns', size: '230×380mm' },
        { id: 'col-5', x: 252, y: 232, w: 16, h: 16, label: 'C5', layer: 'columns', size: '230×380mm' },
        { id: 'col-6', x: 372, y: 232, w: 16, h: 16, label: 'C6', layer: 'columns', size: '230×380mm' },
        { id: 'col-7', x: 92, y: 432, w: 16, h: 16, label: 'C7', layer: 'columns', size: '230×380mm' },
        { id: 'col-8', x: 252, y: 432, w: 16, h: 16, label: 'C8', layer: 'columns', size: '230×380mm' },
        { id: 'col-9', x: 372, y: 432, w: 16, h: 16, label: 'C9', layer: 'columns', size: '230×380mm' },
      ],
      beams: [
        // Perimeter Plinth / Tie Beams (Connecting columns)
        { id: 'bm-1', x1: 100, y1: 80, x2: 380, y2: 80, width: 0.23, depth: 0.45, label: 'PB1 (230×450)', type: 'plinth' },
        { id: 'bm-2', x1: 380, y1: 80, x2: 380, y2: 440, width: 0.23, depth: 0.45, label: 'PB2 (230×450)', type: 'plinth' },
        { id: 'bm-3', x1: 380, y1: 440, x2: 100, y2: 440, width: 0.23, depth: 0.45, label: 'PB3 (230×450)', type: 'plinth' },
        { id: 'bm-4', x1: 100, y1: 440, x2: 100, y2: 80, width: 0.23, depth: 0.45, label: 'PB4 (230×450)', type: 'plinth' },
        // Secondary Internal Beams
        { id: 'bm-5', x1: 100, y1: 240, x2: 380, y2: 240, width: 0.23, depth: 0.40, label: 'TB1 (230×400)', type: 'floor' },
        { id: 'bm-6', x1: 260, y1: 80, x2: 260, y2: 440, width: 0.23, depth: 0.40, label: 'TB2 (230×400)', type: 'floor' },
      ],
      walls: [
        // 230mm Exterior Load-Bearing / Brick Enclosure
        { id: 'w-ext-1', x1: 100, y1: 80, x2: 380, y2: 80, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
        { id: 'w-ext-2', x1: 380, y1: 80, x2: 380, y2: 440, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
        { id: 'w-ext-3', x1: 380, y1: 440, x2: 100, y2: 440, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
        { id: 'w-ext-4', x1: 100, y1: 440, x2: 100, y2: 80, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
        // 115mm Interior Partitions
        { id: 'w-int-1', x1: 100, y1: 240, x2: 260, y2: 240, thickness: 0.115, wallType: 'interior', layer: 'walls' },
        { id: 'w-int-2', x1: 260, y1: 80, x2: 260, y2: 240, thickness: 0.115, wallType: 'interior', layer: 'walls' },
        { id: 'w-int-3', x1: 260, y1: 240, x2: 260, y2: 440, thickness: 0.115, wallType: 'interior', layer: 'walls' },
        { id: 'w-int-4', x1: 260, y1: 150, x2: 380, y2: 150, thickness: 0.115, wallType: 'interior', layer: 'walls' },
        { id: 'w-int-5', x1: 260, y1: 330, x2: 380, y2: 330, thickness: 0.115, wallType: 'interior', layer: 'walls' },
      ],
      doors: [
        { id: 'd-1', x: 100, y: 380, w: 22, rotation: 0, label: 'Main Door (1.0m)', type: 'teak_entry', layer: 'doors' },
        { id: 'd-2', x: 170, y: 240, w: 18, rotation: 0, label: 'Bed 1 (0.9m)', type: 'flush', layer: 'doors' },
        { id: 'd-3', x: 260, y: 110, w: 15, rotation: 90, label: 'Bath 1 (0.75m)', type: 'pvc_waterproof', layer: 'doors' },
        { id: 'd-4', x: 260, y: 270, w: 18, rotation: 90, label: 'Kitchen (0.9m)', type: 'sliding', layer: 'doors' },
        { id: 'd-5', x: 260, y: 360, w: 15, rotation: 90, label: 'Bath 2 (0.75m)', type: 'pvc_waterproof', layer: 'doors' },
      ],
      windows: [
        { id: 'win-1', x: 160, y: 74, w: 30, rotation: 0, label: 'W1 (1.5×1.2m)', layer: 'windows' },
        { id: 'win-2', x: 320, y: 74, w: 24, rotation: 0, label: 'W2 (1.2×1.2m)', layer: 'windows' },
        { id: 'win-3', x: 94, y: 140, w: 24, rotation: 90, label: 'W3 (1.2×1.2m)', layer: 'windows' },
        { id: 'win-4', x: 94, y: 300, w: 30, rotation: 90, label: 'W4 (1.5×1.2m)', layer: 'windows' },
        { id: 'win-5', x: 374, y: 270, w: 24, rotation: 90, label: 'W5 (1.2×1.2m)', layer: 'windows' },
        { id: 'win-6', x: 200, y: 434, w: 30, rotation: 0, label: 'W6 (1.5×1.2m)', layer: 'windows' },
      ],
      stairs: [
        { id: 'st-1', x: 105, y: 380, w: 36, h: 55, steps: 14, flight: 'dog_legged', label: 'RCC Dog-Legged Staircase', layer: 'stairs' }
      ],
      mep: [
        { id: 'mep-sump', x: 40, y: 80, w: 35, h: 35, type: 'water_sump', label: 'Underground Water Sump (6000L)' },
        { id: 'mep-septic', x: 40, y: 380, w: 40, h: 30, type: 'septic_tank', label: '3-Chamber Septic Tank' },
        { id: 'mep-db', x: 102, y: 360, w: 12, h: 6, type: 'electrical_db', label: 'Main Distribution Board (DB)' },
        { id: 'mep-tank', x: 330, y: 90, w: 28, h: 28, type: 'overhead_tank', label: 'Overhead Water Tank (1500L)' },
      ],
      rooms: [
        { id: 'rm-1', x: 105, y: 245, w: 150, h: 190, name: 'LIVING & FOYER', area: '14.2 m²', floor: 'Italian Marble', color: '#0284c7' },
        { id: 'rm-2', x: 105, y: 85, w: 150, h: 150, name: 'MASTER BEDROOM', area: '11.3 m²', floor: 'Wooden Parquet', color: '#818cf8' },
        { id: 'rm-3', x: 265, y: 85, w: 110, h: 60, name: 'ATTACHED TOILET', area: '3.3 m²', floor: 'Anti-Skid Ceramic', color: '#10b981' },
        { id: 'rm-4', x: 265, y: 155, w: 110, h: 80, name: 'GUEST BEDROOM', area: '4.4 m²', floor: 'Vitrified Tiles', color: '#fbbf24' },
        { id: 'rm-5', x: 265, y: 245, w: 110, h: 80, name: 'MODULAR KITCHEN', area: '4.4 m²', floor: 'Granite Counter', color: '#f97316' },
        { id: 'rm-6', x: 265, y: 335, w: 110, h: 100, name: 'DINING & UTILITY', area: '5.5 m²', floor: 'Vitrified Tiles', color: '#06b6d4' },
      ],
      furniture: [
        { id: 'f-bed1', type: 'bed', x: 120, y: 95, w: 40, h: 44, label: 'King Bed' },
        { id: 'f-bed2', type: 'bed', x: 280, y: 165, w: 34, h: 40, label: 'Queen Bed' },
        { id: 'f-sofa', type: 'sofa', x: 145, y: 310, w: 45, h: 22, label: '3-Seater Sofa' },
        { id: 'f-dining', type: 'dining', x: 285, y: 355, w: 32, h: 32, label: 'Dining Table' },
        { id: 'f-kitchen', type: 'kitchen_counter', x: 270, y: 250, w: 85, h: 16, label: 'Counter + Hob + Sink' },
        { id: 'f-wc1', type: 'toilet', x: 330, y: 95, w: 16, h: 18, label: 'WC' },
        { id: 'f-wc2', type: 'toilet', x: 330, y: 395, w: 16, h: 18, label: 'WC' },
      ],
      slabs: [
        { id: 'slab-roof', x: 100, y: 80, w: 280, h: 360, thickness: 0.15, label: 'RCC Roof Slab (14m × 18m)', layer: 'slabs' },
      ],
      dimensions: [
        { id: 'dim-top', x1: 100, y1: 50, x2: 380, y2: 50, text: '14.00 m (45.9 ft)', layer: 'dimensions' },
        { id: 'dim-left', x1: 55, y1: 80, x2: 55, y2: 440, text: '18.00 m (59.0 ft)', layer: 'dimensions' },
      ],
      annotations: [
        { id: 'ann-north', x: 420, y: 90, text: '⬆ TRUE NORTH', layer: 'annotations' },
        { id: 'ann-lvl-plinth', x: 100, y: 460, text: 'PLINTH LEVEL: +0.60m (GL ±0.00)', layer: 'annotations' },
      ]
    }
  },
  'commercial_office': {
    name: 'Commercial Office / Showroom (45ft × 60ft / 13.7m × 18.3m)',
    description: 'Open Plan Layout, Heavy RCC Columns, Shear Walls, Glass Facade, Fire Exit Staircase & Server Room',
    plot: { width: 13.7, length: 18.3 },
    elements: {
      foundations: [
        { id: 'fc-1', x: 60, y: 40, w: 50, h: 50, label: 'F1 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
        { id: 'fc-2', x: 260, y: 40, w: 50, h: 50, label: 'F2 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
        { id: 'fc-3', x: 440, y: 40, w: 50, h: 50, label: 'F3 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
        { id: 'fc-4', x: 60, y: 260, w: 50, h: 50, label: 'F4 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
        { id: 'fc-5', x: 260, y: 260, w: 50, h: 50, label: 'F5 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
        { id: 'fc-6', x: 440, y: 260, w: 50, h: 50, label: 'F6 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
        { id: 'fc-7', x: 60, y: 460, w: 50, h: 50, label: 'F7 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
        { id: 'fc-8', x: 260, y: 460, w: 50, h: 50, label: 'F8 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
        { id: 'fc-9', x: 440, y: 460, w: 50, h: 50, label: 'F9 Mat (2.5m)', layer: 'foundations', depth: 2.0 },
      ],
      columns: [
        { id: 'colc-1', x: 75, y: 55, w: 20, h: 20, label: 'C1 (450×450)', layer: 'columns' },
        { id: 'colc-2', x: 275, y: 55, w: 20, h: 20, label: 'C2 (450×450)', layer: 'columns' },
        { id: 'colc-3', x: 455, y: 55, w: 20, h: 20, label: 'C3 (450×450)', layer: 'columns' },
        { id: 'colc-4', x: 75, y: 275, w: 20, h: 20, label: 'C4 (450×450)', layer: 'columns' },
        { id: 'colc-5', x: 275, y: 275, w: 20, h: 20, label: 'C5 (450×450)', layer: 'columns' },
        { id: 'colc-6', x: 455, y: 275, w: 20, h: 20, label: 'C6 (450×450)', layer: 'columns' },
        { id: 'colc-7', x: 75, y: 475, w: 20, h: 20, label: 'C7 (450×450)', layer: 'columns' },
        { id: 'colc-8', x: 275, y: 475, w: 20, h: 20, label: 'C8 (450×450)', layer: 'columns' },
        { id: 'colc-9', x: 455, y: 475, w: 20, h: 20, label: 'C9 (450×450)', layer: 'columns' },
      ],
      beams: [
        { id: 'bmc-1', x1: 85, y1: 65, x2: 465, y2: 65, width: 0.30, depth: 0.60, label: 'Heavy Beam 1' },
        { id: 'bmc-2', x1: 85, y1: 285, x2: 465, y2: 285, width: 0.30, depth: 0.60, label: 'Heavy Beam 2' },
        { id: 'bmc-3', x1: 85, y1: 485, x2: 465, y2: 485, width: 0.30, depth: 0.60, label: 'Heavy Beam 3' },
      ],
      walls: [
        { id: 'wc-1', x1: 85, y1: 65, x2: 465, y2: 65, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
        { id: 'wc-2', x1: 465, y1: 65, x2: 465, y2: 485, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
        { id: 'wc-3', x1: 465, y1: 485, x2: 85, y2: 485, thickness: 0.23, wallType: 'glass_facade', layer: 'walls' },
        { id: 'wc-4', x1: 85, y1: 485, x2: 85, y2: 65, thickness: 0.23, wallType: 'exterior', layer: 'walls' },
      ],
      doors: [
        { id: 'dc-main', x: 230, y: 485, w: 35, rotation: 0, label: 'Glass Automatic Entrance', layer: 'doors' },
        { id: 'dc-fire', x: 85, y: 120, w: 22, rotation: 90, label: 'Fire Exit Door', layer: 'doors' },
      ],
      windows: [
        { id: 'winc-1', x: 140, y: 60, w: 45, rotation: 0, label: 'Continuous Curtain Glazing', layer: 'windows' },
      ],
      stairs: [
        { id: 'stc-1', x: 90, y: 80, w: 40, h: 60, steps: 20, flight: 'fire_escape', label: 'Enclosed Fire Staircase', layer: 'stairs' }
      ],
      mep: [
        { id: 'mepc-gen', x: 30, y: 60, w: 40, h: 30, type: 'generator', label: '125 kVA Diesel Generator' },
        { id: 'mepc-server', x: 380, y: 80, w: 30, h: 25, type: 'server_rack', label: 'Server & IT Rack' },
      ],
      rooms: [
        { id: 'rmc-open', x: 90, y: 150, w: 370, h: 330, name: 'OPEN WORKSPACE & SHOWROOM', area: '61.0 m²', floor: 'Epoxy Hardened', color: '#0284c7' },
        { id: 'rmc-conf', x: 280, y: 70, w: 180, h: 80, name: 'CONFERENCE ROOM', area: '14.4 m²', floor: 'Acoustic Carpet', color: '#818cf8' },
      ],
      slabs: [
        { id: 'slabc-1', x: 85, y: 65, w: 380, h: 420, thickness: 0.20, label: 'Post-Tensioned Flat Slab', layer: 'slabs' }
      ],
      furniture: [],
      dimensions: [],
      annotations: []
    }
  }
};

export function CadProvider({ children }) {
  const [cadElements, setCadElements] = useState(() => ARCHITECTURAL_TEMPLATES['2bhk'].elements);
  const [activeTemplate, setActiveTemplate] = useState('2bhk');
  const [projectTitle, setProjectTitle] = useState('My Dream Home (Architectural Draft)');
  const [pendingImports, setPendingImports] = useState([]);
  const [navigateToCad, setNavigateToCad] = useState(null);

  const loadTemplate = useCallback((templateKey) => {
    const template = ARCHITECTURAL_TEMPLATES[templateKey];
    if (template) {
      setCadElements(template.elements);
      setActiveTemplate(templateKey);
    }
  }, []);

  const addToCad = useCallback((shape) => {
    setPendingImports((prev) => [...prev, { ...shape, id: `import-${Date.now()}-${Math.random()}` }]);
    if (navigateToCad) navigateToCad();
  }, [navigateToCad]);

  const registerCadNavigator = useCallback((fn) => {
    setNavigateToCad(() => fn);
  }, []);

  const consumePendingImports = useCallback(() => {
    const imports = pendingImports;
    setPendingImports([]);
    return imports;
  }, [pendingImports]);

  return (
    <CadContext.Provider value={{
      cadElements,
      setCadElements,
      activeTemplate,
      loadTemplate,
      projectTitle,
      setProjectTitle,
      pendingImports,
      addToCad,
      registerCadNavigator,
      consumePendingImports,
      ARCHITECTURAL_TEMPLATES,
    }}>
      {children}
    </CadContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export function useCad() {
  const ctx = useContext(CadContext);
  if (!ctx) throw new Error('useCad must be used within a CadProvider');
  return ctx;
}
