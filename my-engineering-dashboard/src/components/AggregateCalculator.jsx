import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048 };

// Aggregate Types Database (Density in kg/m3, standard compaction shrinkage %)
const aggregateTypes = {
  pea_10mm: { name: "10mm Pea Gravel", density: 1450, compaction: 8 },
  stone_20mm: { name: "20mm Crushed Stone", density: 1550, compaction: 10 },
  stone_40mm: { name: "40mm Base Coarse", density: 1600, compaction: 12 },
  gsb_mixed: { name: "Granular Sub-Base (GSB)", density: 1750, compaction: 15 },
};

const COLORS = {
  ROCK_1: 0x64748b, // Slate 500
  ROCK_2: 0x94a3b8, // Slate 400
  ROCK_3: 0x475569, // Slate 600
  ROCK_4: 0x334155, // Slate 700
  BOUNDARY: 0x1e293b,
  BLUEPRINT_STRUCT: 0x0ea5e9,
  BLUEPRINT_FILL: 0x94a3b8
};

export default function AggregateCalculator() {
  const [inputs, setInputs] = useState({
    aggType: 'stone_20mm',
    length: 50, 
    width: 20, 
    depth: 0.5, // 6 inches = 0.5 ft
    unit: 'ft',
    wastage: 5,
    aggPrice: 850, // per ton
    truckCapacity: 20, // in tons
    laborRate: 1000, // per day for spreading/compacting
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
    let parsedValue = ['currency', 'unit', 'aggType'].includes(name) ? value : parseFloat(value) || 0;
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
    controls.autoRotateSpeed = 0.3;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); 
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x94a3b8, 0.6);
    rimLight.position.set(-15, 5, -15);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(100, 100, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = -0.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    let animationFrameId;
    const dummy = new THREE.Object3D();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      if (animationDataRef.current.active && sceneObjectsRef.current.rocksMesh && sceneObjectsRef.current.animData) {
        const elapsed = (Date.now() - animationDataRef.current.startTime) / 1000;
        const { rocksMesh, animData } = sceneObjectsRef.current;
        
        let stillAnimating = false;
        
        animData.forEach((data, i) => {
          if (elapsed > data.delay) {
            if (data.currentY > data.targetY) {
              stillAnimating = true;
              // Gravity acceleration simulation
              data.velocity += 0.02;
              data.currentY -= data.velocity;
              
              if (data.currentY <= data.targetY) {
                data.currentY = data.targetY; // hit the ground
              }
              
              dummy.position.set(data.x, data.currentY, data.z);
              dummy.rotation.set(data.rotX, data.rotY, data.rotZ);
              dummy.scale.setScalar(data.scale);
              dummy.updateMatrix();
              rocksMesh.setMatrixAt(i, dummy.matrix);
            }
          }
        });

        if (stillAnimating) {
          rocksMesh.instanceMatrix.needsUpdate = true;
        } else {
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
    if (sceneObjectsRef.current.animData) {
        sceneObjectsRef.current.animData.forEach(d => {
            d.currentY = d.startY;
            d.velocity = 0;
        });
        animationDataRef.current = { active: true, startTime: Date.now() };
    }
  };

  // --- Core Math & 3D Update ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 300);
    return () => clearTimeout(handler);
  }, [inputs, visualTheme]);

  const calculateAndRender = () => {
    const { aggType, length, width, depth, unit, wastage, aggPrice, truckCapacity, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!length || !width || !depth || !scene) return;

    // 1. Math Calculations (Convert to Meters internally)
    const mult = unitToMeter[unit];
    const lenM = length * mult;
    const widM = width * mult;
    const depthM = depth * mult;

    const selectedAgg = aggregateTypes[aggType];
    const density = selectedAgg.density;
    const shrinkage = selectedAgg.compaction;

    // Target Volume (Compacted State)
    const targetVolM3 = lenM * widM * depthM;
    const targetVolCFT = targetVolM3 * 35.3147;

    // Loose Volume required to achieve Target Volume
    const looseVolM3 = targetVolM3 * (1 + (shrinkage / 100));
    
    // Order Volume (factoring in transportation/handling wastage)
    const orderVolM3 = looseVolM3 * (1 + (wastage / 100));
    const orderVolCFT = orderVolM3 * 35.3147;

    // Weight Calculations
    const orderWeightKg = orderVolM3 * density;
    const orderWeightTons = orderWeightKg / 1000;

    // Logistics
    const truckTripsExact = orderWeightTons / truckCapacity;
    const truckTrips = Math.ceil(truckTripsExact);

    // Financials
    const costAgg = orderWeightTons * aggPrice;
    
    // Labor: rough estimate, 1 crew day per 15 m3 of spreading & compacting aggregate
    const laborDays = Math.ceil(targetVolM3 / 15);
    const costLabor = laborDays * laborRate;

    const grandTotal = costAgg + costLabor;

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
      color: isBlueprint ? COLORS.BLUEPRINT_STRUCT : hex,
      wireframe: isBlueprint,
      transparent: isBlueprint || isTransparent,
      opacity: isBlueprint ? 0.4 : opacityVal,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    // Render Scale Protection
    const scaleFactor = Math.max(lenM, widM) > 40 ? 40 / Math.max(lenM, widM) : 1;
    const rLen = lenM * scaleFactor;
    const rWid = widM * scaleFactor;
    const rDep = depthM * scaleFactor;
    const wallThick = 0.4;

    // A. Boundary Forms
    const buildWall = (w, h, d, x, y, z) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, getMat(COLORS.BOUNDARY));
        mesh.position.set(x, y, z);
        mesh.castShadow = !isBlueprint;
        mesh.receiveShadow = !isBlueprint;
        mainGroup.add(mesh);
    };

    const wallHt = rDep + 0.2;
    buildWall(rLen + wallThick*2, wallHt, wallThick, 0, wallHt/2, (rWid/2) + (wallThick/2)); // South
    buildWall(rLen + wallThick*2, wallHt, wallThick, 0, wallHt/2, -(rWid/2) - (wallThick/2)); // North
    buildWall(wallThick, wallHt, rWid, (rLen/2) + (wallThick/2), wallHt/2, 0); // East
    buildWall(wallThick, wallHt, rWid, -(rLen/2) - (wallThick/2), wallHt/2, 0); // West

    // B. Aggregate Instanced Mesh (The Rocks)
    // Calculate how many rocks to show. Cap at 5000 for performance.
    const volumeRatio = (rLen * rWid * rDep);
    const particleCount = Math.max(10, Math.min(5000, Math.floor(volumeRatio * 200)));
    
    // Use Dodecahedron for a "crushed stone" look
    const rockGeo = new THREE.DodecahedronGeometry(0.15, 0); 
    const rockMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.9,
        wireframe: isBlueprint,
        transparent: isBlueprint,
        opacity: isBlueprint ? 0.6 : 1
    });
    
    const rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, particleCount);
    rocksMesh.castShadow = !isBlueprint;
    rocksMesh.receiveShadow = !isBlueprint;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const rockColors = [COLORS.ROCK_1, COLORS.ROCK_2, COLORS.ROCK_3, COLORS.ROCK_4];
    const animData = [];

    for (let i = 0; i < particleCount; i++) {
        // Random final position within the bounds
        const targetX = (Math.random() - 0.5) * (rLen - 0.2);
        const targetZ = (Math.random() - 0.5) * (rWid - 0.2);
        const targetY = (Math.random() * rDep) + 0.05;

        // Start position (dropping from above)
        const startY = targetY + 5 + (Math.random() * 5);
        const scale = 0.5 + (Math.random() * 0.8);
        
        const rotX = Math.random() * Math.PI;
        const rotY = Math.random() * Math.PI;
        const rotZ = Math.random() * Math.PI;

        animData.push({
            x: targetX, z: targetZ, 
            targetY, startY, currentY: startY,
            rotX, rotY, rotZ, scale,
            delay: Math.random() * 1.5,
            velocity: 0
        });

        // Hide initially
        dummy.position.set(targetX, startY, targetZ);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        rocksMesh.setMatrixAt(i, dummy.matrix);

        // Assign random gray color
        if (!isBlueprint) {
            color.setHex(rockColors[Math.floor(Math.random() * rockColors.length)]);
            rocksMesh.setColorAt(i, color);
        } else {
            color.setHex(COLORS.BLUEPRINT_FILL);
            rocksMesh.setColorAt(i, color);
        }
    }

    rocksMesh.instanceMatrix.needsUpdate = true;
    if (rocksMesh.instanceColor) rocksMesh.instanceColor.needsUpdate = true;
    mainGroup.add(rocksMesh);

    scene.add(mainGroup);

    sceneObjectsRef.current = { rocksMesh, animData };
    animationDataRef.current = { active: true, startTime: Date.now() };

    // Adjust Camera dynamically
    const maxDim = Math.max(rLen, rWid);
    cameraRef.current.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.2);
    controlsRef.current.target.set(0, rDep / 2, 0);

    setResults({
      selectedAgg, targetVolM3, targetVolCFT, looseVolM3, 
      orderVolM3, orderVolCFT, orderWeightKg, orderWeightTons,
      truckTripsExact, truckTrips,
      costAgg, laborDays, costLabor, grandTotal
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 md:p-6 bg-[#020617] text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block">
      
      {/* Background Glows (Zinc/Slate theme for rocks) */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-slate-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-zinc-600/10 blur-[150px] rounded-full pointer-events-none print:hidden"></div>

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[380px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-zinc-600 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/30 text-lg">🪨</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">CivisMetric</h2>
                  <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">Aggregate Engine</p>
                </div>
            </div>
            <select name="currency" value={inputs.currency} onChange={handleInputChange} className="bg-slate-800/80 border border-slate-600/50 rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-slate-500 text-slate-300 font-bold transition-all cursor-pointer">
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
            </select>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            
            {/* Aggregate Type */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-slate-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-slate-400 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_8px_#64748b]"></span>Material Specification
                </h3>
                <select name="aggType" value={inputs.aggType} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs outline-none cursor-pointer focus:ring-1 focus:ring-slate-500 text-white font-mono mb-2">
                    {Object.entries(aggregateTypes).map(([key, data]) => (
                        <option key={key} value={key}>{data.name}</option>
                    ))}
                </select>
                <div className="flex justify-between text-[9px] text-slate-500 px-1 font-mono">
                    <span>{aggregateTypes[inputs.aggType].density} kg/m³</span>
                    <span>{aggregateTypes[inputs.aggType].compaction}% Shrinkage</span>
                </div>
            </div>

            {/* Dimensions */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-slate-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-slate-400 transition-colors">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>Base Geometry
                    </h3>
                    <select name="unit" value={inputs.unit} onChange={handleInputChange} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-slate-500 transition-all">
                        <option value="ft">Feet</option>
                        <option value="m">Meters</option>
                    </select>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length</label>
                      <input type="number" step="0.1" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-500 outline-none text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Width</label>
                      <input type="number" step="0.1" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-500 outline-none text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Depth</label>
                      <input type="number" step="0.1" name="depth" value={inputs.depth} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-500 outline-none text-slate-300 font-bold" />
                    </div>
                </div>
            </div>

            {/* Logistics & Waste */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-zinc-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-zinc-400 transition-colors"><span className="w-2 h-2 rounded-full bg-zinc-500"></span>Wastage & Logistics</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Spill Wastage</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-zinc-500">
                            <input type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Dump Truck Size</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-zinc-500">
                            <input type="number" name="truckCapacity" value={inputs.truckCapacity} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                            <span className="text-slate-500 text-[10px] uppercase">Tons</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Rates */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group mb-2">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Cost Estimation</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Aggregate (per Ton)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="aggPrice" value={inputs.aggPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-900/10 p-2 rounded-lg border border-emerald-800/30">
                      <span className="text-[11px] text-emerald-400/80 font-medium ml-1">Spreading Crew (Day)</span>
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
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Weight</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500 leading-none">{results.orderWeightTons.toFixed(1)} Tons</span>
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
                    <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'normal' ? 'bg-slate-500 text-white shadow-[0_0_10px_rgba(100,116,139,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
                    <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'math' ? 'bg-indigo-500 text-slate-900 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
                    <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'civil' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>Report</button>
                </div>
            </div>
        </div>

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] group print:hidden`}>
            <div ref={mountRef} className="absolute inset-0 cursor-move"></div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={triggerSimulation} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all bg-slate-500/20 text-slate-300 border border-slate-500/50 hover:bg-slate-500 hover:text-white mr-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Drop Aggregate
                </button>
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/50' : 'text-slate-500 hover:text-slate-400'}`}>Solid</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.2)]' : 'text-slate-500 hover:text-slate-400'}`}>Wireframe</button>
            </div>
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-slate-200 pb-6 mb-8 print:border-black">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Volumetric Shrinkage Analysis</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Geotechnical Conversions: {results.selectedAgg.name}</p>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 1: Target Compacted Volume</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// This is the final geometrical volume the aggregate must occupy inside the base course after mechanical compaction.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Target Volume</span> = Length × Width × Depth</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Target Volume</span> = {(inputs.length * unitToMeter[inputs.unit]).toFixed(3)}m × {(inputs.width * unitToMeter[inputs.unit]).toFixed(3)}m × {(inputs.depth * unitToMeter[inputs.unit]).toFixed(3)}m</p>
                        <p className="text-slate-700 print:text-black font-bold text-base mt-2">Compacted Target Volume = {results.targetVolM3.toFixed(3)} m³ ({results.targetVolCFT.toFixed(2)} cft)</p>
                    </div>
                 </div>

                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 2: Loose Volume & Shrinkage Factor</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// Aggregate is delivered in a "loose" state. When compacted with a roller, air voids are eliminated, causing a volume reduction (shrinkage) of ~{results.selectedAgg.compaction}%. You must order MORE loose aggregate to achieve the final compacted volume.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Required Loose Volume</span> = Target Volume × (1 + Shrinkage Factor)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Required Loose Volume</span> = {results.targetVolM3.toFixed(3)} × (1 + {results.selectedAgg.compaction/100}) = <span className="font-bold text-slate-900">{results.looseVolM3.toFixed(3)} m³</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Final Order Volume (+{inputs.wastage}% Handling Waste)</span> = {results.looseVolM3.toFixed(3)} × (1 + {inputs.wastage/100})</p>
                        <p className="text-slate-800 print:text-black font-bold text-base mt-2">Total Loose Volume to Order = {results.orderVolM3.toFixed(3)} m³ ({results.orderVolCFT.toFixed(2)} cft)</p>
                    </div>
                 </div>

                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-zinc-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 3: Tonnage & Logistics</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// To calculate truckloads, convert the loose volume to weight using the specific gravity/density of {results.selectedAgg.name}.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Material Density</span> ≈ {results.selectedAgg.density} kg/m³</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Total Weight</span> = Order Volume × Density</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Total Weight</span> = {results.orderVolM3.toFixed(3)} × {results.selectedAgg.density} = <span className="font-bold text-slate-900">{results.orderWeightKg.toFixed(2)} kg ({results.orderWeightTons.toFixed(2)} Tons)</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Truck Trips</span> = Total Tonnage / Truck Capacity</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Truck Trips</span> = {results.orderWeightTons.toFixed(2)} / {inputs.truckCapacity} = <span className="font-bold text-slate-900">{results.truckTripsExact.toFixed(2)}</span></p>
                        <p className="text-zinc-700 print:text-black font-bold text-base mt-2">Required Dump Trucks = Math.ceil({results.truckTripsExact.toFixed(2)}) = {results.truckTrips} Trips</p>
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
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Geometry & Material</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Base Area Dimensions</td><td className="py-2 font-medium text-right">{inputs.length} × {inputs.width} {inputs.unit}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Base Depth</td><td className="py-2 font-medium text-right">{inputs.depth} {inputs.unit}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Material Type</td><td className="py-2 font-bold text-slate-800 text-right">{results.selectedAgg.name}</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Est. Labor Allocation</td><td className="py-2 font-medium text-right text-emerald-600 print:text-black">{results.laborDays} Crew Days</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Ordering Quantities</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Final Compacted Volume</td><td className="py-2 font-bold text-slate-800 text-right">{results.targetVolM3.toFixed(2)} m³</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Compaction Shrinkage</td><td className="py-2 font-medium text-right text-slate-600 print:text-black">+ {results.selectedAgg.compaction}%</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Handling Wastage</td><td className="py-2 font-medium text-right text-slate-600 print:text-black">+ {inputs.wastage}%</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Total Weight Requirement</td><td className="py-2 font-bold text-right text-zinc-700 print:text-black">{results.orderWeightTons.toFixed(2)} Tons</td></tr>
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
                                <td className="p-4"><p className="font-bold text-slate-800">{results.selectedAgg.name}</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Delivered loose via {results.truckTrips} truck loads</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.orderWeightTons.toFixed(2)} Tons</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.aggPrice}/ton</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costAgg.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr className="bg-slate-50/50 print:bg-transparent">
                                <td className="p-4"><p className="font-bold text-slate-800">Spreading & Compaction Crew</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Manual labor / mechanical roller</p></td>
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

            </div>
          </div>
        )}
      </div>
    </div>
  );
}