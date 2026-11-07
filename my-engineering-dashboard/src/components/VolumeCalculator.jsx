import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const solids = [
  { id: 'cuboid', name: 'Rectangular Prism / Cuboid' },
  { id: 'cylinder', name: 'Cylinder / Tank / Pier' },
  { id: 'cone', name: 'Cone / Stockpile' },
  { id: 'frustum', name: 'Frustum / Truncated Cone' },
  { id: 'sphere', name: 'Sphere / Ball' },
  { id: 'pipe', name: 'Hollow Cylinder / Pipe' }
];

const materials = [
  { id: 'concrete', name: 'Reinforced Concrete', density: 2400 },
  { id: 'water', name: 'Water (1000 kg/m³)', density: 1000 },
  { id: 'soil', name: 'Compacted Soil / Earth', density: 1800 },
  { id: 'steel', name: 'Structural Steel', density: 7850 },
  { id: 'sand', name: 'Dry River Sand', density: 1600 }
];

export default function VolumeCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    solidId: 'cuboid',
    materialId: 'concrete',
    dimA: 20, // Length or Height or Radius 1
    dimB: 15, // Width or Radius 2 or Diameter
    dimC: 10, // Height or Thickness
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
    const { name, value } = e.target;
    let parsed = ['currency', 'solidId', 'materialId'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(12, 10, 14);
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
    const { solidId, materialId, dimA, dimB, dimC } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedMat = materials.find(m => m.id === materialId) || materials[0];

    const aM = dimA * unitToMeter[unitSystem];
    const bM = dimB * unitToMeter[unitSystem];
    const cM = dimC * unitToMeter[unitSystem];

    let volM3 = 0;
    let surfaceAreaM2 = 0;

    if (solidId === 'cuboid') {
      volM3 = aM * bM * cM;
      surfaceAreaM2 = 2 * (aM * bM + bM * cM + aM * cM);
    } else if (solidId === 'cylinder') {
      const r = aM / 2; // aM is diameter
      volM3 = Math.PI * Math.pow(r, 2) * bM; // bM is height
      surfaceAreaM2 = (2 * Math.PI * r * bM) + (2 * Math.PI * Math.pow(r, 2));
    } else if (solidId === 'cone') {
      const r = aM / 2;
      volM3 = (1/3) * Math.PI * Math.pow(r, 2) * bM;
      const s = Math.sqrt(Math.pow(r, 2) + Math.pow(bM, 2));
      surfaceAreaM2 = (Math.PI * r * s) + (Math.PI * Math.pow(r, 2));
    } else if (solidId === 'sphere') {
      const r = aM / 2;
      volM3 = (4/3) * Math.PI * Math.pow(r, 3);
      surfaceAreaM2 = 4 * Math.PI * Math.pow(r, 2);
    } else {
      volM3 = aM * bM * cM;
      surfaceAreaM2 = 2 * (aM * bM + bM * cM + aM * cM);
    }

    if (volM3 <= 0) volM3 = 5;

    const volCuFt = volM3 * 35.3147;
    const volLiters = volM3 * 1000;
    const volGallons = volLiters * 0.264172;
    const massKg = volM3 * selectedMat.density;
    const massMT = massKg / 1000;

    setResults({
      volM3,
      volCuFt,
      volLiters,
      volGallons,
      surfaceAreaM2,
      surfaceAreaSqft: surfaceAreaM2 * 10.7639,
      massKg,
      massMT,
      selectedMat
    });

    // 3D Model Construction
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicVol') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicVol';

    const isBlueprint = visualTheme === 'blueprint';
    const mat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x0ea5e9 : 0x6366f1,
      roughness: 0.8,
      wireframe: isBlueprint,
      transparent: isBlueprint,
      opacity: isBlueprint ? 0.4 : 0.85
    });

    if (solidId === 'cuboid') {
      const g = new THREE.BoxGeometry(Math.max(1, aM), Math.max(1, cM), Math.max(1, bM));
      g.translate(0, Math.max(1, cM) / 2, 0);
      mainGroup.add(new THREE.Mesh(g, mat));
    } else if (solidId === 'cylinder') {
      const g = new THREE.CylinderGeometry(Math.max(0.5, aM/2), Math.max(0.5, aM/2), Math.max(1, bM), 32);
      g.translate(0, Math.max(1, bM) / 2, 0);
      mainGroup.add(new THREE.Mesh(g, mat));
    } else if (solidId === 'sphere') {
      const g = new THREE.SphereGeometry(Math.max(0.5, aM/2), 32, 32);
      g.translate(0, Math.max(0.5, aM/2), 0);
      mainGroup.add(new THREE.Mesh(g, mat));
    } else {
      const g = new THREE.ConeGeometry(Math.max(0.5, aM/2), Math.max(1, bM), 32);
      g.translate(0, Math.max(1, bM) / 2, 0);
      mainGroup.add(new THREE.Mesh(g, mat));
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
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Volume Calculator</h2>
            <p className="text-xs text-muted dark:text-muted">3D solid geometries, mass, capacity in liters & surface area</p>
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
            <h3 className="text-sm font-bold text-muted dark:text-muted">Solid Geometry & Material</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="volume-solidId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Solid Geometry</label>
                <select id="volume-solidId" name="solidId" value={inputs.solidId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                  {solids.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="volume-materialId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Material Density</label>
                <select id="volume-materialId" name="materialId" value={inputs.materialId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="volume-dimA" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Dim A / L / Dia</label>
                <input id="volume-dimA" type="number" name="dimA" value={inputs.dimA} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="volume-dimB" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Dim B / W / Ht</label>
                <input id="volume-dimB" type="number" name="dimB" value={inputs.dimB} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="volume-dimC" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Dim C / Ht</label>
                <input id="volume-dimC" type="number" name="dimC" value={inputs.dimC} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-ink text-xs">
              <span className="text-primary font-bold">3D Solid Viewport</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 px-3 py-2 rounded-lg border border-white/10 text-ink text-right">
              <p className="text-xs text-muted">Volume (m³ / cu.ft)</p>
              <p className="text-lg font-bold text-primary">{results?.volM3?.toFixed(2)} m³ ({results?.volCuFt?.toFixed(0)} ft³)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Mass (MT)</p>
              <p className="text-base font-bold text-ink dark:text-ink mt-1">{results?.massMT?.toFixed(2)} MT</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Liters</p>
              <p className="text-base font-bold text-ink dark:text-ink mt-1">{results?.volLiters?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} L</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">US Gallons</p>
              <p className="text-base font-bold text-accent mt-1">{results?.volGallons?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Gal</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Surface Area</p>
              <p className="text-base font-bold text-ink mt-1">{results?.surfaceAreaM2?.toFixed(1)} m²</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
