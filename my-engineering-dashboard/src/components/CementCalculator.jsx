import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048 }; // Volume multiplier will be cubed

const mixDesigns = {
  concrete: [
    { grade: 'M10', ratio: '1:3:6', c: 1, s: 3, a: 6, dryFactor: 1.54 },
    { grade: 'M15', ratio: '1:2:4', c: 1, s: 2, a: 4, dryFactor: 1.54 },
    { grade: 'M20', ratio: '1:1.5:3', c: 1, s: 1.5, a: 3, dryFactor: 1.54 },
    { grade: 'M25', ratio: '1:1:2', c: 1, s: 1, a: 2, dryFactor: 1.54 },
  ],
  mortar: [
    { grade: 'Heavy (1:3)', ratio: '1:3', c: 1, s: 3, a: 0, dryFactor: 1.33 },
    { grade: 'Standard (1:4)', ratio: '1:4', c: 1, s: 4, a: 0, dryFactor: 1.33 },
    { grade: 'Plaster (1:5)', ratio: '1:5', c: 1, s: 5, a: 0, dryFactor: 1.33 },
    { grade: 'Light (1:6)', ratio: '1:6', c: 1, s: 6, a: 0, dryFactor: 1.33 },
  ]
};

// Material Constants
const DENSITY_SAND = 1550; // kg/m3
const DENSITY_AGG = 1500; // kg/m3
const VOL_CEMENT_BAG = 0.03472; // m3 per 50kg bag

const COLORS = {
  CEMENT: 0x9ca3af, // Gray
  SAND: 0xd4b483, // Yellow-ish
  AGGREGATE: 0x4b5563, // Dark Gray
  WATER: 0x3b82f6, // Blue
  PALLET: 0x8b5a2b, // Wood
  BLUEPRINT: 0x0ea5e9
};

export default function CementCalculator() {
  const [inputs, setInputs] = useState({
    mixType: 'concrete', // 'concrete' or 'mortar'
    gradeIndex: 1, // Default to M15 or 1:4
    volume: 10,
    unit: 'm', // 'm' (m3) or 'ft' (cft)
    wastage: 5,
    cementPrice: 400, // per bag
    sandPrice: 1200, // per ton
    aggPrice: 1000, // per ton
    laborRate: 1500, // per day
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
    if (name === 'mixType') {
      setInputs(prev => ({ ...prev, mixType: value, gradeIndex: 0 }));
    } else {
      let parsedValue = ['currency', 'unit'].includes(name) ? value : parseFloat(value) || 0;
      if (typeof parsedValue === 'number' && name !== 'gradeIndex') parsedValue = Math.max(0, parsedValue);
      setInputs(prev => ({ ...prev, [name]: parsedValue }));
    }
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
    camera.position.set(12, 8, 15);
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
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2); 
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.position.set(-15, 5, -15);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(50, 50, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = -0.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      if (animationDataRef.current.active && sceneObjectsRef.current.siloParts) {
        const elapsed = (Date.now() - animationDataRef.current.startTime) / 1000;
        const { siloParts, bagsMesh } = sceneObjectsRef.current;
        
        // Animate silo filling up
        siloParts.forEach((part, i) => {
          const delay = i * 0.5;
          if (elapsed > delay) {
            const progress = Math.min(1, (elapsed - delay) / 1.0);
            part.scale.y = Math.max(0.001, progress);
          } else {
            part.scale.y = 0.001;
          }
        });

        // Animate bags dropping
        if (bagsMesh && elapsed > 1.5) {
          const bagProgress = Math.min(1, (elapsed - 1.5) / 2.0);
          bagsMesh.position.y = THREE.MathUtils.lerp(5, 0, bagProgress);
          bagsMesh.material.opacity = bagProgress;
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
    const { mixType, gradeIndex, volume, unit, wastage, cementPrice, sandPrice, aggPrice, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!volume || !scene) return;

    // 1. Math Calculations
    const activeMix = mixDesigns[mixType][gradeIndex];
    const volM3 = unit === 'ft' ? volume * 0.0283168 : volume; // cft to m3

    const wetVolume = volM3;
    const dryVolumeExact = wetVolume * activeMix.dryFactor;
    const dryVolumeOrder = dryVolumeExact * (1 + (wastage / 100));

    const sumRatio = activeMix.c + activeMix.s + activeMix.a;

    // Volumes in m3
    const cementVol = (activeMix.c / sumRatio) * dryVolumeOrder;
    const sandVol = (activeMix.s / sumRatio) * dryVolumeOrder;
    const aggVol = (activeMix.a / sumRatio) * dryVolumeOrder;

    // Conversions
    const cementBagsExact = cementVol / VOL_CEMENT_BAG;
    const cementBagsBuy = Math.ceil(cementBagsExact);
    const cementKg = cementBagsBuy * 50;

    const sandKg = sandVol * DENSITY_SAND;
    const sandTons = sandKg / 1000;

    const aggKg = aggVol * DENSITY_AGG;
    const aggTons = aggKg / 1000;

    const waterLiters = cementKg * 0.5; // Avg W/C ratio of 0.5

    // Financials
    const costCement = cementBagsBuy * cementPrice;
    const costSand = sandTons * sandPrice;
    const costAgg = aggTons * aggPrice;
    
    // Labor: rough estimate, 1 day of crew per 3 m3 of concrete pouring
    const laborDays = Math.ceil(wetVolume / 3);
    const costLabor = laborDays * laborRate;

    const grandTotal = costCement + costSand + costAgg + costLabor;

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

    const getMat = (hex) => new THREE.MeshStandardMaterial({
      color: isBlueprint ? COLORS.BLUEPRINT : hex,
      wireframe: isBlueprint,
      transparent: isBlueprint,
      opacity: isBlueprint ? 0.4 : 0.9,
      roughness: 0.8
    });

    // A. Proportion Silo (Glass beaker showing ratios)
    const siloRadius = 2;
    const baseHeight = 6;
    
    // Glass Shell
    if (!isBlueprint) {
      const shellGeo = new THREE.CylinderGeometry(siloRadius + 0.1, siloRadius + 0.1, baseHeight + 0.2, 32);
      const shellMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transparent: true, opacity: 0.15, roughness: 0.1, transmission: 0.9, thickness: 0.1
      });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      shell.position.set(-4, baseHeight/2, 0);
      mainGroup.add(shell);
    }

    // Material Layers inside Silo
    const siloParts = [];
    let currentY = 0;
    
    const addLayer = (ratioPart, color, name) => {
      if (ratioPart <= 0) return;
      const height = (ratioPart / sumRatio) * baseHeight;
      const geo = new THREE.CylinderGeometry(siloRadius, siloRadius, height, 32);
      geo.translate(0, height / 2, 0);
      const mesh = new THREE.Mesh(geo, getMat(color));
      mesh.position.set(-4, currentY, 0);
      mesh.castShadow = !isBlueprint;
      mesh.receiveShadow = !isBlueprint;
      mainGroup.add(mesh);
      siloParts.push(mesh);
      currentY += height;
    };

    addLayer(activeMix.a, COLORS.AGGREGATE, 'Agg');
    addLayer(activeMix.s, COLORS.SAND, 'Sand');
    addLayer(activeMix.c, COLORS.CEMENT, 'Cement');

    // B. Stacked Cement Bags on Pallet
    const bagW = 0.6, bagH = 0.15, bagD = 0.4;
    const displayBags = Math.min(cementBagsBuy, 100); // Cap for performance
    
    // Pallet
    const palletGeo = new THREE.BoxGeometry(1.5, 0.15, 1.5);
    const palletMesh = new THREE.Mesh(palletGeo, getMat(COLORS.PALLET));
    palletMesh.position.set(4, 0.075, 0);
    palletMesh.castShadow = !isBlueprint;
    mainGroup.add(palletMesh);

    // Instanced Bags
    const bagGeo = new THREE.BoxGeometry(bagW * 0.9, bagH * 0.9, bagD * 0.9);
    const bagMat = new THREE.MeshStandardMaterial({ 
      color: isBlueprint ? COLORS.BLUEPRINT : 0xcccccc, 
      roughness: 0.9, wireframe: isBlueprint, transparent: isBlueprint, opacity: isBlueprint ? 0.5 : 1 
    });
    const bagsMesh = new THREE.InstancedMesh(bagGeo, bagMat, displayBags);
    bagsMesh.castShadow = !isBlueprint;

    const dummy = new THREE.Object3D();
    const bagsPerLayer = 6; // 2x3 layout
    
    for (let i = 0; i < displayBags; i++) {
      const layer = Math.floor(i / bagsPerLayer);
      const posInLayer = i % bagsPerLayer;
      
      const row = Math.floor(posInLayer / 2); // 0, 1, 2
      const col = posInLayer % 2; // 0, 1

      // Alternate orientation per layer for realistic stacking
      const isRotated = layer % 2 !== 0;
      
      let x = 4 - 0.3 + (col * 0.6);
      let z = -0.4 + (row * 0.4);
      let rotY = 0;

      if (isRotated) {
        x = 4 - 0.4 + (row * 0.4);
        z = -0.3 + (col * 0.6);
        rotY = Math.PI / 2;
      }

      const y = 0.15 + (layer * bagH) + (bagH / 2);
      
      // Slight randomization for realism
      const jitterX = (Math.random() - 0.5) * 0.05;
      const jitterZ = (Math.random() - 0.5) * 0.05;

      dummy.position.set(x + jitterX, y, z + jitterZ);
      dummy.rotation.set(0, rotY + (Math.random() - 0.5)*0.1, 0);
      dummy.updateMatrix();
      bagsMesh.setMatrixAt(i, dummy.matrix);
    }
    
    bagsMesh.instanceMatrix.needsUpdate = true;
    mainGroup.add(bagsMesh);

    scene.add(mainGroup);

    sceneObjectsRef.current = { siloParts, bagsMesh };
    animationDataRef.current = { active: true, startTime: Date.now() }; // Auto trigger animation on calculate

    // Adjust Camera
    cameraRef.current.position.set(0, 8, 14);
    controlsRef.current.target.set(0, 3, 0);

    setResults({
      activeMix, sumRatio, wetVolume, dryVolumeExact, dryVolumeOrder,
      cementVol, cementBagsExact, cementBagsBuy, cementKg,
      sandVol, sandKg, sandTons, aggVol, aggKg, aggTons, waterLiters,
      costCement, costSand, costAgg, laborDays, costLabor, grandTotal
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 md:p-6 bg-[#020617] text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-sky-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-slate-600/20 blur-[150px] rounded-full pointer-events-none print:hidden"></div>

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[380px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-700 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/30 text-lg">🧪</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">CivisMetric</h2>
                  <p className="text-[9px] text-sky-400 font-mono uppercase tracking-widest">Mix Designer</p>
                </div>
            </div>
            <select name="currency" value={inputs.currency} onChange={handleInputChange} className="bg-slate-800/80 border border-slate-600/50 rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-sky-500 text-sky-400 font-bold transition-all cursor-pointer">
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
            </select>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            
            {/* Mix Type & Volume */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-sky-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-sky-400 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9]"></span>Mix Specifications
                </h3>
                
                <div className="flex p-1 bg-slate-900/80 rounded-lg border border-slate-700/50 mb-3">
                    <button onClick={() => setInputs(p => ({...p, mixType: 'concrete', gradeIndex: 1}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${inputs.mixType === 'concrete' ? 'bg-sky-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Concrete</button>
                    <button onClick={() => setInputs(p => ({...p, mixType: 'mortar', gradeIndex: 1}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${inputs.mixType === 'mortar' ? 'bg-sky-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Mortar</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Grade / Ratio (C:S:A)</label>
                        <select name="gradeIndex" value={inputs.gradeIndex} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs outline-none cursor-pointer focus:ring-1 focus:ring-sky-500 text-white font-mono">
                            {mixDesigns[inputs.mixType].map((mix, idx) => (
                                <option key={idx} value={idx}>{mix.grade} ({mix.ratio})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Target Wet Vol</label>
                      <input type="number" step="0.5" name="volume" value={inputs.volume} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sky-500 outline-none text-sky-400 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Unit</label>
                      <select name="unit" value={inputs.unit} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs outline-none cursor-pointer focus:ring-1 focus:ring-sky-500 text-white">
                          <option value="m">Cubic Meters (m³)</option>
                          <option value="ft">Cubic Feet (cft)</option>
                      </select>
                    </div>
                </div>
            </div>

            {/* Waste Buffer */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-orange-400 transition-colors"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>Wastage Buffer</h3>
                <div>
                    <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-orange-500">
                        <input type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                        <span className="text-slate-500 text-xs">%</span>
                    </div>
                    <p className="text-[8px] text-slate-500 mt-1 uppercase">Standard allowance for handling & spillage</p>
                </div>
            </div>

            {/* Financial Rates */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group mb-2">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Market Rates</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Cement (50kg Bag)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="cementPrice" value={inputs.cementPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Sand (per Ton)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="sandPrice" value={inputs.sandPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  {inputs.mixType === 'concrete' && (
                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[11px] text-slate-400 font-medium ml-1">Aggregate (per Ton)</span>
                        <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                            <span className="text-emerald-500">{inputs.currency}</span>
                            <input type="number" name="aggPrice" value={inputs.aggPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                        </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-emerald-900/10 p-2 rounded-lg border border-emerald-800/30">
                      <span className="text-[11px] text-emerald-400/80 font-medium ml-1">Mixing Crew (Day)</span>
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
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Cement Reqd.</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500 leading-none">{results.cementBagsBuy} Bags</span>
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
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Volumetric Mathematics</h2>
                ) : null}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {(mode === 'civil' || mode === 'math') && (
                    <button onClick={handlePrint} className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
                    </button>
                )}

                <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
                    <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'normal' ? 'bg-sky-500 text-slate-900 shadow-[0_0_10px_rgba(14,165,233,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
                    <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'math' ? 'bg-indigo-500 text-slate-900 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
                    <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'civil' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>Report</button>
                </div>
            </div>
        </div>

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] group print:hidden`}>
            <div ref={mountRef} className="absolute inset-0 cursor-move"></div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={triggerSimulation} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all bg-sky-500/20 text-sky-400 border border-sky-500/50 hover:bg-sky-500 hover:text-slate-900 mr-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Re-mix
                </button>
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/50' : 'text-slate-500 hover:text-slate-400'}`}>Solid</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.2)]' : 'text-slate-500 hover:text-slate-400'}`}>Wireframe</button>
            </div>
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-slate-200 pb-6 mb-8 print:border-black">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Volumetric Conversion</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Wet to Dry State Mathematical Proof</p>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                 {/* Step 1 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-sky-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 1: Dry Volume Factor</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// Dry materials shrink when mixed with water. We must calculate the dry volume required to yield the target wet volume.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Target Wet Volume</span> = {results.wetVolume.toFixed(3)} m³</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Material Constant</span> = {results.activeMix.dryFactor} (Standard for {inputs.mixType})</p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Dry Volume (Exact)</span> = {results.wetVolume.toFixed(3)} × {results.activeMix.dryFactor} = <span className="font-bold text-slate-900">{results.dryVolumeExact.toFixed(3)} m³</span></p>
                        <p><span className="text-slate-400 print:text-black font-bold">Dry Volume (Order +{inputs.wastage}%)</span> = {results.dryVolumeExact.toFixed(3)} × {(1 + inputs.wastage/100).toFixed(2)} = <span className="font-bold text-sky-700">{results.dryVolumeOrder.toFixed(3)} m³</span></p>
                    </div>
                 </div>

                 {/* Step 2 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 2: Proportional Division ({results.activeMix.ratio})</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Sum of Ratio</span> = {results.activeMix.c} + {results.activeMix.s} {inputs.mixType === 'concrete' ? `+ ${results.activeMix.a}` : ''} = <span className="font-bold text-slate-900">{results.sumRatio} parts</span></p>
                        <br/>
                        <div className="border-l-4 border-slate-400 pl-4 py-1 print:border-black print:border-l-2">
                            <p className="font-bold text-slate-900 mb-2">Cement (Part = {results.activeMix.c})</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Volume</span> = ({results.activeMix.c} / {results.sumRatio}) × {results.dryVolumeOrder.toFixed(3)} = <span className="font-bold text-slate-900">{results.cementVol.toFixed(3)} m³</span></p>
                            <p className="text-xs text-slate-500 italic mt-1 print:text-black">// Note: 1 Bag of cement (50kg) = 0.0347 m³</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Bags Exact</span> = {results.cementVol.toFixed(3)} / 0.0347 = <span className="font-bold text-slate-900">{results.cementBagsExact.toFixed(2)} Bags</span></p>
                        </div>
                        <br/>
                        <div className="border-l-4 border-yellow-500 pl-4 py-1 print:border-black print:border-l-2">
                            <p className="font-bold text-slate-900 mb-2">Sand (Part = {results.activeMix.s})</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Volume</span> = ({results.activeMix.s} / {results.sumRatio}) × {results.dryVolumeOrder.toFixed(3)} = <span className="font-bold text-slate-900">{results.sandVol.toFixed(3)} m³</span></p>
                            <p className="text-xs text-slate-500 italic mt-1 print:text-black">// Standard sand density ≈ 1550 kg/m³</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Weight</span> = {results.sandVol.toFixed(3)} × 1550 = <span className="font-bold text-yellow-700">{results.sandKg.toFixed(2)} kg ({results.sandTons.toFixed(2)} Tons)</span></p>
                        </div>
                        {inputs.mixType === 'concrete' && (
                          <>
                            <br/>
                            <div className="border-l-4 border-gray-600 pl-4 py-1 print:border-black print:border-l-2">
                                <p className="font-bold text-slate-900 mb-2">Aggregate (Part = {results.activeMix.a})</p>
                                <p><span className="text-slate-400 print:text-black font-bold">Volume</span> = ({results.activeMix.a} / {results.sumRatio}) × {results.dryVolumeOrder.toFixed(3)} = <span className="font-bold text-slate-900">{results.aggVol.toFixed(3)} m³</span></p>
                                <p className="text-xs text-slate-500 italic mt-1 print:text-black">// Standard aggregate density ≈ 1500 kg/m³</p>
                                <p><span className="text-slate-400 print:text-black font-bold">Weight</span> = {results.aggVol.toFixed(3)} × 1500 = <span className="font-bold text-gray-700">{results.aggKg.toFixed(2)} kg ({results.aggTons.toFixed(2)} Tons)</span></p>
                            </div>
                          </>
                        )}
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
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Mix Profile</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Mix Type</td><td className="py-2 font-bold text-slate-800 capitalize text-right">{inputs.mixType}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Grade Designation</td><td className="py-2 font-medium text-right text-sky-600 print:text-black">{results.activeMix.grade}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Nominal Ratio</td><td className="py-2 font-medium text-right">{results.activeMix.ratio}</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Est. Water Req. (W/C 0.5)</td><td className="py-2 font-medium text-right">{results.waterLiters.toFixed(0)} Liters</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Quantities</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Target Wet Volume</td><td className="py-2 font-medium text-right">{inputs.volume} {inputs.unit === 'ft' ? 'cft' : 'm³'}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Required Dry Mix</td><td className="py-2 font-medium text-right text-slate-800">{results.dryVolumeExact.toFixed(2)} m³</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Wastage Compensation</td><td className="py-2 font-medium text-right text-orange-500 print:text-black">+ {inputs.wastage}%</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Est. Operations</td><td className="py-2 font-medium text-right text-emerald-600 print:text-black">{results.laborDays} Crew Days</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Bill of Materials</h3>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 print:border-black print:shadow-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider print:bg-transparent print:text-black print:border-b print:border-black">
                            <tr>
                                <th className="p-4 font-semibold">Material</th>
                                <th className="p-4 font-semibold">Required</th>
                                <th className="p-4 font-semibold">Rate</th>
                                <th className="p-4 font-semibold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 print:divide-slate-300">
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Portland Cement</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Rounded to full bags</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.cementBagsBuy} Bags</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.cementPrice}/bag</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costCement.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Fine Aggregate (Sand)</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.sandTons.toFixed(2)} Tons</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.sandPrice}/ton</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costSand.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            {inputs.mixType === 'concrete' && (
                              <tr>
                                  <td className="p-4"><p className="font-bold text-slate-800">Coarse Aggregate</p></td>
                                  <td className="p-4 font-mono text-slate-600 print:text-black">{results.aggTons.toFixed(2)} Tons</td>
                                  <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.aggPrice}/ton</td>
                                  <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costAgg.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                              </tr>
                            )}
                            <tr className="bg-slate-50/50 print:bg-transparent">
                                <td className="p-4"><p className="font-bold text-slate-800">Crew / Plant Mix Operations</p></td>
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
                
                <p className="text-xs text-slate-400 text-center italic print:hidden">* Based on IS 456 / standard volumetric conversions. Actual yields may vary based on aggregate specific gravity and moisture content.</p>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}