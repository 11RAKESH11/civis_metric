import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const qualityTiers = [
  { id: 'economy', name: 'Economy / Budget Finish', baseRatePerSqft: 1450, desc: 'Basic standard bricks, vitrified tiles, basic fittings' },
  { id: 'standard', name: 'Standard / Premium Finish', baseRatePerSqft: 1850, desc: 'Quality RCC frame, branded CP fittings, teakwood doors' },
  { id: 'luxury', name: 'Luxury / High-End Quality', baseRatePerSqft: 2450, desc: 'Italian marble, VRV AC wiring, high-end automated fixtures' }
];

const stagesDistribution = [
  { name: '1. Foundation & Substructure', pct: 15 },
  { name: '2. RCC Structure (Columns, Beams, Slabs)', pct: 25 },
  { name: '3. Brickwork & Masonry Walls', pct: 12 },
  { name: '4. Internal & External Plastering', pct: 8 },
  { name: '5. Flooring & Tiling', pct: 10 },
  { name: '6. Electrical & Plumbing Lines', pct: 10 },
  { name: '7. Doors, Windows & Carpentry', pct: 8 },
  { name: '8. Painting & Final Finishes', pct: 7 },
  { name: '9. Contingency & Admin', pct: 5 }
];

export default function TotalProjectEstimator() {
  const [plotAreaSqft, setPlotAreaSqft] = useState(1500);
  const [numFloors, setNumFloors] = useState(2); // G+1
  const [builtUpCoveragePct, setBuiltUpCoveragePct] = useState(70); // 70% coverage per floor
  const [tierId, setTierId] = useState('standard');
  const [currency] = useState('₹');

  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

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
    camera.position.set(18, 16, 22);
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
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

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

  // --- Calculation & 3D Building Generator ---

  function calculateAndRender() {
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedTier = qualityTiers.find(t => t.id === tierId) || qualityTiers[1];

    const plotSqft = parseFloat(plotAreaSqft) || 1500;
    const floors = Math.max(1, Math.floor(parseFloat(numFloors) || 1));
    const coverage = Math.min(100, Math.max(20, parseFloat(builtUpCoveragePct) || 70));

    const floorAreaSqft = plotSqft * (coverage / 100);
    const totalBuiltUpSqft = floorAreaSqft * floors;
    const totalBuiltUpSqm = totalBuiltUpSqft / 10.7639;

    const baseProjectCost = totalBuiltUpSqft * selectedTier.baseRatePerSqft;

    const stageBreakdown = stagesDistribution.map(s => ({
      ...s,
      stageAmount: (baseProjectCost * s.pct) / 100
    }));

    setResults({
      floors,
      floorAreaSqft,
      totalBuiltUpSqft,
      totalBuiltUpSqm,
      baseProjectCost,
      stageBreakdown,
      selectedTier
    });

    // 3D Parametric Multi-Story Building
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicBuilding') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicBuilding';

    const isBlueprint = visualTheme === 'blueprint';
    const floorH = 2.4; // 2.4m per floor in 3D scale
    const buildingW = Math.sqrt(floorAreaSqft) * 0.2;
    const buildingL = buildingW * 1.2;

    const slabMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x0ea5e9 : 0x64748b,
      wireframe: isBlueprint
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x38bdf8 : 0xe2e8f0,
      wireframe: isBlueprint,
      transparent: true,
      opacity: isBlueprint ? 0.3 : 0.85
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x0284c7 : 0x334155
    });

    for (let f = 0; f < floors; f++) {
      const floorBaseY = f * floorH;

      // Slab
      const slabGeom = new THREE.BoxGeometry(buildingL, 0.2, buildingW);
      slabGeom.translate(0, floorBaseY + 0.1, 0);
      mainGroup.add(new THREE.Mesh(slabGeom, slabMat));

      // 4 Corner Columns
      const colGeom = new THREE.BoxGeometry(0.3, floorH, 0.3);
      const addCol = (cx, cz) => {
        const m = new THREE.Mesh(colGeom, columnMat);
        m.position.set(cx, floorBaseY + (floorH / 2), cz);
        mainGroup.add(m);
      };
      addCol(-buildingL/2 + 0.2, -buildingW/2 + 0.2);
      addCol(buildingL/2 - 0.2, -buildingW/2 + 0.2);
      addCol(-buildingL/2 + 0.2, buildingW/2 - 0.2);
      addCol(buildingL/2 - 0.2, buildingW/2 - 0.2);

      // Infill Glass / Walls
      const wallGeom = new THREE.BoxGeometry(buildingL * 0.9, floorH * 0.8, buildingW * 0.9);
      wallGeom.translate(0, floorBaseY + (floorH / 2), 0);
      mainGroup.add(new THREE.Mesh(wallGeom, wallMat));
    }

    // Roof Slab
    const roofGeom = new THREE.BoxGeometry(buildingL + 0.4, 0.2, buildingW + 0.4);
    roofGeom.translate(0, (floors * floorH) + 0.1, 0);
    mainGroup.add(new THREE.Mesh(roofGeom, slabMat));

    scene.add(mainGroup);
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(handler);
  }, [plotAreaSqft, numFloors, builtUpCoveragePct, tierId, visualTheme]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-surface rounded-lg border border-line dark:border-line">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Total Project Estimator</h2>
            <p className="text-xs text-muted dark:text-muted">Complete 10-stage building budget, multi-story 3D generator & cash flow</p>
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

      {/* Grid Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line flex flex-col gap-4">
            <h3 className="text-sm font-bold text-muted dark:text-muted">Project Scope & Quality Tier</h3>

            <div>
              <label htmlFor="totalprojectestimator-field-0" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Construction Quality Specification</label>
              <select id="totalprojectestimator-field-0" value={tierId} onChange={e => setTierId(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                {qualityTiers.map(q => <option key={q.id} value={q.id}>{q.name} ({currency}{q.baseRatePerSqft}/sq.ft)</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="totalprojectestimator-field-1" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Plot Area (sq.ft)</label>
                <input id="totalprojectestimator-field-1" type="number" value={plotAreaSqft} onChange={e => setPlotAreaSqft(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="totalprojectestimator-field-2" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Floors (G+N)</label>
                <input id="totalprojectestimator-field-2" type="number" value={numFloors} onChange={e => setNumFloors(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="totalprojectestimator-field-3" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Coverage (%)</label>
                <input id="totalprojectestimator-field-3" type="number" value={builtUpCoveragePct} onChange={e => setBuiltUpCoveragePct(e.target.value)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="p-4 bg-bg dark:bg-bg rounded-lg border border-line dark:border-line">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Built-Up Area:</span>
                <span className="font-bold text-ink dark:text-ink">{results?.totalBuiltUpSqft?.toFixed(0)} sq.ft ({results?.totalBuiltUpSqm?.toFixed(1)} m²)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Benchmark Rate:</span>
                <span className="font-bold text-primary">{currency}{results?.selectedTier?.baseRatePerSqft} / sq.ft</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-ink text-xs">
              <span className="text-primary font-bold">3D Parametric Multi-Story Structure</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 px-3 py-2 rounded-lg border border-white/10 text-ink text-right">
              <p className="text-xs text-muted">Total Estimated Budget</p>
              <p className="text-xl font-bold text-primary">{currency}{results?.baseProjectCost?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          {/* 10-Stage Milestone Breakdown */}
          <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
            <h4 className="text-xs font-bold text-muted dark:text-muted mb-3">Construction Stages & Cash Flow Schedule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {results?.stageBreakdown?.map((stage, i) => (
                <div key={i} className="p-2.5 bg-bg dark:bg-bg rounded-lg border border-line dark:border-line flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink dark:text-ink truncate">{stage.name}</p>
                    <p className="text-xs text-primary font-bold">{stage.pct}% Milestone</p>
                  </div>
                  <p className="text-xs font-bold text-ink dark:text-ink">
                    {currency}{stage.stageAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
