import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';


const plasterTypes = [
  { id: 'internal_12', name: 'Internal Wall Plaster (12mm, 1:4 Mix)', thickMm: 12, ratio: [1, 4], dryFactor: 1.33 },
  { id: 'internal_15', name: 'Internal Rough / Brick Wall (15mm, 1:5 Mix)', thickMm: 15, ratio: [1, 5], dryFactor: 1.33 },
  { id: 'external_20', name: 'External Weatherproof Double Coat (20mm, 1:4 Mix)', thickMm: 20, ratio: [1, 4], dryFactor: 1.35 },
  { id: 'ceiling_6', name: 'Ceiling / RCC Soffit Plaster (6mm, 1:3 Rich Mix)', thickMm: 6, ratio: [1, 3], dryFactor: 1.30 },
  { id: 'neat_cement', name: 'Neat Cement Punning / Skim Coat', thickMm: 3, ratio: [1, 1], dryFactor: 1.25 }
];

export default function PlasterCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    plasterTypeId: 'internal_12',
    areaSqft: 1200,
    directArea: 0,
    wallLength: 30,
    wallHeight: 10,
    bothSides: false,
    addWaterproofingLiquid: true,
    wastage: 10,
    cementBagPrice: 380,
    sandPricePerTon: 1400,
    laborRatePerSqft: 18,
    currency: '₹'
  });

  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let parsed = type === 'checkbox' ? checked : (['currency', 'plasterTypeId'].includes(name) ? value : parseFloat(value) || 0);
    if (typeof parsed === 'number') parsed = Math.max(0, parsed);
    setInputs(prev => ({ ...prev, [name]: parsed }));
  };

  const handlePrint = () => window.print();

  // --- Three.js Setup ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
    sceneRef.current = scene;

    const container = mountRef.current;
    if (!container) return;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(10, 8, 12);
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
    controls.maxDistance = 200;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(15, 20, 15);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(30, 30, 0x0ea5e9, 0x334155);
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

  // --- Calculation & 3D Rendering ---

  function calculateAndRender() {
    const { plasterTypeId, areaSqft, wallLength, wallHeight, bothSides, addWaterproofingLiquid, wastage, cementBagPrice, sandPricePerTon, laborRatePerSqft } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedPlaster = plasterTypes.find(p => p.id === plasterTypeId) || plasterTypes[0];

    const lenFt = wallLength * (unitSystem === 'm' ? 3.28084 : 1);
    const htFt = wallHeight * (unitSystem === 'm' ? 3.28084 : 1);
    let totalAreaSqft = (lenFt * htFt) * (bothSides ? 2 : 1);
    if (totalAreaSqft <= 0) totalAreaSqft = areaSqft || 500;

    const totalAreaSqm = totalAreaSqft / 10.7639;
    const thickM = selectedPlaster.thickMm * 0.001;

    const wetVolM3 = totalAreaSqm * thickM;
    const dryVolM3 = wetVolM3 * selectedPlaster.dryFactor * (1 + (wastage / 100));

    const [cRatio, sRatio] = selectedPlaster.ratio;
    const totalParts = cRatio + sRatio;

    const cementVolM3 = (cRatio / totalParts) * dryVolM3;
    const cementKg = cementVolM3 * 1440;
    const cementBags = Math.ceil(cementKg / 50);

    const sandVolM3 = (sRatio / totalParts) * dryVolM3;
    const sandTons = (sandVolM3 * 1600) / 1000;
    const sandCuFt = sandVolM3 * 35.3147;

    const waterproofingLiters = addWaterproofingLiquid ? (cementBags * 0.2) : 0; // 200ml per bag

    const costCement = cementBags * cementBagPrice;
    const costSand = sandTons * sandPricePerTon;
    const costLabor = totalAreaSqft * laborRatePerSqft;
    const grandTotal = costCement + costSand + costLabor;

    setResults({
      totalAreaSqft,
      totalAreaSqm,
      dryVolM3,
      cementBags,
      sandTons,
      sandCuFt,
      waterproofingLiters,
      costCement,
      costSand,
      costLabor,
      grandTotal,
      selectedPlaster
    });

    // 3D Scene Layered Wall Substrate
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicPlaster') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicPlaster';

    const isBlueprint = visualTheme === 'blueprint';

    // 1. Red Brick Base Substrate
    const brickMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0xb91c1c, wireframe: isBlueprint });
    const brickGeom = new THREE.BoxGeometry(6, 3, 0.4);
    brickGeom.translate(0, 1.5, 0);
    mainGroup.add(new THREE.Mesh(brickGeom, brickMat));

    // 2. Plaster Coat Layer Overlay
    const plasterMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x38bdf8 : 0xd1d5db,
      roughness: 0.9,
      wireframe: isBlueprint
    });
    const plasterGeom = new THREE.BoxGeometry(6, 3, 0.08);
    plasterGeom.translate(0, 1.5, 0.24);
    mainGroup.add(new THREE.Mesh(plasterGeom, plasterMat));

    scene.add(mainGroup);
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, visualTheme]);

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
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Plaster Calculator</h2>
            <p className="text-xs text-muted dark:text-muted">Internal/external wall & ceiling plastering mortar dry volume & sand takeoff</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-sunken dark:bg-sunken p-1 rounded-lg">
            <button onClick={() => setUnitSystem('ft')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'ft' ? 'bg-surface dark:bg-surface text-primary dark:text-primary ' : 'text-muted dark:text-muted'}`}>Feet (ft)</button>
            <button onClick={() => setUnitSystem('m')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'm' ? 'bg-surface dark:bg-surface text-primary dark:text-primary ' : 'text-muted dark:text-muted'}`}>Meters (m)</button>
          </div>

          <button onClick={() => setVisualTheme(v => v === 'realistic' ? 'blueprint' : 'realistic')} className="px-3 py-1.5 bg-sunken dark:bg-sunken hover:bg-sunken dark:hover:bg-line text-ink-2 dark:text-ink-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${visualTheme === 'realistic' ? 'bg-primary' : 'bg-primary'}`}></span>
            {visualTheme === 'realistic' ? 'Realistic' : 'Blueprint'}
          </button>

          <button onClick={handlePrint} className="p-2 bg-sunken dark:bg-sunken hover:bg-sunken dark:hover:bg-line text-ink-2 dark:text-ink-2 rounded-lg text-xs transition-all" title="Print BOQ Report">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </div>

      {/* Grid Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line flex flex-col gap-4">
            <h3 className="text-sm font-bold text-muted dark:text-muted">Plaster Specifications</h3>

            <div>
              <label htmlFor="plaster-plasterTypeId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Plaster Application & Mix</label>
              <select id="plaster-plasterTypeId" name="plasterTypeId" value={inputs.plasterTypeId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                {plasterTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="plaster-wallLength" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Wall Length ({unitSystem})</label>
                <input id="plaster-wallLength" type="number" name="wallLength" value={inputs.wallLength} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="plaster-wallHeight" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Wall Height ({unitSystem})</label>
                <input id="plaster-wallHeight" type="number" name="wallHeight" value={inputs.wallHeight} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="bothSides" name="bothSides" checked={inputs.bothSides} onChange={handleInputChange} className="rounded accent-primary" />
              <label htmlFor="bothSides" className="text-xs text-ink-2 dark:text-ink-2 cursor-pointer">Both Sides Plastering (2x Area)</label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="plaster-cementBagPrice" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Cement Bag ({inputs.currency})</label>
                <input id="plaster-cementBagPrice" type="number" name="cementBagPrice" value={inputs.cementBagPrice} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink" />
              </div>
              <div>
                <label htmlFor="plaster-sandPricePerTon" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Sand / Ton ({inputs.currency})</label>
                <input id="plaster-sandPricePerTon" type="number" name="sandPricePerTon" value={inputs.sandPricePerTon} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-ink text-xs">
              <span className="text-primary font-bold">3D Layered Plaster Substrate</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 px-3 py-2 rounded-lg border border-white/10 text-ink text-right">
              <p className="text-xs text-muted">Cement Quantity</p>
              <p className="text-lg font-bold text-primary">{results?.cementBags || 0} Bags (50kg)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Plaster Area</p>
              <p className="text-base font-bold text-ink dark:text-ink mt-1">{results?.totalAreaSqft?.toFixed(0)} sq.ft</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Sand Required</p>
              <p className="text-base font-bold text-accent mt-1">{results?.sandTons?.toFixed(2)} MT</p>
              <p className="text-xs text-muted">{results?.sandCuFt?.toFixed(0)} cu.ft</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Waterproof Liq.</p>
              <p className="text-base font-bold text-primary mt-1">{results?.waterproofingLiters?.toFixed(1)} L</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Estimated Cost</p>
              <p className="text-base font-bold text-ink mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
