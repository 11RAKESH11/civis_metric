import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'in': 0.0254, 'cm': 0.01, 'mm': 0.001 };
const sqUnitToSqMeter = { 'm': 1, 'ft': 0.092903, 'in': 0.00064516 };

const soilPresets = {
  earth: { name: "Earth / Loam", swell: 25, shrink: 10, color: '#5c4033', repose: 60 },
  topsoil: { name: "Topsoil", swell: 15, shrink: 15, color: '#3b2f2f', repose: 45 },
  rock: { name: "Solid Rock", swell: 50, shrink: 0, color: '#7a7a7a', repose: 90 },
  sand: { name: "Sand / Gravel", swell: 12, shrink: 12, color: '#c2b280', repose: 30 },
  muck: { name: "Wet Muck / Clay", swell: 30, shrink: 20, color: '#3b3c36', repose: 25 }
};

export default function ExcavationCalculator() {
  const [inputs, setInputs] = useState({
    excL: 30, excW: 15, excD: 6, unit: 'ft',
    workingSpace: 2, 
    slopeAngle: 60, 
    soilType: 'earth',
    swell: 25, shrink: 10,
    truckCapacity: 15, 
    excavationRate: 150, 
    haulageRate: 500, 
    currency: '₹'
  });

  const [mode, setMode] = useState('normal'); 
  const [visualTheme, setVisualTheme] = useState('realistic'); 
  const [results, setResults] = useState(null);
  const [visualWarning, setVisualWarning] = useState("");
  const [safetyWarning, setSafetyWarning] = useState(""); // NEW: OSHA Safety Engine
  
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  
  const groundGroupRef = useRef(null);
  const particlesRef = useRef(null);
  const truckGroupRef = useRef(null);
  const animationDataRef = useRef([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = ['unit', 'soilType', 'currency'].includes(name) ? value : parseFloat(value) || 0;
    if (typeof parsedValue === 'number') parsedValue = Math.max(0, parsedValue);
    
    if (name === 'slopeAngle') parsedValue = Math.min(90, Math.max(15, parsedValue));

    setInputs(prev => {
      const newInputs = { ...prev, [name]: parsedValue };
      if (name === 'soilType' && soilPresets[parsedValue]) {
        newInputs.swell = soilPresets[parsedValue].swell;
        newInputs.shrink = soilPresets[parsedValue].shrink;
        newInputs.slopeAngle = soilPresets[parsedValue].repose;
      }
      return newInputs;
    });
  };

  const handlePrint = () => window.print();

  // --- Initialize 3D Scene ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null; 
    scene.fog = new THREE.FogExp2(0x0f172a, 0.015); 
    sceneRef.current = scene;

    const container = mountRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 2000);
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
    controls.maxPolarAngle = Math.PI / 2 - 0.02; 
    controls.autoRotate = true; 
    controls.autoRotateSpeed = 0.4;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5); 
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.8);
    rimLight.position.set(-30, 20, -30);
    scene.add(rimLight);

    const groundGroup = new THREE.Group();
    scene.add(groundGroup);
    groundGroupRef.current = groundGroup;

    // Build the Upgraded 3D Dump Truck (Active Dumping Pose)
    const truckGroup = new THREE.Group();
    const truckMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 3), truckMat);
    cab.position.set(3, 1.5, 0); cab.castShadow = true; truckGroup.add(cab);
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 2.8), darkMat);
    windowMesh.position.set(3, 2, 0); truckGroup.add(windowMesh);
    
    // Tilted Dump Bed
    const bedGroup = new THREE.Group();
    bedGroup.position.set(1.5, 1.8, 0); // Pivot point
    const bed = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 3.2), darkMat);
    bed.position.set(-2.5, 0, 0); // Offset from pivot
    bed.castShadow = true; 
    bedGroup.add(bed);
    bedGroup.rotation.z = -Math.PI / 5; // Tilt up!
    truckGroup.add(bedGroup);
    
    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16);
    wheelGeo.rotateX(Math.PI/2);
    [[-1.5, 1.8], [-1.5, -1.8], [3, 1.8], [3, -1.8]].forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.position.set(pos[0], 0.8, pos[1]); w.castShadow = true; truckGroup.add(w);
    });
    
    scene.add(truckGroup);
    truckGroupRef.current = truckGroup;

    let animationFrameId;
    const dummy = new THREE.Object3D();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update(); 

      if (particlesRef.current && animationDataRef.current.length > 0) {
        let stillAnimating = false;
        animationDataRef.current.forEach((p, i) => {
          if (p.t < 1) {
            stillAnimating = true;
            p.t += p.speed;
            if(p.t > 1) p.t = 1;
            const currentX = p.startX + (p.endX - p.startX) * p.t;
            const currentZ = p.startZ + (p.endZ - p.startZ) * p.t;
            const height = Math.sin(p.t * Math.PI) * p.arcHeight;
            const currentY = p.startY + (p.endY - p.startY) * p.t + height;

            dummy.position.set(currentX, currentY, currentZ);
            dummy.rotation.set(p.t * Math.PI * 4, p.t * Math.PI * 2, 0);
            dummy.scale.setScalar(p.scale);
            dummy.updateMatrix();
            particlesRef.current.setMatrixAt(i, dummy.matrix);
          }
        });
        particlesRef.current.instanceMatrix.needsUpdate = true;
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

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

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

  // --- Dynamic Core Calculation ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 300);
    return () => clearTimeout(handler);
  }, [inputs, visualTheme]);

  const calculateAndRender = () => {
    const { excL, excW, excD, unit, workingSpace, slopeAngle, swell, shrink, truckCapacity, excavationRate, haulageRate } = inputs;
    const scene = sceneRef.current;
    if(!excL || !excW || !excD || !scene) return;

    // Convert inputs to Meters
    const mult = unitToMeter[unit];
    const foundationL = excL * mult;
    const foundationW = excW * mult;
    const d_m = excD * mult;
    const ws_m = workingSpace * mult;

    // Safety Engine (OSHA standards simulation)
    if (d_m > 1.5 && slopeAngle > 53) {
        setSafetyWarning("⚠️ High Risk: Depth > 1.5m with steep cut. Trench shoring/shielding required by safety codes.");
    } else {
        setSafetyWarning("");
    }

    const L_bot = foundationL + (ws_m * 2);
    const W_bot = foundationW + (ws_m * 2);

    const angleRad = slopeAngle * (Math.PI / 180);
    const horizontalRun = slopeAngle >= 90 ? 0 : d_m / Math.tan(angleRad);
    
    const L_top = L_bot + (horizontalRun * 2);
    const W_top = W_bot + (horizontalRun * 2);

    const A_bot = L_bot * W_bot;
    const A_top = L_top * W_top;
    const A_mid = ((L_bot + L_top) / 2) * ((W_bot + W_top) / 2);
    
    const bankVol = (d_m / 6) * (A_bot + 4 * A_mid + A_top);
    
    const looseVol = bankVol * (1 + (swell / 100));
    const compactedVol = bankVol * (1 - (shrink / 100));

    const totalTrucks = Math.ceil(looseVol / truckCapacity);
    const costExcavation = bankVol * excavationRate;
    const costHauling = totalTrucks * haulageRate;
    const grandTotal = costExcavation + costHauling;

    // --- 3D Scene Assembly ---
    const groundGroup = groundGroupRef.current;
    while(groundGroup.children.length > 0){ 
      const c = groundGroup.children[0];
      groundGroup.remove(c); 
      if(c.geometry) c.geometry.dispose();
    }
    if(particlesRef.current) { scene.remove(particlesRef.current); particlesRef.current.dispose(); }

    const isBlueprint = visualTheme === 'blueprint';
    const baseColor = soilPresets[inputs.soilType].color;
    
    const getMat = (colorHex) => new THREE.MeshStandardMaterial({
        color: isBlueprint ? 0x0ea5e9 : colorHex,
        wireframe: isBlueprint,
        transparent: isBlueprint,
        opacity: isBlueprint ? 0.4 : 1,
        roughness: 1, side: THREE.DoubleSide
    });

    // Pushing the stockpile way back to avoid surcharge collapse
    const pileRadius = Math.sqrt(looseVol) / 1.5;
    const safeDistanceOffset = Math.max(8, horizontalRun * 2 + 5); 
    const pileCenterX = (L_top/2) + pileRadius + safeDistanceOffset;
    const pileCenterZ = 0;

    // 1. Ground Surface
    const terrainSize = Math.max(L_top + pileCenterX, W_top) * 3;
    const shape = new THREE.Shape();
    shape.moveTo(-terrainSize/2, -terrainSize/2);
    shape.lineTo(terrainSize/2, -terrainSize/2);
    shape.lineTo(terrainSize/2, terrainSize/2);
    shape.lineTo(-terrainSize/2, terrainSize/2);
    shape.lineTo(-terrainSize/2, -terrainSize/2);

    const hole = new THREE.Path();
    hole.moveTo(-L_top/2, -W_top/2);
    hole.lineTo(L_top/2, -W_top/2);
    hole.lineTo(L_top/2, W_top/2);
    hole.lineTo(-L_top/2, W_top/2);
    hole.lineTo(-L_top/2, -W_top/2);
    shape.holes.push(hole);

    const groundGeom = new THREE.ShapeGeometry(shape);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeom, getMat('#3f4a30')); 
    groundMesh.receiveShadow = true;
    groundGroup.add(groundMesh);

    // 2. Pit Floor
    const floorGeom = new THREE.PlaneGeometry(L_bot, W_bot);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeom, getMat(baseColor));
    floorMesh.position.y = -d_m;
    floorMesh.receiveShadow = true;
    groundGroup.add(floorMesh);

    // 3. Sloped Walls
    const buildWall = (p1, p2, p3, p4) => {
        const geom = new THREE.BufferGeometry();
        const verts = new Float32Array([...p1, ...p2, ...p3, ...p1, ...p3, ...p4]);
        geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geom.computeVertexNormals();
        const mesh = new THREE.Mesh(geom, getMat(baseColor));
        mesh.receiveShadow = true;
        return mesh;
    };
    
    groundGroup.add(buildWall([-L_top/2, 0, -W_top/2], [L_top/2, 0, -W_top/2], [L_bot/2, -d_m, -W_bot/2], [-L_bot/2, -d_m, -W_bot/2]));
    groundGroup.add(buildWall([L_top/2, 0, W_top/2], [-L_top/2, 0, W_top/2], [-L_bot/2, -d_m, W_bot/2], [L_bot/2, -d_m, W_bot/2]));
    groundGroup.add(buildWall([-L_top/2, 0, W_top/2], [-L_top/2, 0, -W_top/2], [-L_bot/2, -d_m, -W_bot/2], [-L_bot/2, -d_m, W_bot/2]));
    groundGroup.add(buildWall([L_top/2, 0, -W_top/2], [L_top/2, 0, W_top/2], [L_bot/2, -d_m, W_bot/2], [L_bot/2, -d_m, -W_bot/2]));

    // 4. Ghost Foundation
    const foundationGeom = new THREE.BoxGeometry(foundationL, 0.2, foundationW);
    const foundationMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.8 });
    const foundationMesh = new THREE.Mesh(foundationGeom, foundationMat);
    foundationMesh.position.y = -d_m + 0.1;
    groundGroup.add(foundationMesh);

    // --- Particle Animation (Flying Dirt & Far Stockpile) ---
    const particleCount = Math.min(2000, Math.floor(looseVol * 5)); 
    const pGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const pMesh = new THREE.InstancedMesh(pGeom, getMat(baseColor), particleCount);
    pMesh.castShadow = !isBlueprint;
    scene.add(pMesh);
    particlesRef.current = pMesh;

    const animData = [];

    for(let i=0; i<particleCount; i++){
        const sx = (Math.random() - 0.5) * L_bot;
        const sz = (Math.random() - 0.5) * W_bot;
        const sy = -d_m + (Math.random() * d_m);

        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * pileRadius;
        const ex = pileCenterX + Math.cos(angle) * r;
        const ez = pileCenterZ + Math.sin(angle) * r;
        const ey = pileRadius - r; 

        animData.push({
            startX: sx, startY: sy, startZ: sz,
            endX: ex, endY: Math.max(0.2, ey), endZ: ez,
            t: -Math.random() * 2, 
            speed: 0.008 + Math.random() * 0.015,
            arcHeight: 5 + Math.random() * 5 + d_m,
            scale: 0.4 + Math.random() * 1.2
        });
    }
    animationDataRef.current = animData;

    // Position the Dump Truck near the newly distanced pile
    if(truckGroupRef.current) {
        // Position it right where the dirt is landing
        truckGroupRef.current.position.set(pileCenterX + 1, 0, pileCenterZ + pileRadius + 2);
        truckGroupRef.current.rotation.y = -Math.PI / 4;
    }

    // Dynamic Camera Re-Centering (Look between hole and pile)
    const maxDim = Math.max(L_top + pileCenterX, W_top, d_m);
    cameraRef.current.position.set(maxDim * 0.9, maxDim * 0.6, maxDim * 1.2);
    controlsRef.current.target.set(pileCenterX / 3, -d_m/2, 0); // Focus slightly towards pile
    scene.fog.density = 0.02 / Math.max(1, maxDim/10);

    let warning = "";
    if (theoreticalBricks > 30000) warning = `Massive Scale! 3D Visualizer capped to prevent lagging. Math remains exact.`;
    setVisualWarning(warning);

    setResults({
      foundationL, foundationW, d_m, ws_m, horizontalRun, mult, 
      L_bot, W_bot, L_top, W_top, A_bot, A_mid, A_top,
      bankVol, looseVol, compactedVol, totalTrucks, costExcavation, costHauling, grandTotal
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 md:p-6 bg-[#020617] text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block">
      
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-amber-600/10 blur-[150px] rounded-full pointer-events-none print:hidden"></div>

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[380px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 text-lg">🚜</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">EarthWorks Pro</h2>
                  <p className="text-[9px] text-emerald-400 font-mono uppercase tracking-widest">Advanced Takeoff</p>
                </div>
            </div>
            <select name="currency" value={inputs.currency} onChange={handleInputChange} className="bg-slate-800/80 border border-slate-600/50 rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 text-emerald-400 font-bold transition-all cursor-pointer">
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
            </select>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            
            {/* Dimensions & Clearance */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Structure Base</h3>
                    <select name="unit" value={inputs.unit} onChange={handleInputChange} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-emerald-500 transition-all">
                        <option value="m">Meters</option>
                        <option value="ft">Feet</option>
                    </select>
                </div>
                <p className="text-[9px] text-slate-500 mb-2 italic">Actual Building Footprint</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length</label>
                      <input type="number" step="0.1" name="excL" value={inputs.excL} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Width</label>
                      <input type="number" step="0.1" name="excW" value={inputs.excW} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Depth</label>
                      <input type="number" step="0.1" name="excD" value={inputs.excD} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-white font-mono" />
                    </div>
                </div>
                <div className="pt-3 border-t border-slate-700/50">
                    <label className="flex justify-between items-center text-[10px] text-slate-300 uppercase mb-1">
                        <span>Working Space Clearance</span>
                        <span className="text-cyan-500 font-mono text-[9px]">{inputs.unit} per side</span>
                    </label>
                    <input type="number" step="0.5" name="workingSpace" value={inputs.workingSpace} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-cyan-400 font-bold transition-all" />
                </div>
            </div>

            {/* Soil Type & Slopes */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-amber-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-amber-400 transition-colors"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>Soil Dynamics</h3>
                    <select name="soilType" value={inputs.soilType} onChange={handleInputChange} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-amber-500 transition-all max-w-[100px] truncate">
                        {Object.entries(soilPresets).map(([key, data]) => (<option key={key} value={key}>{data.name}</option>))}
                    </select>
                </div>
                
                <div className="mb-3">
                    <label className="flex justify-between items-center text-[10px] text-slate-400 mb-1 uppercase">
                        <span>Safe Slope (Angle of Repose)</span>
                        <span className="text-rose-400 font-mono text-[9px]">{inputs.slopeAngle}° Degrees</span>
                    </label>
                    <input type="range" name="slopeAngle" min="15" max="90" step="5" value={inputs.slopeAngle} onChange={handleInputChange} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                    <div className="flex justify-between text-[8px] text-slate-500 mt-1 uppercase font-bold"><span>15° (Flat)</span><span>90° (Vertical)</span></div>
                    
                    {/* NEW OSHA SAFETY WARNING */}
                    {safetyWarning && (
                        <div className="mt-2 p-2 bg-rose-500/20 border border-rose-500/50 rounded-md text-[10px] text-rose-300 font-medium leading-snug animate-pulse">
                            {safetyWarning}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase text-amber-400/80">Swell (Loose)</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-amber-500">
                            <input type="number" name="swell" value={inputs.swell} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase text-indigo-400/80">Shrink (Fill)</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-indigo-500">
                            <input type="number" name="shrink" value={inputs.shrink} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Rates */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors group mb-2">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-blue-400 transition-colors"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>Operations & Cost</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Dump Truck Capacity</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <input type="number" name="truckCapacity" value={inputs.truckCapacity} onChange={handleInputChange} className="w-10 bg-transparent p-1 text-right outline-none text-white font-mono" />
                          <span className="text-slate-500 ml-1 text-[9px]">m³</span>
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Digging (per Bank m³)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-blue-400">{inputs.currency}</span>
                          <input type="number" name="excavationRate" value={inputs.excavationRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Haulage (per Truck)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-blue-400">{inputs.currency}</span>
                          <input type="number" name="haulageRate" value={inputs.haulageRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
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
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Trucks</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 leading-none">{results.totalTrucks} Trips</span>
                       </div>
                       <div className="w-px h-8 bg-slate-700"></div>
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Est. Cost</span>
                           <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                       </div>
                    </div>
                ) : mode === 'civil' ? (
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Financial Takeoff</h2>
                ) : mode === 'math' ? (
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Volume Calculations</h2>
                ) : null}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {(mode === 'civil' || mode === 'math') && (
                    <button onClick={handlePrint} className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
                    </button>
                )}

                <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
                    <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'normal' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
                    <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'math' ? 'bg-blue-500 text-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
                    <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'civil' ? 'bg-amber-500 text-slate-900 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'text-slate-400 hover:text-white'}`}>Report</button>
                </div>
            </div>
        </div>

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] group print:hidden`}>
            <div ref={mountRef} className="absolute inset-0 cursor-move"></div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Realistic</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}>Wireframe</button>
            </div>

            {visualWarning && (
                <div className="absolute bottom-20 right-6 bg-orange-500/20 backdrop-blur-md text-orange-200 border border-orange-500/30 text-[10px] px-3 py-1.5 rounded-full shadow-lg max-w-xs text-right">
                    {visualWarning}
                </div>
            )}
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-slate-200 pb-6 mb-8 print:border-black">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Frustum Calculations</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Advanced Geometry & Prismoidal Method (Base: Meters)</p>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                 {/* Step 1 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-cyan-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 1: Pit Dimensions & Clearances</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// The bottom of the pit includes the foundation PLUS working space on all sides.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Bottom Length (L_bot)</span> = Foundation L + (2 × Working Space)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">L_bot</span> = {results.foundationL.toFixed(3)} + (2 × {results.ws_m.toFixed(3)}) = <span className="font-bold text-slate-900">{results.L_bot.toFixed(3)} m</span></p>
                        
                        <p><span className="text-slate-400 print:text-black font-bold">Bottom Width (W_bot)</span> = Foundation W + (2 × Working Space)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">W_bot</span> = {results.foundationW.toFixed(3)} + (2 × {results.ws_m.toFixed(3)}) = <span className="font-bold text-slate-900">{results.W_bot.toFixed(3)} m</span></p>
                        <br/>
                        <p className="text-xs text-slate-500 italic print:text-black">// The top of the pit is wider due to the safe cut slope (Angle of Repose).</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Horizontal Run</span> = Depth / tan({inputs.slopeAngle}°) = <span className="font-bold text-slate-900">{results.horizontalRun.toFixed(3)} m</span> per side</p>
                        
                        <p><span className="text-slate-400 print:text-black font-bold">Top Length (L_top)</span> = L_bot + (2 × Horizontal Run) = <span className="font-bold text-slate-900">{results.L_top.toFixed(3)} m</span></p>
                        <p><span className="text-slate-400 print:text-black font-bold">Top Width (W_top)</span> = W_bot + (2 × Horizontal Run) = <span className="font-bold text-slate-900">{results.W_top.toFixed(3)} m</span></p>
                    </div>
                 </div>

                 {/* Step 2 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-emerald-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 2: Prismoidal Volume (Simpson's Rule)</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// A sloped pit is an inverted frustum. Standard length × width × depth is inaccurate here.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Bottom Area (A_bot)</span> = {results.L_bot.toFixed(3)} × {results.W_bot.toFixed(3)} = <span className="font-bold text-slate-900">{results.A_bot.toFixed(3)} m²</span></p>
                        <p><span className="text-slate-400 print:text-black font-bold">Top Area (A_top)</span> = {results.L_top.toFixed(3)} × {results.W_top.toFixed(3)} = <span className="font-bold text-slate-900">{results.A_top.toFixed(3)} m²</span></p>
                        <p><span className="text-slate-400 print:text-black font-bold">Mid Area (A_mid)</span> = Mean L × Mean W = <span className="font-bold text-slate-900">{results.A_mid.toFixed(3)} m²</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Prismoidal Formula:</span> V = (Depth / 6) × [ A_bot + 4(A_mid) + A_top ]</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Substitutions:</span> V = ({results.d_m.toFixed(2)} / 6) × [ {results.A_bot.toFixed(2)} + 4({results.A_mid.toFixed(2)}) + {results.A_top.toFixed(2)} ]</p>
                        <p className="text-emerald-700 print:text-black font-bold text-lg mt-2">Bank Volume = {results.bankVol.toFixed(3)} m³</p>
                    </div>
                 </div>

                 {/* Step 3 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-amber-600 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 3: Soil Dynamics (Swell / Shrink)</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// Swell determines the loose volume transported by trucks.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Loose Volume</span> = Bank Volume × (1 + {inputs.swell}%) = <span className="font-bold text-amber-600">{results.looseVol.toFixed(3)} m³</span></p>
                        <br/>
                        <p className="text-xs text-slate-500 italic print:text-black">// Shrink determines the compacted volume if reused as backfill.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Compacted Volume</span> = Bank Volume × (1 - {inputs.shrink}%) = <span className="font-bold text-indigo-600">{results.compactedVol.toFixed(3)} m³</span></p>
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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Excavation Takeoff</h1>
                        <p className="text-sm text-slate-500 mt-1 font-mono">Generated by CivisMetric Engine</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest print:text-black">Grand Total</p>
                        <p className="text-4xl font-black text-emerald-600 font-mono print:text-black">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:block">
                    <div className="print:mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Geometric Data</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Structure Footprint</td><td className="py-2 font-medium text-right">{inputs.excL}×{inputs.excW} {inputs.unit}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Working Space Added</td><td className="py-2 font-medium text-right text-emerald-600 print:text-black">+ {inputs.workingSpace} {inputs.unit} per side</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Cut Slope (Angle)</td><td className="py-2 font-medium text-right text-rose-500 print:text-black">{inputs.slopeAngle}° Degrees</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Top Surface Cut Area</td><td className="py-2 font-medium text-right">{results.A_top.toFixed(2)} m²</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Volumetrics & Logistics</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 font-bold text-slate-800 print:text-black">Bank Volume (Raw Space)</td><td className="py-2 font-black text-right text-slate-900">{results.bankVol.toFixed(2)} m³</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Loose Volume (+{inputs.swell}% Swell)</td><td className="py-2 font-medium text-right text-amber-600 print:text-black">{results.looseVol.toFixed(2)} m³</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Compacted Vol (-{inputs.shrink}% Shrink)</td><td className="py-2 font-medium text-right text-indigo-600 print:text-black">{results.compactedVol.toFixed(2)} m³</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Total Truck Trips Req.</td><td className="py-2 font-bold text-right text-blue-600 print:text-black">{results.totalTrucks} Trips</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Itemized Estimate</h3>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 print:border-black print:shadow-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider print:bg-transparent print:text-black print:border-b print:border-black">
                            <tr>
                                <th className="p-4 font-semibold">Activity</th>
                                <th className="p-4 font-semibold">Quantity</th>
                                <th className="p-4 font-semibold">Rate</th>
                                <th className="p-4 font-semibold text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 print:divide-slate-300">
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Excavation (Digging)</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Includes sloped cuts and working space</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.bankVol.toFixed(2)} m³</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.excavationRate}/m³</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costExcavation.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Haulage (Trucking / Disposal)</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Based on loose volume ({results.looseVol.toFixed(1)}m³) @ {inputs.truckCapacity}m³/truck</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.totalTrucks} Trips</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.haulageRate}/Trip</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costHauling.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
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