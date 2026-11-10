import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';
import { useCad } from '../context/CadContext.jsx';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const slabTypes = [
  { id: 'twoway', name: 'Two-Way RCC Slab (Ly/Lx < 2)', rebarFactor: 0.008, desc: 'Supported on all 4 sides' },
  { id: 'oneway', name: 'One-Way RCC Slab (Ly/Lx ≥ 2)', rebarFactor: 0.0065, desc: 'Bending in shorter direction' },
  { id: 'flatslab', name: 'Flat Slab with Drop Panels', rebarFactor: 0.011, desc: 'Directly on columns without beams' },
  { id: 'cantilever', name: 'Cantilever Balcony Slab', rebarFactor: 0.012, desc: 'Top rebar dominant design' }
];

export default function SlabCalculator() {
  const { addToCad } = useCad();
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    slabTypeId: 'twoway',
    length: 20,
    width: 15,
    thickness: 5.5, // in or cm
    clearCoverMm: 20,
    mainBarDia: 10,
    mainBarSpacingMm: 150,
    distBarDia: 8,
    distBarSpacingMm: 175,
    concreteWastage: 5,
    rebarWastage: 5,
    // Rates
    concreteRatePerM3: 4500,
    rebarRatePerKg: 70,
    shutteringRatePerSqm: 350,
    laborRate: 250,
    currency: '₹'
  });

  const [mode, setMode] = useState('normal');
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsed = ['currency', 'slabTypeId'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(16, 12, 18);
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
    dirLight.position.set(20, 25, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.6);
    rimLight.position.set(-15, -5, -15);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(50, 50, 0x0ea5e9, 0x1e293b);
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
    const { slabTypeId, length, width, thickness, concreteWastage, rebarWastage, concreteRatePerM3, rebarRatePerKg, shutteringRatePerSqm, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedSlab = slabTypes.find(s => s.id === slabTypeId) || slabTypes[0];

    const lenM = length * unitToMeter[unitSystem];
    const widM = width * unitToMeter[unitSystem];
    const thickM = thickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];

    const slabAreaSqm = lenM * widM;
    const slabAreaSqft = slabAreaSqm * 10.7639;

    const netConcreteM3 = slabAreaSqm * thickM;
    const totalConcreteM3 = netConcreteM3 * (1 + (concreteWastage / 100));

    // Reinforcement takeoff
    const steelVolumeM3 = netConcreteM3 * selectedSlab.rebarFactor;
    const netRebarKg = steelVolumeM3 * 7850; // Steel density 7850 kg/m3
    const totalRebarKg = netRebarKg * (1 + (rebarWastage / 100));
    const totalRebarMT = totalRebarKg / 1000;

    // Formwork & Shuttering (Soffit bottom + Perimeter sides)
    const perimeterM = 2 * (lenM + widM);
    const shutteringAreaSqm = slabAreaSqm + (perimeterM * thickM);

    // Props estimate
    const propsCount = Math.ceil(slabAreaSqm * 1.2); // ~1 prop per 0.8-1 sqm

    // Costs
    const costConcrete = totalConcreteM3 * concreteRatePerM3;
    const costRebar = totalRebarKg * rebarRatePerKg;
    const costShuttering = shutteringAreaSqm * shutteringRatePerSqm;
    const costLabor = totalConcreteM3 * laborRate;
    const grandTotal = costConcrete + costRebar + costShuttering + costLabor;

    setResults({
      slabAreaSqm,
      slabAreaSqft,
      totalConcreteM3,
      totalRebarKg,
      totalRebarMT,
      shutteringAreaSqm,
      propsCount,
      costConcrete,
      costRebar,
      costShuttering,
      costLabor,
      grandTotal,
      selectedSlab
    });

    // --- 3D Scene Assembly ---
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicSlab') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicSlab';

    const isBlueprint = visualTheme === 'blueprint';
    const concreteColor = isBlueprint ? 0x0ea5e9 : 0x94a3b8;
    const slabMat = new THREE.MeshStandardMaterial({
      color: concreteColor,
      roughness: 0.9,
      wireframe: isBlueprint,
      transparent: true,
      opacity: isBlueprint ? 0.4 : 0.85
    });

    const sL = Math.max(1, lenM);
    const sW = Math.max(1, widM);
    const sT = Math.max(0.1, thickM);
    const propHeight = 3.0; // 3m elevated slab height

    // 1. Slab Body
    const slabGeom = new THREE.BoxGeometry(sL, sT, sW);
    slabGeom.translate(0, propHeight + (sT / 2), 0);
    const slabMesh = new THREE.Mesh(slabGeom, slabMat);
    slabMesh.castShadow = true;
    slabMesh.receiveShadow = true;
    mainGroup.add(slabMesh);

    // 2. Shuttering Support Props Underneath
    const propMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0xca8a04, metalness: 0.4 });
    const numPropsX = Math.max(2, Math.floor(sL / 2));
    const numPropsZ = Math.max(2, Math.floor(sW / 2));

    for (let ix = 0; ix <= numPropsX; ix++) {
      for (let iz = 0; iz <= numPropsZ; iz++) {
        const px = -sL/2 + (ix * (sL / numPropsX));
        const pz = -sW/2 + (iz * (sW / numPropsZ));
        const propGeom = new THREE.CylinderGeometry(0.05, 0.05, propHeight, 12);
        propGeom.translate(px, propHeight / 2, pz);
        const propMesh = new THREE.Mesh(propGeom, propMat);
        mainGroup.add(propMesh);
      }
    }

    // 3. Rebar Mesh Visualization Inside
    const rebarMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    for (let rx = -sL/2 + 0.3; rx <= sL/2 - 0.3; rx += 0.6) {
      const barGeom = new THREE.CylinderGeometry(0.015, 0.015, sW - 0.4, 8);
      barGeom.rotateX(Math.PI / 2);
      barGeom.translate(rx, propHeight + (sT / 2), 0);
      mainGroup.add(new THREE.Mesh(barGeom, rebarMat));
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-surface rounded-lg border border-line dark:border-line">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Slab Calculator</h2>
            <p className="text-xs text-muted dark:text-muted">One-way & two-way RCC slabs, rebar mesh, shuttering props & BOQ</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {results && (
            <button
              onClick={() => addToCad({ type: 'slab', source: 'Slab Calculator', label: `${slabTypes.find(s=>s.id===inputs.slabTypeId)?.name || 'Slab'}`, length: results.slabAreaSqm ? Math.sqrt(results.slabAreaSqm) : 5, width: results.slabAreaSqm ? Math.sqrt(results.slabAreaSqm) : 4, thickness: inputs.thickness * (unitSystem === 'ft' ? 0.0254 : 0.01) })}
              className="px-3 py-1.5 bg-sunken hover:bg-primary text-primary hover:text-ink border border-line-control rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
Add to CAD
            </button>
          )}
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

      {/* Grid Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line flex flex-col gap-4">
            <h3 className="text-sm font-bold text-muted dark:text-muted">Slab Geometry & Reinforcement</h3>

            <div>
              <label htmlFor="slab-slabTypeId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Slab Type</label>
              <select id="slab-slabTypeId" name="slabTypeId" value={inputs.slabTypeId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                {slabTypes.map(s => <option key={s.id} value={s.id}>{s.name} — {s.desc}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="slab-length" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Length ({unitSystem})</label>
                <input id="slab-length" type="number" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="slab-width" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Width ({unitSystem})</label>
                <input id="slab-width" type="number" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="slab-thickness" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Thick ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input id="slab-thickness" type="number" name="thickness" value={inputs.thickness} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="slab-mainBarDia" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Main Bar Dia (mm)</label>
                <input id="slab-mainBarDia" type="number" name="mainBarDia" value={inputs.mainBarDia} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="slab-distBarDia" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Dist. Bar Dia (mm)</label>
                <input id="slab-distBarDia" type="number" name="distBarDia" value={inputs.distBarDia} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="slab-concreteRatePerM3" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Concrete / m³ ({inputs.currency})</label>
                <input id="slab-concreteRatePerM3" type="number" name="concreteRatePerM3" value={inputs.concreteRatePerM3} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="slab-rebarRatePerKg" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Steel / kg ({inputs.currency})</label>
                <input id="slab-rebarRatePerKg" type="number" name="rebarRatePerKg" value={inputs.rebarRatePerKg} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[360px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-line shadow-e1 text-ink text-xs">
              <span className="text-primary font-bold">3D Elevated Slab & Props</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-line shadow-e1 text-ink text-right">
              <p className="text-xs text-muted">Total Slab Area</p>
              <p className="text-lg font-bold text-primary">{results?.slabAreaSqm?.toFixed(2) || '0.00'} m² ({results?.slabAreaSqft?.toFixed(0)} sq.ft)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Concrete Vol</p>
              <p className="text-lg font-bold text-ink dark:text-ink mt-1">{results?.totalConcreteM3?.toFixed(2)} m³</p>
              <p className="text-xs text-muted">Includes 5% waste</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Rebar Total</p>
              <p className="text-lg font-bold text-accent mt-1">{results?.totalRebarKg?.toFixed(0)} kg</p>
              <p className="text-xs text-muted">{results?.totalRebarMT?.toFixed(3)} MT</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Props Count</p>
              <p className="text-lg font-bold text-ink-2 dark:text-ink-2 mt-1">{results?.propsCount} Props</p>
              <p className="text-xs text-muted">{results?.shutteringAreaSqm?.toFixed(1)} m² form</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Estimated Cost</p>
              <p className="text-lg font-bold text-ink mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted">Mat + Shuttering</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
