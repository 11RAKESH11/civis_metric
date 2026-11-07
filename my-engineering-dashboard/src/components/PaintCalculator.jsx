import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';


const paintTypes = [
  { id: 'interior_emulsion', name: 'Interior Premium Emulsion', coveragePerLiterSqft: 140, primerCoats: 1, puttyCoats: 2, paintCoats: 2, color: '#f8fafc' },
  { id: 'exterior_weather', name: 'Exterior Weatherproof Emulsion', coveragePerLiterSqft: 110, primerCoats: 1, puttyCoats: 1, paintCoats: 2, color: '#fef08a' },
  { id: 'enamel_gloss', name: 'Synthetic Enamel (Doors/Metal)', coveragePerLiterSqft: 120, primerCoats: 1, puttyCoats: 0, paintCoats: 2, color: '#93c5fd' },
  { id: 'distemper', name: 'Acrylic Distemper (Economy)', coveragePerLiterSqft: 160, primerCoats: 1, puttyCoats: 1, paintCoats: 2, color: '#f1f5f9' }
];

export default function PaintCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    paintTypeId: 'interior_emulsion',
    roomLength: 16,
    roomWidth: 12,
    roomHeight: 10,
    includeCeiling: true,
    doorCount: 2,
    doorWidth: 3,
    doorHeight: 7,
    windowCount: 2,
    windowWidth: 4,
    windowHeight: 4,
    // Rates
    paintPricePerLiter: 380,
    primerPricePerLiter: 180,
    puttyPricePerKg: 28,
    laborRatePerSqft: 15,
    currency: '₹'
  });

  const [wallColor, setWallColor] = useState('#38bdf8');
  const [visualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let parsed = type === 'checkbox' ? checked : (['currency', 'paintTypeId'].includes(name) ? value : parseFloat(value) || 0);
    if (typeof parsed === 'number') parsed = Math.max(0, parsed);
    setInputs(prev => ({ ...prev, [name]: parsed }));
  };

  const handlePrint = () => window.print();

  // --- Three.js Setup ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14171B);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
    sceneRef.current = scene;

    const container = mountRef.current;
    if (!container) return;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(16, 12, 16);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.setSize(initialWidth, initialHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    // Wheel zoom only after the model is clicked, so scrolling over it scrolls the page;
    // on touch, vertical drags keep scrolling the page.
    controls.enableZoom = false;
    renderer.domElement.style.touchAction = 'pan-y';
    renderer.domElement.addEventListener('pointerdown', () => { controls.enableZoom = true; });
    renderer.domElement.addEventListener('pointerleave', () => { controls.enableZoom = false; });
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 250;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(15, 20, 15);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(30, 30, 0x0ea5e9, 0x1e293b);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      if (document.hidden || container.clientWidth === 0) return;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      disposeObject(scene);
      renderer.dispose();
    };
  }, []);

  // --- Calculation & 3D Room Rendering ---

  function calculateAndRender() {
    const { paintTypeId, roomLength, roomWidth, roomHeight, includeCeiling, doorCount, doorWidth, doorHeight, windowCount, windowWidth, windowHeight, paintPricePerLiter, primerPricePerLiter, puttyPricePerKg, laborRatePerSqft } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedPaint = paintTypes.find(p => p.id === paintTypeId) || paintTypes[0];

    const lenFt = roomLength * (unitSystem === 'm' ? 3.28084 : 1);
    const widFt = roomWidth * (unitSystem === 'm' ? 3.28084 : 1);
    const htFt = roomHeight * (unitSystem === 'm' ? 3.28084 : 1);

    const grossWallAreaSqft = 2 * (lenFt + widFt) * htFt;
    const ceilingAreaSqft = includeCeiling ? (lenFt * widFt) : 0;

    const doorsAreaSqft = doorCount * (doorWidth * doorHeight);
    const windowsAreaSqft = windowCount * (windowWidth * windowHeight);
    const totalDeductionsSqft = doorsAreaSqft + windowsAreaSqft;

    const netPaintableAreaSqft = Math.max(10, grossWallAreaSqft + ceilingAreaSqft - totalDeductionsSqft);
    const netPaintableAreaSqm = netPaintableAreaSqft / 10.7639;

    // Paint, Primer, Putty Takeoff
    const paintLiters = (netPaintableAreaSqft * selectedPaint.paintCoats) / selectedPaint.coveragePerLiterSqft;
    const primerLiters = (netPaintableAreaSqft * selectedPaint.primerCoats) / (selectedPaint.coveragePerLiterSqft * 1.2);
    const puttyKg = selectedPaint.puttyCoats > 0 ? (netPaintableAreaSqft * selectedPaint.puttyCoats * 0.15) : 0; // ~0.15kg/sqft per coat

    // Cans Breakdown (20L, 10L, 4L, 1L)
    const can20L = Math.floor(paintLiters / 20);
    const rem20 = paintLiters % 20;
    const can10L = Math.floor(rem20 / 10);
    const rem10 = rem20 % 10;
    const can4L = Math.floor(rem10 / 4);
    const can1L = Math.ceil(rem10 % 4);

    // Costing
    const costPaint = paintLiters * paintPricePerLiter;
    const costPrimer = primerLiters * primerPricePerLiter;
    const costPutty = puttyKg * puttyPricePerKg;
    const costLabor = netPaintableAreaSqft * laborRatePerSqft;
    const grandTotal = costPaint + costPrimer + costPutty + costLabor;

    setResults({
      grossWallAreaSqft,
      ceilingAreaSqft,
      netPaintableAreaSqft,
      netPaintableAreaSqm,
      paintLiters,
      primerLiters,
      puttyKg,
      can20L,
      can10L,
      can4L,
      can1L,
      costPaint,
      costPrimer,
      costPutty,
      costLabor,
      grandTotal,
      selectedPaint
    });

    // 3D Scene Assembly
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicRoom') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicRoom';

    const isBlueprint = visualTheme === 'blueprint';
    const paintedColor = isBlueprint ? 0x0ea5e9 : parseInt(wallColor.replace('#', '0x'));
    const wallMat = new THREE.MeshStandardMaterial({
      color: paintedColor,
      roughness: 0.7,
      wireframe: isBlueprint,
      side: THREE.DoubleSide
    });

    const rL = lenFt * 0.2, rW = widFt * 0.2, rH = htFt * 0.2;

    // 4 Walls
    const makeWall = (wL, posX, posZ, rotY) => {
      const g = new THREE.BoxGeometry(wL, rH, 0.1);
      g.translate(0, rH / 2, 0);
      const m = new THREE.Mesh(g, wallMat);
      m.position.set(posX, 0, posZ);
      m.rotation.y = rotY;
      mainGroup.add(m);
    };

    makeWall(rL, 0, -rW/2, 0);
    makeWall(rW, -rL/2, 0, Math.PI / 2);
    makeWall(rW, rL/2, 0, Math.PI / 2);

    // Floor
    const floorG = new THREE.PlaneGeometry(rL, rW);
    floorG.rotateX(-Math.PI / 2);
    const floorM = new THREE.Mesh(floorG, new THREE.MeshStandardMaterial({ color: 0x64748b, side: THREE.DoubleSide }));
    floorM.position.y = 0.01;
    mainGroup.add(floorM);

    scene.add(mainGroup);
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, wallColor, visualTheme]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-surface rounded-lg border border-line dark:border-line">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Paint Calculator</h2>
            <p className="text-xs text-muted dark:text-muted">Putty, primer, paint can sizes & interactive 3D room painter</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-sunken dark:bg-sunken p-1 rounded-lg">
            <button onClick={() => setUnitSystem('ft')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'ft' ? 'bg-surface dark:bg-surface text-primary dark:text-primary ' : 'text-muted dark:text-muted'}`}>Feet (ft)</button>
            <button onClick={() => setUnitSystem('m')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'm' ? 'bg-surface dark:bg-surface text-primary dark:text-primary ' : 'text-muted dark:text-muted'}`}>Meters (m)</button>
          </div>

          <div className="flex items-center gap-1.5 bg-sunken dark:bg-sunken px-2 py-1 rounded-lg">
            <span className="text-xs font-semibold text-muted">Color:</span>
            <input aria-label="Color:" type="color" value={wallColor} onChange={e => setWallColor(e.target.value)} className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0" />
          </div>

          <button onClick={handlePrint} className="p-2 bg-sunken dark:bg-sunken hover:bg-sunken dark:hover:bg-line text-ink-2 dark:text-ink-2 rounded-lg text-xs transition-all" title="Print BOQ Report">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </div>

      {/* Grid Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line flex flex-col gap-4">
            <h3 className="text-sm font-bold text-muted dark:text-muted">Room & Paint System</h3>

            <div>
              <label htmlFor="paint-paintTypeId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Paint System Type</label>
              <select id="paint-paintTypeId" name="paintTypeId" value={inputs.paintTypeId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                {paintTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="paint-roomLength" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Length ({unitSystem})</label>
                <input id="paint-roomLength" type="number" name="roomLength" value={inputs.roomLength} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="paint-roomWidth" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Width ({unitSystem})</label>
                <input id="paint-roomWidth" type="number" name="roomWidth" value={inputs.roomWidth} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="paint-roomHeight" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Height ({unitSystem})</label>
                <input id="paint-roomHeight" type="number" name="roomHeight" value={inputs.roomHeight} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="incCeil" name="includeCeiling" checked={inputs.includeCeiling} onChange={handleInputChange} className="rounded accent-primary" />
              <label htmlFor="incCeil" className="text-xs text-ink-2 dark:text-ink-2 cursor-pointer">Include Ceiling Area in Paint Takeoff</label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="paint-doorCount" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Doors (Count)</label>
                <input id="paint-doorCount" type="number" name="doorCount" value={inputs.doorCount} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink" />
              </div>
              <div>
                <label htmlFor="paint-windowCount" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Windows (Count)</label>
                <input id="paint-windowCount" type="number" name="windowCount" value={inputs.windowCount} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-line shadow-e1 text-ink text-xs">
              <span className="text-primary font-bold">3D Room Painting Preview</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-line shadow-e1 text-ink text-right">
              <p className="text-xs text-muted">Paint Required</p>
              <p className="text-lg font-bold text-error">{results?.paintLiters?.toFixed(1) || 0} Liters ({results?.netPaintableAreaSqft?.toFixed(0)} sq.ft)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Putty (kg)</p>
              <p className="text-base font-bold text-ink dark:text-ink mt-1">{results?.puttyKg?.toFixed(0)} kg</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Primer</p>
              <p className="text-base font-bold text-ink dark:text-ink mt-1">{results?.primerLiters?.toFixed(1)} L</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Can Packages</p>
              <p className="text-xs font-bold text-primary mt-1">{results?.can20L > 0 ? `${results.can20L}x20L ` : ''}{results?.can10L > 0 ? `${results.can10L}x10L ` : ''}{results?.can4L > 0 ? `${results.can4L}x4L ` : ''}{results?.can1L > 0 ? `${results.can1L}x1L` : ''}</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Total Estimate</p>
              <p className="text-base font-bold text-ink mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
