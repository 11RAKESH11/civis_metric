import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const conversionToSqFt = {
  sqft: 1,
  sqm: 10.7639104,
  sqyd: 9,
  acre: 43560,
  hectare: 107639.104,
  guntha: 1089,         // India (Maharashtra, Karnataka, Gujarat)
  cent: 435.6,          // India (Tamil Nadu, Kerala)
  ground: 2400,         // India (Tamil Nadu Chennai standard)
  bigha_pucca: 27225,   // North India (Standard Pucca Bigha)
  bigha_bengal: 14400,  // Bengal Bigha
  biswa: 1361.25,       // 1/20th of Pucca Bigha
  kanal: 5445,          // Punjab / Haryana / Pakistan
  marla: 272.25,        // 1/20th of Kanal
  katha: 720,           // Bihar / Bengal
  ankanam: 72           // Andhra Pradesh
};

const unitLabels = {
  sqft: 'Square Feet (sq.ft)',
  sqm: 'Square Meters (m²)',
  sqyd: 'Square Yards / Gaj',
  acre: 'Acres (ac)',
  hectare: 'Hectares (ha)',
  guntha: 'Guntha / Gunta',
  cent: 'Cents / Decimal',
  ground: 'Grounds (2400 sq.ft)',
  bigha_pucca: 'Bigha (Standard Pucca)',
  bigha_bengal: 'Bigha (Bengal 14,400 sq.ft)',
  biswa: 'Biswa',
  kanal: 'Kanal',
  marla: 'Marla',
  katha: 'Katha / Cottah',
  ankanam: 'Ankanam'
};

export default function LandAreaConverter() {
  const [inputValue, setInputValue] = useState(2400);
  const [sourceUnit, setSourceUnit] = useState('sqft');
  const [plotLengthFt, setPlotLengthFt] = useState(60);
  const [plotWidthFt, setPlotWidthFt] = useState(40);
  const [compoundWallRatePerRft, setCompoundWallRatePerRft] = useState(650);
  const [currency] = useState('₹');

  const [visualTheme, setVisualTheme] = useState('realistic');
  const [conversions, setConversions] = useState({});

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

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
    camera.position.set(20, 25, 25);
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
    controls.maxDistance = 300;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(50, 50, 0x0ea5e9, 0x334155);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
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

  // --- Calculation & 3D Plot Visualizer ---

  function calculateAndRender() {
    const scene = sceneRef.current;
    if (!scene) return;

    const val = parseFloat(inputValue) || 0;
    const sqftTotal = val * (conversionToSqFt[sourceUnit] || 1);

    const matrix = {};
    Object.keys(conversionToSqFt).forEach(k => {
      matrix[k] = sqftTotal / conversionToSqFt[k];
    });

    const pLen = parseFloat(plotLengthFt) || 60;
    const pWid = parseFloat(plotWidthFt) || 40;
    const perimeterFt = 2 * (pLen + pWid);
    const wallCost = perimeterFt * (parseFloat(compoundWallRatePerRft) || 650);

    setConversions({
      sqftTotal,
      matrix,
      perimeterFt,
      wallCost
    });

    // 3D Plot Rebuild
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicLand') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicLand';

    const isBlueprint = visualTheme === 'blueprint';
    const landColor = isBlueprint ? 0x0ea5e9 : 0x15803d;
    const landMat = new THREE.MeshStandardMaterial({
      color: landColor,
      roughness: 0.9,
      wireframe: isBlueprint,
      side: THREE.DoubleSide
    });

    const scale = 0.25;
    const pW = pWid * scale, pL = pLen * scale;

    // Land Plot Surface
    const plotGeom = new THREE.PlaneGeometry(pL, pW);
    plotGeom.rotateX(-Math.PI / 2);
    const plotMesh = new THREE.Mesh(plotGeom, landMat);
    plotMesh.position.y = 0.02;
    mainGroup.add(plotMesh);

    // Boundary Wall / Fence
    const wallMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0x78716c });
    const wallH = 1.0;
    const wallT = 0.2;

    const addWall = (wL, posX, posZ, rotY) => {
      const g = new THREE.BoxGeometry(wL, wallH, wallT);
      g.translate(0, wallH / 2, 0);
      const m = new THREE.Mesh(g, wallMat);
      m.position.set(posX, 0.02, posZ);
      m.rotation.y = rotY;
      mainGroup.add(m);
    };

    addWall(pL, 0, -pW/2, 0);
    addWall(pL, 0, pW/2, 0);
    addWall(pW, -pL/2, 0, Math.PI / 2);
    addWall(pW, pL/2, 0, Math.PI / 2);

    scene.add(mainGroup);
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(handler);
  }, [inputValue, sourceUnit, plotLengthFt, plotWidthFt, compoundWallRatePerRft, visualTheme]);

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
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Land Area Converter</h2>
            <p className="text-xs text-muted dark:text-muted">Regional Indian & International survey conversions & boundary cost</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <h3 className="text-sm font-bold text-muted dark:text-muted">Input Area & Survey Unit</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="landareaconverter-field-0" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Input Magnitude</label>
                <input id="landareaconverter-field-0" type="number" value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="landareaconverter-field-1" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Source Unit</label>
                <select id="landareaconverter-field-1" value={sourceUnit} onChange={e => setSourceUnit(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                  {Object.entries(unitLabels).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
            </div>

            <h4 className="text-xs font-bold text-primary dark:text-primary mt-2">Plot Dimensions & Compound Wall</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="landareaconverter-field-2" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Length (ft)</label>
                <input id="landareaconverter-field-2" type="number" value={plotLengthFt} onChange={e => setPlotLengthFt(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink" />
              </div>
              <div>
                <label htmlFor="landareaconverter-field-3" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Width (ft)</label>
                <input id="landareaconverter-field-3" type="number" value={plotWidthFt} onChange={e => setPlotWidthFt(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink" />
              </div>
            </div>

            <div>
              <label htmlFor="landareaconverter-field-4" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Compound Wall Rate / Rft ({currency})</label>
              <input id="landareaconverter-field-4" type="number" value={compoundWallRatePerRft} onChange={e => setCompoundWallRatePerRft(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[280px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-ink text-xs">
              <span className="text-primary font-bold">3D Survey Plot & Boundary Wall</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 px-3 py-2 rounded-lg border border-white/10 text-ink text-right">
              <p className="text-xs text-muted">Boundary Wall Cost</p>
              <p className="text-lg font-bold text-ink">{currency}{conversions?.wallCost?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({conversions?.perimeterFt} Rft)</p>
            </div>
          </div>

          {/* Full Unit Conversion Matrix Table */}
          <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
            <h4 className="text-xs font-bold text-muted dark:text-muted mb-3">Instant Conversion Matrix</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {conversions?.matrix && Object.entries(conversions.matrix).map(([unitKey, convertedVal]) => (
                <div key={unitKey} className="p-2.5 bg-bg dark:bg-bg rounded-lg border border-line dark:border-line">
                  <p className="text-xs font-semibold text-muted dark:text-muted truncate">{unitLabels[unitKey]}</p>
                  <p className="text-sm font-bold text-ink dark:text-ink mt-0.5">{convertedVal < 0.01 ? convertedVal.toFixed(5) : convertedVal.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
