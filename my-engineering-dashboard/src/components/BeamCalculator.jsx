import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const beamTypes = [
  { id: 'simply_supported', name: 'Simply Supported RCC Beam', topExtraRatio: 0.25, desc: 'Supports at both ends' },
  { id: 'continuous', name: 'Continuous Multi-Span Beam', topExtraRatio: 0.40, desc: 'Hogging moment over supports' },
  { id: 'cantilever', name: 'Cantilever Beam', topExtraRatio: 0.85, desc: 'Fixed one end, top steel critical' }
];

export default function BeamCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    beamTypeId: 'simply_supported',
    beamCount: 4,
    spanLength: 16, // ft or m
    beamWidth: 9,   // in or cm
    beamDepth: 18,  // in or cm
    // Rebar Details
    bottomBarsCount: 3,
    bottomBarsDia: 16,
    topBarsCount: 2,
    topBarsDia: 12,
    stirrupDia: 8,
    stirrupSpacingMm: 150,
    clearCoverMm: 25,
    // Rates
    concreteRatePerM3: 4600,
    rebarRatePerKg: 70,
    shutteringRatePerSqm: 360,
    laborRate: 200,
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
    let parsed = ['currency', 'beamTypeId'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(10, 8, 14);
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
    controls.maxDistance = 200;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(15, 20, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.6);
    rimLight.position.set(-15, -5, -15);
    scene.add(rimLight);

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

  // --- Calculation & 3D Rendering ---

  function calculateAndRender() {
    const { beamCount, spanLength, beamWidth, beamDepth, bottomBarsCount, bottomBarsDia, topBarsCount, topBarsDia, stirrupDia, stirrupSpacingMm, concreteRatePerM3, rebarRatePerKg, shutteringRatePerSqm, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const spanM = spanLength * unitToMeter[unitSystem];
    const widthM = beamWidth * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const depthM = beamDepth * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];

    const count = Math.max(1, Math.floor(beamCount));
    const singleBeamVolM3 = spanM * widthM * depthM;
    const totalConcreteM3 = singleBeamVolM3 * count * 1.05; // 5% waste

    // Longitudinal Rebar Wt
    const bottomBarUnitWt = (bottomBarsDia * bottomBarsDia) / 162;
    const topBarUnitWt = (topBarsDia * topBarsDia) / 162;
    const stirrupUnitWt = (stirrupDia * stirrupDia) / 162;

    const totalBottomLenM = spanM * bottomBarsCount * count;
    const totalTopLenM = spanM * topBarsCount * count;

    // Stirrup Perimeter = 2 * (width + depth) + hooks (~150mm)
    const stirrupPerimeterM = (2 * (widthM + depthM)) + 0.15;
    const stirrupsPerBeam = Math.ceil((spanM * 1000) / (stirrupSpacingMm || 150)) + 1;
    const totalStirrupLenM = stirrupsPerBeam * stirrupPerimeterM * count;

    const bottomRebarKg = totalBottomLenM * bottomBarUnitWt;
    const topRebarKg = totalTopLenM * topBarUnitWt;
    const stirrupRebarKg = totalStirrupLenM * stirrupUnitWt;
    const totalRebarKg = (bottomRebarKg + topRebarKg + stirrupRebarKg) * 1.05;

    // Shuttering (Bottom Soffit + 2 Sides)
    const shutteringPerBeamSqm = (widthM * spanM) + (2 * depthM * spanM);
    const totalShutteringSqm = shutteringPerBeamSqm * count;

    // Costs
    const costConcrete = totalConcreteM3 * concreteRatePerM3;
    const costRebar = totalRebarKg * rebarRatePerKg;
    const costShuttering = totalShutteringSqm * shutteringRatePerSqm;
    const costLabor = totalConcreteM3 * laborRate;
    const grandTotal = costConcrete + costRebar + costShuttering + costLabor;

    setResults({
      singleBeamVolM3,
      totalConcreteM3,
      totalRebarKg,
      stirrupsPerBeam,
      totalShutteringSqm,
      costConcrete,
      costRebar,
      costShuttering,
      costLabor,
      grandTotal
    });

    // 3D Scene Assembly
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicBeam') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicBeam';

    const isBlueprint = visualTheme === 'blueprint';
    const concreteColor = isBlueprint ? 0x0ea5e9 : 0x94a3b8;
    const beamMat = new THREE.MeshStandardMaterial({
      color: concreteColor,
      roughness: 0.9,
      wireframe: isBlueprint,
      transparent: true,
      opacity: isBlueprint ? 0.35 : 0.8
    });

    const bL = Math.max(1, spanM);
    const bW = Math.max(0.15, widthM);
    const bD = Math.max(0.2, depthM);

    // 1. Concrete Beam Body
    const beamGeom = new THREE.BoxGeometry(bL, bD, bW);
    beamGeom.translate(0, bD / 2, 0);
    const beamMesh = new THREE.Mesh(beamGeom, beamMat);
    beamMesh.castShadow = true;
    mainGroup.add(beamMesh);

    // 2. Rebar Cage Inside (Top + Bottom longitudinal bars)
    const barMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6 });
    const addLongBar = (posY, posZ) => {
      const g = new THREE.CylinderGeometry(0.015, 0.015, bL - 0.2, 8);
      g.rotateZ(Math.PI / 2);
      g.translate(0, posY, posZ);
      mainGroup.add(new THREE.Mesh(g, barMat));
    };

    // Bottom bars
    addLongBar(bD * 0.15, -bW * 0.3);
    addLongBar(bD * 0.15, 0);
    addLongBar(bD * 0.15, bW * 0.3);
    // Top bars
    addLongBar(bD * 0.85, -bW * 0.3);
    addLongBar(bD * 0.85, bW * 0.3);

    // 3. Stirrup Rings
    const stirrupMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const numStirrups = Math.min(20, stirrupsPerBeam);
    for (let i = 0; i <= numStirrups; i++) {
      const sx = -bL/2 + 0.2 + (i * ((bL - 0.4) / numStirrups));
      const sGeom = new THREE.BoxGeometry(0.01, bD * 0.8, bW * 0.8);
      sGeom.translate(sx, bD / 2, 0);
      mainGroup.add(new THREE.Mesh(sGeom, stirrupMat));
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
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Beam Calculator</h2>
            <p className="text-xs text-muted dark:text-muted">RCC longitudinal rebar cage, shear stirrup rings & shuttering takeoff</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <h3 className="text-sm font-bold text-muted dark:text-muted">Beam Dimensions & Quantity</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="beam-beamTypeId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Beam Type</label>
                <select id="beam-beamTypeId" name="beamTypeId" value={inputs.beamTypeId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                  {beamTypes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="beam-beamCount" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Number of Beams</label>
                <input id="beam-beamCount" type="number" name="beamCount" value={inputs.beamCount} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="beam-spanLength" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Span ({unitSystem})</label>
                <input id="beam-spanLength" type="number" name="spanLength" value={inputs.spanLength} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="beam-beamWidth" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Width ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input id="beam-beamWidth" type="number" name="beamWidth" value={inputs.beamWidth} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="beam-beamDepth" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Depth ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input id="beam-beamDepth" type="number" name="beamDepth" value={inputs.beamDepth} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="beam-bottomBarsCount" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Bottom Main Bars</label>
                <div className="flex gap-2">
                  <input id="beam-bottomBarsCount" type="number" placeholder="Qty" name="bottomBarsCount" value={inputs.bottomBarsCount} onChange={handleInputChange} className="w-1/2 bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-2 py-2 text-sm text-ink dark:text-ink" />
                  <input aria-label="Bottom bar diameter (mm)" type="number" placeholder="Dia mm" name="bottomBarsDia" value={inputs.bottomBarsDia} onChange={handleInputChange} className="w-1/2 bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-2 py-2 text-sm text-ink dark:text-ink" />
                </div>
              </div>

              <div>
                <label htmlFor="beam-topBarsCount" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Top Hanger Bars</label>
                <div className="flex gap-2">
                  <input id="beam-topBarsCount" type="number" placeholder="Qty" name="topBarsCount" value={inputs.topBarsCount} onChange={handleInputChange} className="w-1/2 bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-2 py-2 text-sm text-ink dark:text-ink" />
                  <input aria-label="Top bar diameter (mm)" type="number" placeholder="Dia mm" name="topBarsDia" value={inputs.topBarsDia} onChange={handleInputChange} className="w-1/2 bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-2 py-2 text-sm text-ink dark:text-ink" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="beam-concreteRatePerM3" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Concrete / m³ ({inputs.currency})</label>
                <input id="beam-concreteRatePerM3" type="number" name="concreteRatePerM3" value={inputs.concreteRatePerM3} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="beam-rebarRatePerKg" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Steel / kg ({inputs.currency})</label>
                <input id="beam-rebarRatePerKg" type="number" name="rebarRatePerKg" value={inputs.rebarRatePerKg} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[360px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-line shadow-e1 text-ink text-xs">
              <span className="text-primary font-bold">3D Beam Rebar Cage & Stirrups</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-line shadow-e1 text-ink text-right">
              <p className="text-xs text-muted">Total Beams</p>
              <p className="text-lg font-bold text-primary">{inputs.beamCount} Units</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Concrete Vol</p>
              <p className="text-lg font-bold text-ink dark:text-ink mt-1">{results?.totalConcreteM3?.toFixed(2)} m³</p>
              <p className="text-xs text-muted">{results?.singleBeamVolM3?.toFixed(2)} m³/beam</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Rebar Total</p>
              <p className="text-lg font-bold text-accent mt-1">{results?.totalRebarKg?.toFixed(0)} kg</p>
              <p className="text-xs text-muted">Main + stirrups</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Shuttering</p>
              <p className="text-lg font-bold text-ink-2 dark:text-ink-2 mt-1">{results?.totalShutteringSqm?.toFixed(1)} m²</p>
              <p className="text-xs text-muted">Sides + soffit</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs font-medium text-muted dark:text-muted">Estimated Cost</p>
              <p className="text-lg font-bold text-ink mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted">All {inputs.beamCount} beams</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
