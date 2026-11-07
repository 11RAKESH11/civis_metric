import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';


const tileSizes = [
  { id: '600x600', name: '600 x 600 mm (2 x 2 ft) Vitrified', lMm: 600, wMm: 600, pcsPerBox: 4, areaPerBoxSqft: 15.5 },
  { id: '600x1200', name: '600 x 1200 mm (2 x 4 ft) GVT Slab', lMm: 1200, wMm: 600, pcsPerBox: 2, areaPerBoxSqft: 15.5 },
  { id: '300x300', name: '300 x 300 mm (1 x 1 ft) Ceramic', lMm: 300, wMm: 300, pcsPerBox: 9, areaPerBoxSqft: 8.7 },
  { id: '300x600', name: '300 x 600 mm (1 x 2 ft) Bathroom Wall', lMm: 600, wMm: 300, pcsPerBox: 8, areaPerBoxSqft: 15.5 },
  { id: '800x1600', name: '800 x 1600 mm Large Format Slab', lMm: 1600, wMm: 800, pcsPerBox: 2, areaPerBoxSqft: 27.56 }
];

const patterns = [
  { id: 'grid', name: 'Standard Straight Grid', wasteFactor: 5 },
  { id: 'brick', name: 'Offset / Brick Bond (50%)', wasteFactor: 8 },
  { id: 'diagonal', name: 'Diagonal 45° Pattern', wasteFactor: 12 },
  { id: 'herringbone', name: 'Herringbone Pattern', wasteFactor: 15 }
];

export default function TileCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    tileSizeId: '600x600',
    patternId: 'grid',
    roomLength: 18,
    roomWidth: 14,
    includeSkirting: true,
    skirtingHeightIn: 4,
    tileBoxPrice: 850,
    adhesiveBagPrice: 320, // 20kg bag
    groutPricePerKg: 90,
    laborRatePerSqft: 22,
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
    let parsed = type === 'checkbox' ? checked : (['currency', 'tileSizeId', 'patternId'].includes(name) ? value : parseFloat(value) || 0);
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
    camera.position.set(12, 14, 16);
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
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.6);
    dirLight.position.set(15, 25, 15);
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

  // --- Calculation & 3D Tile Rendering ---

  function calculateAndRender() {
    const { tileSizeId, patternId, roomLength, roomWidth, includeSkirting, skirtingHeightIn, tileBoxPrice, adhesiveBagPrice, groutPricePerKg, laborRatePerSqft } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedTile = tileSizes.find(t => t.id === tileSizeId) || tileSizes[0];
    const selectedPattern = patterns.find(p => p.id === patternId) || patterns[0];

    const lenFt = roomLength * (unitSystem === 'm' ? 3.28084 : 1);
    const widFt = roomWidth * (unitSystem === 'm' ? 3.28084 : 1);

    const floorAreaSqft = lenFt * widFt;
    const perimeterRft = 2 * (lenFt + widFt);

    const skirtingAreaSqft = includeSkirting ? (perimeterRft * (skirtingHeightIn / 12)) : 0;
    const netAreaSqft = floorAreaSqft + skirtingAreaSqft;

    const totalOrderAreaSqft = netAreaSqft * (1 + (selectedPattern.wasteFactor / 100));

    // Boxes & Tile Count
    const totalBoxes = Math.ceil(totalOrderAreaSqft / selectedTile.areaPerBoxSqft);
    const exactTileCount = totalBoxes * selectedTile.pcsPerBox;

    // Adhesive & Grout Takeoff
    // 1 Bag (20kg) covers approx 45-50 sq.ft
    const adhesiveBags = Math.ceil(totalOrderAreaSqft / 48);
    // Grout ~ 1kg per 50 sq.ft
    const groutKg = Math.ceil(totalOrderAreaSqft / 50);

    // Costs
    const costTiles = totalBoxes * tileBoxPrice;
    const costAdhesive = adhesiveBags * adhesiveBagPrice;
    const costGrout = groutKg * groutPricePerKg;
    const costLabor = totalOrderAreaSqft * laborRatePerSqft;
    const grandTotal = costTiles + costAdhesive + costGrout + costLabor;

    setResults({
      floorAreaSqft,
      skirtingAreaSqft,
      totalOrderAreaSqft,
      totalBoxes,
      exactTileCount,
      adhesiveBags,
      groutKg,
      costTiles,
      costAdhesive,
      costGrout,
      costLabor,
      grandTotal,
      selectedTile,
      selectedPattern
    });

    // 3D Tiled Floor Grid
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicTiles') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicTiles';

    const isBlueprint = visualTheme === 'blueprint';
    const floorG = new THREE.PlaneGeometry(lenFt * 0.3, widFt * 0.3);
    floorG.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x0ea5e9 : 0xf1f5f9,
      roughness: 0.3,
      metalness: 0.1,
      wireframe: isBlueprint,
      side: THREE.DoubleSide
    });
    const floorM = new THREE.Mesh(floorG, floorMat);
    floorM.position.y = 0.02;
    mainGroup.add(floorM);

    // Border Skirting
    const skirtMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0x0f172a });
    const sL = lenFt * 0.3, sW = widFt * 0.3;
    const addSkirt = (len, posX, posZ, rotY) => {
      const g = new THREE.BoxGeometry(len, 0.3, 0.05);
      g.translate(0, 0.15, 0);
      const m = new THREE.Mesh(g, skirtMat);
      m.position.set(posX, 0.02, posZ);
      m.rotation.y = rotY;
      mainGroup.add(m);
    };
    addSkirt(sL, 0, -sW/2, 0);
    addSkirt(sL, 0, sW/2, 0);
    addSkirt(sW, -sL/2, 0, Math.PI / 2);
    addSkirt(sW, sL/2, 0, Math.PI / 2);

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
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Tile Calculator</h2>
            <p className="text-xs text-muted dark:text-muted">Flooring & wall tile boxes, pattern wastage, adhesive & grout takeoff</p>
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
            <h3 className="text-sm font-bold text-muted dark:text-muted">Tile Sizing & Layout</h3>

            <div>
              <label htmlFor="tile-tileSizeId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Tile Dimension & Box Pack</label>
              <select id="tile-tileSizeId" name="tileSizeId" value={inputs.tileSizeId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                {tileSizes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.pcsPerBox} pcs / box)</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="tile-patternId" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Laying Pattern (Wastage Factor)</label>
              <select id="tile-patternId" name="patternId" value={inputs.patternId} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary">
                {patterns.map(p => <option key={p.id} value={p.id}>{p.name} (+{p.wasteFactor}% Waste)</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tile-roomLength" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Room Length ({unitSystem})</label>
                <input id="tile-roomLength" type="number" name="roomLength" value={inputs.roomLength} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="tile-roomWidth" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Room Width ({unitSystem})</label>
                <input id="tile-roomWidth" type="number" name="roomWidth" value={inputs.roomWidth} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="incSkirt" name="includeSkirting" checked={inputs.includeSkirting} onChange={handleInputChange} className="rounded accent-primary" />
              <label htmlFor="incSkirt" className="text-xs text-ink-2 dark:text-ink-2 cursor-pointer">Include Perimeter Skirting Tiles (4" High)</label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tile-tileBoxPrice" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Box Price ({inputs.currency})</label>
                <input id="tile-tileBoxPrice" type="number" name="tileBoxPrice" value={inputs.tileBoxPrice} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink" />
              </div>
              <div>
                <label htmlFor="tile-adhesiveBagPrice" className="text-xs font-medium text-ink-2 dark:text-ink-2 mb-1 block">Adhesive 20kg Bag ({inputs.currency})</label>
                <input id="tile-adhesiveBagPrice" type="number" name="adhesiveBagPrice" value={inputs.adhesiveBagPrice} onChange={handleInputChange} className="w-full bg-bg dark:bg-bg border border-line-control dark:border-line-control rounded px-3 py-2 text-sm text-ink dark:text-ink" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-line shadow-e1 text-ink text-xs">
              <span className="text-primary font-bold">3D Tiled Room & Skirting</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-line shadow-e1 text-ink text-right">
              <p className="text-xs text-muted">Total Boxes</p>
              <p className="text-lg font-bold text-primary">{results?.totalBoxes || 0} Boxes ({results?.exactTileCount} Tiles)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Tiled Area</p>
              <p className="text-base font-bold text-ink dark:text-ink mt-1">{results?.totalOrderAreaSqft?.toFixed(0)} sq.ft</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Tile Adhesive</p>
              <p className="text-base font-bold text-accent mt-1">{results?.adhesiveBags} Bags (20kg)</p>
            </div>
            <div className="p-3 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted dark:text-muted">Grout Powder</p>
              <p className="text-base font-bold text-primary mt-1">{results?.groutKg} kg</p>
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
