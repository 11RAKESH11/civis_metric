import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const concreteGrades = [
  { id: 'M10', name: 'M10 (1:3:6)', ratio: [1, 3, 6], use: 'PCC Foundation & Leveling Base', psi: 1450 },
  { id: 'M15', name: 'M15 (1:2:4)', ratio: [1, 2, 4], use: 'Plain Concrete, Paths & Footing Beds', psi: 2175 },
  { id: 'M20', name: 'M20 (1:1.5:3)', ratio: [1, 1.5, 3], use: 'Standard RCC Slabs, Beams, Columns', psi: 2900 },
  { id: 'M25', name: 'M25 (1:1:2)', ratio: [1, 1, 2], use: 'Heavy RCC Structural Elements & Raft', psi: 3625 },
  { id: 'M30', name: 'M30 (Design Mix)', ratio: [1, 0.8, 1.8], use: 'Commercial High-Strength Concrete', psi: 4350 }
];

const shapes = [
  { id: 'slab', name: 'Rectangular Slab / Pad' },
  { id: 'cylinder', name: 'Circular Column / Caisson' },
  { id: 'wall', name: 'Retaining Wall' },
  { id: 'curb', name: 'Curb & Gutter' }
];

export default function ConcreteCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    shapeId: 'slab',
    gradeId: 'M20',
    // Dimensions
    length: 20,
    width: 15,
    thickness: 6, // in or cm
    diameter: 3, // ft or m
    height: 10,  // ft or m
    wallTopThick: 8, // in or cm
    wallBaseThick: 14,
    // Engineering Specs
    wastage: 5,
    bagWeightKg: 50,
    truckCapacityM3: 6, // Standard RMC Transit Mixer
    // Rates
    readyMixPricePerM3: 4200,
    cementBagPrice: 380,
    sandPricePerTon: 1400,
    aggregatePricePerTon: 1200,
    currency: '₹'
  });

  const [mode, setMode] = useState('normal'); // normal | advanced | boq
  const [visualTheme, setVisualTheme] = useState('realistic'); // realistic | blueprint
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsed = ['currency', 'shapeId', 'gradeId'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(12, 10, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
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
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.6);
    rimLight.position.set(-15, -5, -15);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(40, 40, 0x0ea5e9, 0x334155);
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

  // --- Calculation & 3D Model Generation ---

  function calculateAndRender() {
    const { shapeId, gradeId, length, width, thickness, diameter, height, wallTopThick, wallBaseThick, wastage, bagWeightKg, truckCapacityM3, readyMixPricePerM3, cementBagPrice, sandPricePerTon, aggregatePricePerTon } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedGrade = concreteGrades.find(g => g.id === gradeId) || concreteGrades[2];

    const lenM = length * unitToMeter[unitSystem];
    const widM = width * unitToMeter[unitSystem];
    const thickM = thickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const diamM = diameter * unitToMeter[unitSystem];
    const htM = height * unitToMeter[unitSystem];
    const wallTopM = wallTopThick * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const wallBaseM = wallBaseThick * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];

    let netWetM3 = 0;
    if (shapeId === 'slab') {
      netWetM3 = lenM * widM * thickM;
    } else if (shapeId === 'cylinder') {
      const radiusM = diamM / 2;
      netWetM3 = Math.PI * Math.pow(radiusM, 2) * htM;
    } else if (shapeId === 'wall') {
      const avgThickM = (wallTopM + wallBaseM) / 2;
      netWetM3 = lenM * htM * avgThickM;
    } else if (shapeId === 'curb') {
      netWetM3 = lenM * 0.4 * 0.25; // Standard curb profile cross section
    }

    if (netWetM3 <= 0) netWetM3 = 2;

    const orderWetM3 = netWetM3 * (1 + (wastage / 100));
    const orderCuYds = orderWetM3 * 1.30795;
    const orderCuFt = orderWetM3 * 35.3147;

    // Dry Volume Conversion Factor: 1.54
    const dryM3 = orderWetM3 * 1.54;
    const [cRatio, sRatio, aRatio] = selectedGrade.ratio;
    const totalParts = cRatio + sRatio + aRatio;

    // Component Takeoff
    const cementVolM3 = (cRatio / totalParts) * dryM3;
    const cementKg = cementVolM3 * 1440; // Cement density = 1440 kg/m3
    const cementBags = Math.ceil(cementKg / (bagWeightKg || 50));

    const sandVolM3 = (sRatio / totalParts) * dryM3;
    const sandTons = (sandVolM3 * 1600) / 1000;

    const aggVolM3 = (aRatio / totalParts) * dryM3;
    const aggTons = (aggVolM3 * 1600) / 1000;

    const waterLiters = cementKg * 0.45; // W/C ratio 0.45
    const rmcTrucks = Math.ceil(orderWetM3 / (truckCapacityM3 || 6));

    // Costing
    const costRMC = orderWetM3 * readyMixPricePerM3;
    const costSiteMix = (cementBags * cementBagPrice) + (sandTons * sandPricePerTon) + (aggTons * aggregatePricePerTon);

    setResults({
      netWetM3,
      orderWetM3,
      orderCuYds,
      orderCuFt,
      dryM3,
      cementBags,
      cementKg,
      sandTons,
      sandVolM3,
      aggTons,
      aggVolM3,
      waterLiters,
      rmcTrucks,
      costRMC,
      costSiteMix,
      selectedGrade
    });

    // --- 3D Scene Assembly ---
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicConcrete') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicConcrete';

    const isBlueprint = visualTheme === 'blueprint';
    const concreteColor = isBlueprint ? 0x0ea5e9 : 0x94a3b8;
    const material = new THREE.MeshStandardMaterial({
      color: concreteColor,
      roughness: 0.9,
      metalness: 0.05,
      wireframe: isBlueprint,
      transparent: isBlueprint,
      opacity: isBlueprint ? 0.5 : 1
    });

    if (shapeId === 'slab') {
      const sL = Math.max(0.5, lenM);
      const sW = Math.max(0.5, widM);
      const sT = Math.max(0.1, thickM);
      const geom = new THREE.BoxGeometry(sL, sT, sW);
      geom.translate(0, sT / 2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    } else if (shapeId === 'cylinder') {
      const sR = Math.max(0.2, diamM / 2);
      const sH = Math.max(0.5, htM);
      const geom = new THREE.CylinderGeometry(sR, sR, sH, 32);
      geom.translate(0, sH / 2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    } else if (shapeId === 'wall') {
      const sL = Math.max(0.5, lenM);
      const sH = Math.max(0.5, htM);
      const sT = Math.max(0.1, (wallTopM + wallBaseM) / 2);
      const geom = new THREE.BoxGeometry(sL, sH, sT);
      geom.translate(0, sH / 2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    } else {
      const sL = Math.max(0.5, lenM);
      const geom = new THREE.BoxGeometry(sL, 0.4, 0.25);
      geom.translate(0, 0.2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    }

    scene.add(mainGroup);
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 200);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, visualTheme]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-surface rounded-lg border border-line dark:border-line">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Concrete Calculator</h2>
            <p className="text-xs text-muted dark:text-muted">Parametric 3D shapes, M7.5-M30 mix breakdown & RMC transit estimator</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-sunken dark:bg-sunken p-1 rounded-lg">
            <button onClick={() => setUnitSystem('ft')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'ft' ? 'bg-surface dark:bg-surface text-primary dark:text-primary ' : 'text-muted dark:text-muted'}`}>Imperial (ft/in)</button>
            <button onClick={() => setUnitSystem('m')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'm' ? 'bg-surface dark:bg-surface text-primary dark:text-primary ' : 'text-muted dark:text-muted'}`}>Metric (m/cm)</button>
          </div>

          <div className="flex bg-sunken dark:bg-sunken p-1 rounded-lg">
            {['normal', 'advanced', 'boq'].map(t => (
              <button key={t} onClick={() => setMode(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${mode === t ? 'bg-primary text-on-primary ' : 'text-muted dark:text-muted'}`}>{t}</button>
            ))}
          </div>

          <button onClick={() => setVisualTheme(v => v === 'realistic' ? 'blueprint' : 'realistic')} className="px-3 py-1.5 bg-sunken dark:bg-sunken hover:bg-sunken dark:hover:bg-line text-ink-2 dark:text-ink-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${visualTheme === 'realistic' ? 'bg-primary' : 'bg-primary'}`}></span>
            {visualTheme === 'realistic' ? 'Realistic 3D' : 'Blueprint Wire'}
          </button>

          <button onClick={handlePrint} className="p-2 bg-sunken dark:bg-sunken hover:bg-sunken dark:hover:bg-line text-ink-2 dark:text-ink-2 rounded-lg text-xs transition-all" title="Print BOQ Report">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </div>

      {/* Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line flex flex-col gap-4">
            <h3 className="text-sm font-bold text-muted dark:text-muted">Structure & Concrete Grade</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="concrete-shapeId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Geometry Shape</label>
                <select id="concrete-shapeId" name="shapeId" value={inputs.shapeId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                  {shapes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="concrete-gradeId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Mix Design Grade</label>
                <select id="concrete-gradeId" name="gradeId" value={inputs.gradeId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                  {concreteGrades.map(g => <option key={g.id} value={g.id}>{g.name} ({g.psi} PSI)</option>)}
                </select>
              </div>
            </div>

            {inputs.shapeId === 'slab' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="concrete-length" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Length ({unitSystem})</label>
                  <input id="concrete-length" type="number" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label htmlFor="concrete-width" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Width ({unitSystem})</label>
                  <input id="concrete-width" type="number" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label htmlFor="concrete-thickness" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Thick ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                  <input id="concrete-thickness" type="number" name="thickness" value={inputs.thickness} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
                </div>
              </div>
            )}

            {inputs.shapeId === 'cylinder' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="concrete-diameter" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Diameter ({unitSystem})</label>
                  <input id="concrete-diameter" type="number" name="diameter" value={inputs.diameter} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label htmlFor="concrete-height" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Height / Depth ({unitSystem})</label>
                  <input id="concrete-height" type="number" name="height" value={inputs.height} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
                </div>
              </div>
            )}

            {inputs.shapeId === 'wall' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="concrete-length-2" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Length ({unitSystem})</label>
                  <input id="concrete-length-2" type="number" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label htmlFor="concrete-height-2" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Height ({unitSystem})</label>
                  <input id="concrete-height-2" type="number" name="height" value={inputs.height} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label htmlFor="concrete-wallBaseThick" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Thick ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                  <input id="concrete-wallBaseThick" type="number" name="wallBaseThick" value={inputs.wallBaseThick} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="concrete-readyMixPricePerM3" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">RMC Rate / m³ ({inputs.currency})</label>
                <input id="concrete-readyMixPricePerM3" type="number" name="readyMixPricePerM3" value={inputs.readyMixPricePerM3} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="concrete-cementBagPrice" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Cement Bag ({inputs.currency})</label>
                <input id="concrete-cementBagPrice" type="number" name="cementBagPrice" value={inputs.cementBagPrice} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[360px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-ink text-xs">
              <span className="text-primary font-bold">3D Parametric Concrete Shape</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 px-3 py-2 rounded-lg border border-white/10 text-ink text-right">
              <p className="text-xs text-muted">Wet Concrete Vol.</p>
              <p className="text-lg font-bold text-primary">{results?.orderWetM3?.toFixed(2) || '0.00'} m³</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Cement Bags</p>
              <p className="text-lg font-bold text-ink dark:text-ink mt-1">{results?.cementBags} Bags</p>
              <p className="text-xs text-muted">{results?.cementKg?.toFixed(0)} kg total</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Sand (Tons)</p>
              <p className="text-lg font-bold text-accent mt-1">{results?.sandTons?.toFixed(2)} MT</p>
              <p className="text-xs text-muted">{results?.sandVolM3?.toFixed(2)} m³</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Aggregate</p>
              <p className="text-lg font-bold text-ink-2 dark:text-ink-2 mt-1">{results?.aggTons?.toFixed(2)} MT</p>
              <p className="text-xs text-muted">{results?.aggVolM3?.toFixed(2)} m³</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">RMC Mixer Trips</p>
              <p className="text-lg font-bold text-primary mt-1">{results?.rmcTrucks} Trucks</p>
              <p className="text-xs text-muted">@{inputs.truckCapacityM3}m³ mixer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
