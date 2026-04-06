import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048 };

// Realistic Densities
const SAND_DENSITY_LOOSE = 1550; // kg/m³
const SAND_DENSITY_COMPACTED = 1700; // kg/m³

const COLORS = {
  SAND: 0xd4b483,
  SAND_WET: 0xc2a278,
  PLINTH_WALL: 0x475569,
  GROUND: 0x1e293b,
  BLUEPRINT_STRUCT: 0x0ea5e9,
  BLUEPRINT_FILL: 0xf59e0b
};

export default function SandCalculator() {
  const [inputs, setInputs] = useState({
    length: 30, 
    width: 20, 
    depth: 3, 
    unit: 'ft',
    compactionShrinkage: 12, // Sand shrinks ~10-15% when compacted
    wastage: 5,
    sandPrice: 1200, // per ton
    truckCapacity: 15, // in tons
    laborRate: 800, // per day for spreading/compacting
    currency: '₹'
  });

  const [mode, setMode] = useState('normal'); 
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);
  
  // 3D Refs
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneObjectsRef = useRef({});
  const animationDataRef = useRef({ active: false, startTime: 0 });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = ['currency', 'unit'].includes(name) ? value : parseFloat(value) || 0;
    if (typeof parsedValue === 'number') parsedValue = Math.max(0, parsedValue);
    setInputs(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handlePrint = () => window.print();

  // --- Initialize Three.js Scene ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
    sceneRef.current = scene;

    const container = mountRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(15, 12, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(initialWidth, initialHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2); 
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.5);
    rimLight.position.set(-15, 5, -15);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(100, 100, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = -0.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      if (animationDataRef.current.active && sceneObjectsRef.current.sandFillMesh) {
        const elapsed = (Date.now() - animationDataRef.current.startTime) / 1000;
        const { sandFillMesh } = sceneObjectsRef.current;
        
        // Animate Sand Filling
        if (elapsed < 3.0) {
          const progress = Math.min(1, elapsed / 3.0);
          // Easing function for smoother fill
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);
          sandFillMesh.scale.y = Math.max(0.001, easeOutCubic);
        } else {
          sandFillMesh.scale.y = 1;
          animationDataRef.current.active = false;
        }
      }

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

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [visualTheme]);

  useEffect(() => {
    if (mode === 'normal') {
      setTimeout(() => {
        if (mountRef.current && cameraRef.current && rendererRef.current) {
          const w = mountRef.current.clientWidth;
          const h = mountRef.current.clientHeight;
          if (w > 0 && h > 0) {
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
          }
        }
      }, 50);
    }
  }, [mode]);

  const triggerSimulation = () => {
    animationDataRef.current = { active: true, startTime: Date.now() };
  };

  // --- Core Math & 3D Update ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 300);
    return () => clearTimeout(handler);
  }, [inputs, visualTheme]);

  const calculateAndRender = () => {
    const { length, width, depth, unit, compactionShrinkage, wastage, sandPrice, truckCapacity, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!length || !width || !depth || !scene) return;

    // 1. Math Calculations (Convert to Meters internally)
    const mult = unitToMeter[unit];
    const lenM = length * mult;
    const widM = width * mult;
    const depthM = depth * mult;

    // Target Volume (Compacted State)
    const targetVolM3 = lenM * widM * depthM;
    const targetVolCFT = targetVolM3 * 35.3147;

    // Loose Volume required to achieve Target Volume (factoring in compaction shrinkage)
    const looseVolM3 = targetVolM3 * (1 + (compactionShrinkage / 100));
    
    // Order Volume (factoring in transportation/handling wastage)
    const orderVolM3 = looseVolM3 * (1 + (wastage / 100));
    const orderVolCFT = orderVolM3 * 35.3147;

    // Weight Calculations
    const orderWeightKg = orderVolM3 * SAND_DENSITY_LOOSE;
    const orderWeightTons = orderWeightKg / 1000;

    // Logistics
    const truckTripsExact = orderWeightTons / truckCapacity;
    const truckTrips = Math.ceil(truckTripsExact);

    // Financials
    const costSand = orderWeightTons * sandPrice;
    
    // Labor: rough estimate, 1 crew day per 10 m3 of spreading & compacting
    const laborDays = Math.ceil(targetVolM3 / 10);
    const costLabor = laborDays * laborRate;

    const grandTotal = costSand + costLabor;

    // 2. 3D Scene Reconstruction
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicBuild') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const isBlueprint = visualTheme === 'blueprint';
    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicBuild';

    const getMat = (hex, isTransparent = false, opacityVal = 1) => new THREE.MeshStandardMaterial({
      color: isBlueprint ? (hex === COLORS.SAND ? COLORS.BLUEPRINT_FILL : COLORS.BLUEPRINT_STRUCT) : hex,
      wireframe: isBlueprint,
      transparent: isBlueprint || isTransparent,
      opacity: isBlueprint ? 0.4 : opacityVal,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    // Render Scale Protection (Keep rendering within sensible bounds)
    const scaleFactor = Math.max(lenM, widM) > 50 ? 50 / Math.max(lenM, widM) : 1;
    const rLen = lenM * scaleFactor;
    const rWid = widM * scaleFactor;
    const rDep = depthM * scaleFactor;
    const wallThick = 0.5;

    // A. Plinth Perimeter Walls (Foundation bounds)
    const buildWall = (w, h, d, x, y, z) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, getMat(COLORS.PLINTH_WALL));
        mesh.position.set(x, y, z);
        mesh.castShadow = !isBlueprint;
        mesh.receiveShadow = !isBlueprint;
        mainGroup.add(mesh);
    };

    const wallHt = rDep + 0.2; // Slightly higher than fill
    buildWall(rLen + wallThick*2, wallHt, wallThick, 0, wallHt/2, (rWid/2) + (wallThick/2)); // South
    buildWall(rLen + wallThick*2, wallHt, wallThick, 0, wallHt/2, -(rWid/2) - (wallThick/2)); // North
    buildWall(wallThick, wallHt, rWid, (rLen/2) + (wallThick/2), wallHt/2, 0); // East
    buildWall(wallThick, wallHt, rWid, -(rLen/2) - (wallThick/2), wallHt/2, 0); // West

    // B. Sand Fill (Animated)
    const sandGeo = new THREE.BoxGeometry(rLen - 0.05, rDep, rWid - 0.05); // slightly smaller to avoid z-fighting
    sandGeo.translate(0, rDep / 2, 0);
    const sandFillMesh = new THREE.Mesh(sandGeo, getMat(COLORS.SAND));
    sandFillMesh.position.set(0, 0, 0);
    sandFillMesh.receiveShadow = !isBlueprint;
    sandFillMesh.scale.y = 0.001; // Start empty
    mainGroup.add(sandFillMesh);

    // C. Target Volume Ghost Box (Shows the final level)
    if (!isBlueprint) {
        const ghostGeo = new THREE.BoxGeometry(rLen, rDep, rWid);
        ghostGeo.translate(0, rDep / 2, 0);
        const ghostMesh = new THREE.Mesh(ghostGeo, getMat(0xffffff, true, 0.1));
        mainGroup.add(ghostMesh);
    }

    scene.add(mainGroup);

    sceneObjectsRef.current = { sandFillMesh };
    animationDataRef.current = { active: true, startTime: Date.now() };

    // Adjust Camera dynamically based on structure size
    const maxDim = Math.max(rLen, rWid);
    cameraRef.current.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.2);
    controlsRef.current.target.set(0, rDep / 2, 0);

    setResults({
      targetVolM3, targetVolCFT, looseVolM3, 
      orderVolM3, orderVolCFT, orderWeightKg, orderWeightTons,
      truckTripsExact, truckTrips,
      costSand, laborDays, costLabor, grandTotal
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 md:p-6 bg-[#020617] text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none print:hidden"></div>

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[380px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 text-lg">⏳</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">CivisMetric</h2>
                  <p className="text-[9px] text-amber-400 font-mono uppercase tracking-widest">Sand Fill Engine</p>
                </div>
            </div>
            <select name="currency" value={inputs.currency} onChange={handleInputChange} className="bg-slate-800/80 border border-slate-600/50 rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 text-amber-400 font-bold transition-all cursor-pointer">
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
            </select>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            
            {/* Dimensions */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-amber-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-amber-400 transition-colors">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>Fill Geometry
                    </h3>
                    <select name="unit" value={inputs.unit} onChange={handleInputChange} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-amber-500 transition-all">
                        <option value="ft">Feet</option>
                        <option value="m">Meters</option>
                    </select>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length</label>
                      <input type="number" step="0.1" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Width</label>
                      <input type="number" step="0.1" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Depth</label>
                      <input type="number" step="0.1" name="depth" value={inputs.depth} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-amber-400 font-bold" />
                    </div>
                </div>
            </div>

            {/* Geotech Factors */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-orange-400 transition-colors"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>Compaction & Waste</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase text-orange-400">Shrinkage Factor</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-orange-500">
                            <input type="number" name="compactionShrinkage" value={inputs.compactionShrinkage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                        <p className="text-[7px] text-slate-500 mt-1 uppercase leading-tight">Vol loss upon vibration/ramming</p>
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Spill Wastage</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-orange-500">
                            <input type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                        <p className="text-[7px] text-slate-500 mt-1 uppercase leading-tight">Transport & handling loss</p>
                    </div>
                </div>
            </div>

            {/* Financial Rates */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group mb-2">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Logistics & Cost</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Dump Truck Capacity</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <input type="number" name="truckCapacity" value={inputs.truckCapacity} onChange={handleInputChange} className="w-10 bg-transparent p-1 text-right outline-none text-white font-mono" />
                          <span className="text-slate-500 ml-1 text-[9px] uppercase font-bold">Tons</span>
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Sand (per Ton)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="sandPrice" value={inputs.sandPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-900/10 p-2 rounded-lg border border-emerald-800/30">
                      <span className="text-[11px] text-emerald-400/80 font-medium ml-1">Labor Crew (Day)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-emerald-600/50">
                          <span className="text-emerald-400">{inputs.currency}</span>
                          <input type="number" name="laborRate" value={inputs.laborRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- Right Panel: Viewer & Report --- */}
      <div className="w-full xl:w-[calc(100%-404px)] bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden relative z-10 xl:h-[88vh] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        
        {/* Unified Top Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-30 shrink-0 print:hidden">
            <div className="flex-1 h-10 flex items-center">
                {results && mode === 'normal' ? (
                    <div className="flex items-center gap-4 animate-fade-in">
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Logistics</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 leading-none">{results.truckTrips} Truck Loads</span>
                       </div>
                       <div className="w-px h-8 bg-slate-700"></div>
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Est. Total</span>
                           <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                       </div>
                    </div>
                ) : mode === 'civil' ? (
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Material Takeoff</h2>
                ) : mode === 'math' ? (
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Geotechnical Mathematics</h2>
                ) : null}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {(mode === 'civil' || mode === 'math') && (
                    <button onClick={handlePrint} className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
                    </button>
                )}

                <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
                    <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'normal' ? 'bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
                    <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'math' ? 'bg-indigo-500 text-slate-900 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
                    <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'civil' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>Report</button>
                </div>
            </div>
        </div>

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] group print:hidden`}>
            <div ref={mountRef} className="absolute inset-0 cursor-move"></div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={triggerSimulation} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500 hover:text-slate-900 mr-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Simulate Pour
                </button>
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/50' : 'text-slate-500 hover:text-slate-400'}`}>Solid</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.2)]' : 'text-slate-500 hover:text-slate-400'}`}>Wireframe</button>
            </div>
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-slate-200 pb-6 mb-8 print:border-black">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Volumetric Shrinkage Analysis</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Geotechnical Conversions: Loose vs. Compacted States</p>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                 {/* Step 1 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-amber-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 1: Target Compacted Volume</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// This is the final geometrical volume the sand must occupy inside the plinth after ramming/vibration.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Target Volume</span> = Length × Width × Depth</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Target Volume</span> = {(inputs.length * unitToMeter[inputs.unit]).toFixed(3)}m × {(inputs.width * unitToMeter[inputs.unit]).toFixed(3)}m × {(inputs.depth * unitToMeter[inputs.unit]).toFixed(3)}m</p>
                        <p className="text-amber-700 print:text-black font-bold text-base mt-2">Compacted Target Volume = {results.targetVolM3.toFixed(3)} m³ ({results.targetVolCFT.toFixed(2)} cft)</p>
                    </div>
                 </div>

                 {/* Step 2 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-orange-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 2: Loose Volume & Shrinkage Factor</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// Sand is delivered in a "loose" state. When compacted into the plinth, air voids are removed, causing a volume reduction (shrinkage) of ~{inputs.compactionShrinkage}%. You must order MORE loose sand to achieve the final compacted volume.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Required Loose Volume</span> = Target Volume × (1 + Shrinkage Factor)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Required Loose Volume</span> = {results.targetVolM3.toFixed(3)} × (1 + {inputs.compactionShrinkage/100}) = <span className="font-bold text-slate-900">{results.looseVolM3.toFixed(3)} m³</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Final Order Volume (+{inputs.wastage}% Spillage Waste)</span> = {results.looseVolM3.toFixed(3)} × (1 + {inputs.wastage/100})</p>
                        <p className="text-orange-700 print:text-black font-bold text-base mt-2">Total Loose Volume to Order = {results.orderVolM3.toFixed(3)} m³ ({results.orderVolCFT.toFixed(2)} cft)</p>
                    </div>
                 </div>

                 {/* Step 3 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-indigo-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 3: Tonnage & Logistics</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// To calculate truckloads, convert the loose volume to weight.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Density of Loose Sand</span> ≈ {SAND_DENSITY_LOOSE} kg/m³</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Total Weight</span> = Order Volume × Density</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Total Weight</span> = {results.orderVolM3.toFixed(3)} × {SAND_DENSITY_LOOSE} = <span className="font-bold text-slate-900">{results.orderWeightKg.toFixed(2)} kg ({results.orderWeightTons.toFixed(2)} Tons)</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Truck Trips</span> = Total Tonnage / Truck Capacity</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Truck Trips</span> = {results.orderWeightTons.toFixed(2)} / {inputs.truckCapacity} = <span className="font-bold text-slate-900">{results.truckTripsExact.toFixed(2)}</span></p>
                        <p className="text-indigo-700 print:text-black font-bold text-base mt-2">Required Dump Trucks = Math.ceil({results.truckTripsExact.toFixed(2)}) = {results.truckTrips} Trips</p>
                    </div>
                 </div>

              </div>
           </div>
        )}

        {/* Detailed Financial Report View */}
        {results && mode === 'civil' && (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative animate-fade-in print:bg-white print:p-0 print:overflow-visible print:h-auto print:block">
            <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:text-black print:p-0 print:overflow-visible print:h-auto print:w-full">
                
                <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Material Takeoff</h1>
                        <p className="text-sm text-slate-500 mt-1 font-mono">Generated by CivisMetric Engine</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest print:text-black">Grand Total</p>
                        <p className="text-4xl font-black text-emerald-600 font-mono print:text-black">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:block">
                    <div className="print:mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Geometry & Operations</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Fill Area Dimensions</td><td className="py-2 font-medium text-right">{inputs.length} × {inputs.width} {inputs.unit}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Fill Depth</td><td className="py-2 font-medium text-right">{inputs.depth} {inputs.unit}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Final Compacted Volume</td><td className="py-2 font-bold text-slate-800 text-right">{results.targetVolM3.toFixed(2)} m³</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Est. Labor Allocation</td><td className="py-2 font-medium text-right text-emerald-600 print:text-black">{results.laborDays} Crew Days</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Ordering Quantities</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Required Loose Volume</td><td className="py-2 font-medium text-right text-slate-800">{results.orderVolM3.toFixed(2)} m³</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Compaction Shrinkage</td><td className="py-2 font-medium text-right text-orange-500 print:text-black">+ {inputs.compactionShrinkage}%</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Handling Wastage</td><td className="py-2 font-medium text-right text-orange-500 print:text-black">+ {inputs.wastage}%</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Total Weight Requirement</td><td className="py-2 font-bold text-right text-amber-700 print:text-black">{results.orderWeightTons.toFixed(2)} Tons</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Bill of Materials</h3>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 print:border-black print:shadow-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider print:bg-transparent print:text-black print:border-b print:border-black">
                            <tr>
                                <th className="p-4 font-semibold">Material / Service</th>
                                <th className="p-4 font-semibold">Quantity</th>
                                <th className="p-4 font-semibold">Rate</th>
                                <th className="p-4 font-semibold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 print:divide-slate-300">
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Bulk Filling Sand</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Includes shrinkage & waste factors</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.orderWeightTons.toFixed(2)} Tons</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.sandPrice}/ton</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costSand.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr className="bg-slate-50/50 print:bg-transparent">
                                <td className="p-4"><p className="font-bold text-slate-800">Spreading & Compaction Crew</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Manual labor / light plate compactor</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.laborDays} Days</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.laborRate}/day</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costLabor.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                        <tfoot className="bg-emerald-50 print:bg-transparent print:border-t-2 print:border-black">
                            <tr>
                                <td colSpan="3" className="p-4 text-right font-bold text-emerald-800 uppercase tracking-widest text-xs print:text-black">Estimated Grand Total</td>
                                <td className="p-4 font-mono font-black text-emerald-600 text-xl text-right print:text-black">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl print:border-black print:bg-transparent print:p-0 mt-4">
                    <p className="text-xs text-amber-800 font-bold mb-1 print:text-black">⚠️ Engineering Note: Bulking of Sand</p>
                    <p className="text-xs text-amber-700 print:text-black">
                      If sand is purchased by *volume* (CFT/m³) instead of weight (Tons), be aware of the "Bulking Effect." 
                      Moisture content between 4% to 6% can cause sand to swell in volume by up to 20-30%. Always specify 
                      whether the purchase volume is for dry sand or factor the moisture content into the final delivery measurement.
                    </p>
                </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}