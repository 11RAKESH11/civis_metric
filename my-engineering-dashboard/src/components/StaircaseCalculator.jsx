import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const stairTypes = [
  { id: 'straight', name: 'Straight Flight Staircase', desc: 'Single direct flight between floors' },
  { id: 'doglegged', name: 'Dog-Legged (2 Flights + Landing)', desc: 'Reverses direction 180° with intermediate landing' },
  { id: 'openwell', name: 'Open-Well / Quarter Turn', desc: 'Spaced well with 90° or 180° turns' }
];

export default function StaircaseCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    stairTypeId: 'straight',
    totalHeight: 10,   // Floor-to-floor height (ft or m)
    flightWidth: 3.5,  // Width of staircase (ft or m)
    riserHeight: 6,    // in or cm
    treadWidth: 10,    // in or cm
    waistSlabThick: 6, // in or cm
    landingLength: 3.5,// ft or m
    // Rates
    concreteRatePerM3: 4700,
    rebarRatePerKg: 70,
    tileMarbleRatePerSqm: 850,
    laborRate: 300,
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
    let parsed = ['currency', 'stairTypeId'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(12, 10, 16);
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

  // --- Calculation & 3D Model Generation ---

  function calculateAndRender() {
    const { totalHeight, flightWidth, riserHeight, treadWidth, waistSlabThick, landingLength, concreteRatePerM3, rebarRatePerKg, tileMarbleRatePerSqm, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const totalHtM = totalHeight * unitToMeter[unitSystem];
    const widthM = flightWidth * unitToMeter[unitSystem];
    const riserM = riserHeight * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const treadM = treadWidth * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const waistM = waistSlabThick * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const landingM = landingLength * unitToMeter[unitSystem];

    // Total Steps Count
    const totalSteps = Math.max(2, Math.round(totalHtM / Math.max(0.1, riserM)));
    const actualRiserM = totalHtM / totalSteps;

    // Steps Triangle Volume
    const singleStepVolM3 = 0.5 * actualRiserM * treadM * widthM;
    const allStepsVolM3 = singleStepVolM3 * totalSteps;

    // Waist Slab Volume (hypotenuse slope length)
    const slopeLenM = Math.sqrt(Math.pow(totalHtM, 2) + Math.pow(totalSteps * treadM, 2));
    const waistSlabVolM3 = slopeLenM * widthM * waistM;

    // Landing Slab Volume
    const landingVolM3 = landingM * widthM * waistM;

    const totalConcreteM3 = (allStepsVolM3 + waistSlabVolM3 + landingVolM3) * 1.05; // 5% waste
    const totalRebarKg = totalConcreteM3 * 0.009 * 7850; // ~0.9% steel ratio

    // Finishing Area (Treads + Risers)
    const treadAreaSqm = totalSteps * (treadM * widthM);
    const riserAreaSqm = totalSteps * (actualRiserM * widthM);
    const totalFinishingAreaSqm = (treadAreaSqm + riserAreaSqm) + (landingM * widthM);

    // Costs
    const costConcrete = totalConcreteM3 * concreteRatePerM3;
    const costRebar = totalRebarKg * rebarRatePerKg;
    const costFinish = totalFinishingAreaSqm * tileMarbleRatePerSqm;
    const costLabor = totalConcreteM3 * laborRate;
    const grandTotal = costConcrete + costRebar + costFinish + costLabor;

    setResults({
      totalSteps,
      actualRiserMm: (actualRiserM * 1000).toFixed(0),
      totalConcreteM3,
      totalRebarKg,
      totalFinishingAreaSqm,
      costConcrete,
      costRebar,
      costFinish,
      costLabor,
      grandTotal
    });

    // 3D Scene Assembly
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicStairs') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicStairs';

    const isBlueprint = visualTheme === 'blueprint';
    const concreteColor = isBlueprint ? 0x0ea5e9 : 0x94a3b8;
    const stepMat = new THREE.MeshStandardMaterial({
      color: concreteColor,
      roughness: 0.85,
      wireframe: isBlueprint,
      transparent: isBlueprint,
      opacity: isBlueprint ? 0.4 : 1
    });

    const numVisualSteps = Math.min(20, totalSteps);
    const stepW = Math.max(0.5, widthM);
    const stepT = Math.max(0.2, treadM);
    const stepR = Math.max(0.1, actualRiserM);

    for (let i = 0; i < numVisualSteps; i++) {
      const stepGeom = new THREE.BoxGeometry(stepW, stepR * (i + 1), stepT);
      stepGeom.translate(0, (stepR * (i + 1)) / 2, i * stepT);
      const stepMesh = new THREE.Mesh(stepGeom, stepMat);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      mainGroup.add(stepMesh);
    }

    // Landing on Top
    const landGeom = new THREE.BoxGeometry(stepW, stepR * numVisualSteps, Math.max(0.8, landingM));
    landGeom.translate(0, (stepR * numVisualSteps) / 2, (numVisualSteps - 1) * stepT + Math.max(0.8, landingM) / 2 + stepT / 2);
    const landMesh = new THREE.Mesh(landGeom, stepMat);
    landMesh.castShadow = true;
    mainGroup.add(landMesh);

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
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Staircase Calculator</h2>
            <p className="text-xs text-muted dark:text-muted">Step riser-tread optimization, waist slab concrete & marble takeoff</p>
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

      {/* Grid Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line flex flex-col gap-4">
            <h3 className="text-sm font-bold text-muted dark:text-muted">Flight & Step Dimensions</h3>

            <div>
              <label htmlFor="staircase-stairTypeId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Flight Configuration</label>
              <select id="staircase-stairTypeId" name="stairTypeId" value={inputs.stairTypeId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                {stairTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="staircase-totalHeight" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Total Rise ({unitSystem})</label>
                <input id="staircase-totalHeight" type="number" name="totalHeight" value={inputs.totalHeight} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="staircase-flightWidth" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Flight Width ({unitSystem})</label>
                <input id="staircase-flightWidth" type="number" name="flightWidth" value={inputs.flightWidth} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="staircase-riserHeight" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Riser ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input id="staircase-riserHeight" type="number" name="riserHeight" value={inputs.riserHeight} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="staircase-treadWidth" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Tread ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input id="staircase-treadWidth" type="number" name="treadWidth" value={inputs.treadWidth} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="staircase-waistSlabThick" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Waist ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input id="staircase-waistSlabThick" type="number" name="waistSlabThick" value={inputs.waistSlabThick} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="staircase-concreteRatePerM3" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Concrete / m³ ({inputs.currency})</label>
                <input id="staircase-concreteRatePerM3" type="number" name="concreteRatePerM3" value={inputs.concreteRatePerM3} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="staircase-tileMarbleRatePerSqm" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Marble/Tile / m² ({inputs.currency})</label>
                <input id="staircase-tileMarbleRatePerSqm" type="number" name="tileMarbleRatePerSqm" value={inputs.tileMarbleRatePerSqm} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[360px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-ink text-xs">
              <span className="text-primary font-bold">3D RCC Stepped Staircase</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 px-3 py-2 rounded-lg border border-white/10 text-ink text-right">
              <p className="text-xs text-muted">Total Steps</p>
              <p className="text-lg font-bold text-primary">{results?.totalSteps || 0} Risers ({results?.actualRiserMm}mm each)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Concrete Vol</p>
              <p className="text-lg font-bold text-ink dark:text-ink mt-1">{results?.totalConcreteM3?.toFixed(2)} m³</p>
              <p className="text-xs text-muted">Waist + steps</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Rebar Total</p>
              <p className="text-lg font-bold text-accent mt-1">{results?.totalRebarKg?.toFixed(0)} kg</p>
              <p className="text-xs text-muted">TMT reinforcement</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Finishing Area</p>
              <p className="text-lg font-bold text-ink-2 dark:text-ink-2 mt-1">{results?.totalFinishingAreaSqm?.toFixed(1)} m²</p>
              <p className="text-xs text-muted">Granite / tile</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Estimated Cost</p>
              <p className="text-lg font-bold text-ink mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted">Civil + stone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
