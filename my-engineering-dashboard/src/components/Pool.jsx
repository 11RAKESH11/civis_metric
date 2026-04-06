import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048 };
const ft3ToGallons = 7.48052;
const m3ToLiters = 1000;

// Authentic Real-World Material Colors
const COLORS = {
    DIRT: 0x3f2e20,
    CONCRETE: 0x888c8d,
    PLASTER_WHITE: 0xe2e8f0,
    PLASTER_BLUE: 0x93c5fd,
    PEBBLE_TEC: 0x7dd3fc,
    WATER: 0x00aaff,
    DECKING: 0xd6d3d1,
    COPING: 0xa8a29e,
    REBAR: 0x475569
};

export default function PoolDesigner({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('ft');
  
  const [inputs, setInputs] = useState({
    shape: 'rectangular', 
    length: 30,          
    width: 15,           
    diameter: 20,        
    depthShallow: 3.5,
    depthDeep: 6.5,
    finishType: 'plaster_white', // plaster_white, plaster_blue, pebble
    deckWidth: 4,
    // Add-ons
    hasHeater: true,
    hasLED: true,
    hasCover: false,
    // Rates
    excavationRate: 45, // per cubic yd or m3
    concreteRate: 250, 
    finishRate: 6.50,   // per sq ft or sq m
    copingRate: 25,     // per linear ft or m
    laborRate: 85,
    currency: '$'
  });

  const [mode, setMode] = useState('normal'); 
  const [results, setResults] = useState(null);
  
  // --- 3D Refs ---
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const resizeObserverRef = useRef(null);
  
  const sceneObjectsRef = useRef({});
  const animStateRef = useRef({ active: false, startTime: 0, phase: 0 });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let parsedValue = value;
    
    if (type === 'checkbox') parsedValue = checked;
    else if (['currency', 'shape', 'finishType', 'unit'].includes(name)) parsedValue = value;
    else parsedValue = Math.max(0.1, parseFloat(value) || 0);

    setInputs(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handlePrint = () => window.print();

  // --- Initialize Three.js Scene ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0f172a, 0.015);
    sceneRef.current = scene;

    const container = mountRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 2000);
    camera.position.set(25, 20, 30);
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
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Allow looking slightly below ground
    controls.target.set(0, -2, 0);
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    
    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.5); 
    sunLight.position.set(20, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    scene.add(sunLight);

    const poolLight = new THREE.PointLight(0x00f0ff, 0, 30); // Intensity 0 initially
    poolLight.position.set(0, -2, 0);
    scene.add(poolLight);
    sceneObjectsRef.current.poolLight = poolLight;

    const gridHelper = new THREE.GridHelper(150, 150, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = 0.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.15;
    scene.add(gridHelper);

    let animationFrameId;
    
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // --- Construction Simulation Logic ---
      if (animStateRef.current.active && sceneObjectsRef.current.water) {
          const elapsed = (Date.now() - animStateRef.current.startTime) / 1000;
          const { water, shell, finish } = sceneObjectsRef.current;
          
          // Phase 1: Excavation (0s - 1.5s)
          if (elapsed < 1.5) {
              shell.visible = true;
              shell.material.color.setHex(COLORS.DIRT);
              shell.material.wireframe = true;
              finish.visible = false;
              water.visible = false;
          } 
          // Phase 2: Shotcrete Shell (1.5s - 3.0s)
          else if (elapsed < 3.0) {
              shell.material.wireframe = false;
              shell.material.color.setHex(COLORS.CONCRETE);
          } 
          // Phase 3: Plaster/Finish (3.0s - 4.5s)
          else if (elapsed < 4.5) {
              finish.visible = true;
              finish.scale.setScalar(Math.min(1, (elapsed - 3.0) / 0.5));
          } 
          // Phase 4: Filling Water (4.5s - 7.0s)
          else if (elapsed < 7.0) {
              finish.scale.setScalar(1);
              water.visible = true;
              const fillProgress = (elapsed - 4.5) / 2.5;
              water.scale.y = Math.max(0.001, fillProgress);
              water.position.y = sceneObjectsRef.current.waterStartY + (sceneObjectsRef.current.waterHeight * fillProgress / 2);
          } 
          // Complete
          else {
              water.scale.y = 1;
              water.position.y = sceneObjectsRef.current.waterFinalY;
              animStateRef.current.active = false;
          }
      }

      // Gentle water ripple effect
      if (sceneObjectsRef.current.water && !animStateRef.current.active && sceneObjectsRef.current.water.visible) {
          const time = Date.now() * 0.001;
          sceneObjectsRef.current.water.position.y = sceneObjectsRef.current.waterFinalY + Math.sin(time * 2) * 0.02;
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
    resizeObserverRef.current = resizeObserver;
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []); 

  const triggerSimulation = () => {
      animStateRef.current = { active: true, startTime: Date.now() };
  };

  // --- Core Calculation & 3D Rebuild ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 300);
    return () => clearTimeout(handler);
  }, [inputs]);

  const calculateAndRender = () => {
    const { shape, length, width, diameter, depthShallow, depthDeep, finishType, deckWidth, hasHeater, hasLED, hasCover, excavationRate, concreteRate, finishRate, copingRate, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    // --- MATH & TAKEOFF CALCULATIONS ---
    const avgDepth = (depthShallow + depthDeep) / 2;
    let surfaceArea = 0;
    let perimeter = 0;
    let volume = 0; // exact water volume

    if (shape === 'rectangular') {
        perimeter = 2 * (length + width);
        // Sloped surface area approx: Floor + 2 Side walls + Front + Back
        const floorLength = Math.sqrt(Math.pow(length, 2) + Math.pow(depthDeep - depthShallow, 2));
        const floorArea = floorLength * width;
        const sideArea = 2 * (length * avgDepth);
        const endsArea = (width * depthShallow) + (width * depthDeep);
        
        surfaceArea = floorArea + sideArea + endsArea;
        volume = length * width * avgDepth;
    } else {
        perimeter = Math.PI * diameter;
        const radius = diameter / 2;
        const floorRadius = Math.sqrt(Math.pow(radius, 2) + Math.pow((depthDeep - depthShallow)/2, 2));
        const floorArea = Math.PI * Math.pow(floorRadius, 2);
        const sideArea = perimeter * avgDepth;
        
        surfaceArea = floorArea + sideArea;
        volume = Math.PI * Math.pow(radius, 2) * avgDepth;
    }

    const deckArea = shape === 'rectangular' 
        ? ((length + 2*deckWidth) * (width + 2*deckWidth)) - (length * width)
        : (Math.PI * Math.pow((diameter/2) + deckWidth, 2)) - (Math.PI * Math.pow(diameter/2, 2));

    // Costs
    const overdigVolume = volume * 1.25; // 25% extra for working space
    const concreteVolume = surfaceArea * 0.66; // approx 8 inches thick structure
    
    // Unit conversion for pricing if needed (assuming rates match selected unit system)
    let billableExcavation = overdigVolume;
    let billableConcrete = concreteVolume;
    if (unitSystem === 'ft') {
        billableExcavation = overdigVolume / 27; // convert cubic ft to cubic yds
        billableConcrete = concreteVolume / 27; 
    }

    const waterCapacity = unitSystem === 'ft' ? volume * ft3ToGallons : volume * m3ToLiters;

    const costExcavation = billableExcavation * excavationRate;
    const costConcrete = billableConcrete * concreteRate;
    const costFinish = surfaceArea * finishRate;
    const costCoping = perimeter * copingRate;
    const costDeck = deckArea * (finishRate * 1.5); // Decking approx 1.5x finish rate
    
    // Equip & Addons
    const baseEquipment = 4500; // Pump, filter, basic plumbing
    let costAddons = baseEquipment;
    if (hasHeater) costAddons += 3500;
    if (hasLED) costAddons += 1200;
    if (hasCover) costAddons += shape === 'rectangular' ? 8000 : 2500; // Auto cover vs manual

    const laborHours = surfaceArea * 0.5 + 40; // Base 40 hours + size scaling
    const costLabor = laborHours * laborRate;

    const grandTotal = costExcavation + costConcrete + costFinish + costCoping + costDeck + costAddons + costLabor;

    // --- 3D SCENE REBUILD ---
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'poolSystem') toRemove.push(c); });
    toRemove.forEach(c => {
        scene.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
    });

    const poolSystem = new THREE.Object3D();
    poolSystem.name = 'poolSystem';

    // Scale down for Three.js view (1 unit = 1m approx visually to keep camera nice)
    const scale = unitSystem === 'ft' ? 0.3048 : 1; 
    const sLen = length * scale;
    const sWid = width * scale;
    const sDia = diameter * scale;
    const sAvgD = avgDepth * scale;
    const sDeck = deckWidth * scale;

    // Materials
    let finishColor = COLORS.PLASTER_WHITE;
    if (finishType === 'plaster_blue') finishColor = COLORS.PLASTER_BLUE;
    if (finishType === 'pebble') finishColor = COLORS.PEBBLE_TEC;

    const shellMat = new THREE.MeshStandardMaterial({ color: COLORS.CONCRETE, roughness: 0.9, side: THREE.BackSide });
    const finishMat = new THREE.MeshStandardMaterial({ color: finishColor, roughness: 0.6, side: THREE.BackSide });
    const deckMat = new THREE.MeshStandardMaterial({ color: COLORS.DECKING, roughness: 1 });
    const copingMat = new THREE.MeshStandardMaterial({ color: COLORS.COPING, roughness: 0.8 });
    
    // Premium Water Material
    const waterMat = new THREE.MeshPhysicalMaterial({
        color: COLORS.WATER,
        transmission: 0.85,
        opacity: 1,
        metalness: 0.1,
        roughness: 0.1,
        ior: 1.33,
        thickness: sAvgD,
        side: THREE.FrontSide
    });

    let shellGeo, finishGeo, waterGeo, copingGeo, deckGeo;

    if (shape === 'rectangular') {
        shellGeo = new THREE.BoxGeometry(sLen, sAvgD, sWid);
        finishGeo = new THREE.BoxGeometry(sLen - 0.1, sAvgD - 0.1, sWid - 0.1);
        waterGeo = new THREE.BoxGeometry(sLen - 0.1, sAvgD - 0.3, sWid - 0.1);
        
        // Coping (Hollow Box)
        const outerShape = new THREE.Shape();
        outerShape.moveTo(-sLen/2 - 0.3, -sWid/2 - 0.3);
        outerShape.lineTo(sLen/2 + 0.3, -sWid/2 - 0.3);
        outerShape.lineTo(sLen/2 + 0.3, sWid/2 + 0.3);
        outerShape.lineTo(-sLen/2 - 0.3, sWid/2 + 0.3);
        outerShape.lineTo(-sLen/2 - 0.3, -sWid/2 - 0.3);
        
        const innerHole = new THREE.Path();
        innerHole.moveTo(-sLen/2, -sWid/2);
        innerHole.lineTo(sLen/2, -sWid/2);
        innerHole.lineTo(sLen/2, sWid/2);
        innerHole.lineTo(-sLen/2, sWid/2);
        innerHole.lineTo(-sLen/2, -sWid/2);
        outerShape.holes.push(innerHole);

        copingGeo = new THREE.ExtrudeGeometry(outerShape, { depth: 0.1, bevelEnabled: false });
        copingGeo.rotateX(Math.PI / 2);

        // Deck
        const deckShape = new THREE.Shape();
        deckShape.moveTo(-sLen/2 - sDeck, -sWid/2 - sDeck);
        deckShape.lineTo(sLen/2 + sDeck, -sWid/2 - sDeck);
        deckShape.lineTo(sLen/2 + sDeck, sWid/2 + sDeck);
        deckShape.lineTo(-sLen/2 - sDeck, sWid/2 + sDeck);
        
        const deckHole = new THREE.Path();
        deckHole.moveTo(-sLen/2 - 0.3, -sWid/2 - 0.3);
        deckHole.lineTo(sLen/2 + 0.3, -sWid/2 - 0.3);
        deckHole.lineTo(sLen/2 + 0.3, sWid/2 + 0.3);
        deckHole.lineTo(-sLen/2 - 0.3, sWid/2 + 0.3);
        deckShape.holes.push(deckHole);

        deckGeo = new THREE.ExtrudeGeometry(deckShape, { depth: 0.05, bevelEnabled: false });
        deckGeo.rotateX(Math.PI / 2);

    } else {
        shellGeo = new THREE.CylinderGeometry(sDia/2, sDia/2, sAvgD, 64);
        finishGeo = new THREE.CylinderGeometry((sDia/2)-0.05, (sDia/2)-0.05, sAvgD-0.05, 64);
        waterGeo = new THREE.CylinderGeometry((sDia/2)-0.05, (sDia/2)-0.05, sAvgD-0.2, 64);

        const outerShape = new THREE.Shape();
        outerShape.absarc(0, 0, (sDia/2) + 0.3, 0, Math.PI * 2, false);
        const innerHole = new THREE.Path();
        innerHole.absarc(0, 0, sDia/2, 0, Math.PI * 2, true);
        outerShape.holes.push(innerHole);
        copingGeo = new THREE.ExtrudeGeometry(outerShape, { depth: 0.1, bevelEnabled: false });
        copingGeo.rotateX(Math.PI / 2);

        const deckShape = new THREE.Shape();
        deckShape.absarc(0, 0, (sDia/2) + sDeck, 0, Math.PI * 2, false);
        const deckHole = new THREE.Path();
        deckHole.absarc(0, 0, (sDia/2) + 0.3, 0, Math.PI * 2, true);
        deckShape.holes.push(deckHole);
        deckGeo = new THREE.ExtrudeGeometry(deckShape, { depth: 0.05, bevelEnabled: false });
        deckGeo.rotateX(Math.PI / 2);
    }

    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    shellMesh.position.y = -(sAvgD / 2);
    
    const finishMesh = new THREE.Mesh(finishGeo, finishMat);
    finishMesh.position.y = -(sAvgD / 2);

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    const waterFinalY = -(sAvgD / 2) + 0.1; 
    waterMesh.position.y = waterFinalY;
    
    const copingMesh = new THREE.Mesh(copingGeo, copingMat);
    copingMesh.position.y = 0.1;
    copingMesh.receiveShadow = true;
    copingMesh.castShadow = true;

    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.y = 0.05;
    deckMesh.receiveShadow = true;

    // Interactive LED Lighting
    if (sceneObjectsRef.current.poolLight) {
        sceneObjectsRef.current.poolLight.intensity = hasLED ? 80 : 0;
        sceneObjectsRef.current.poolLight.position.set(0, -sAvgD / 2, 0);
    }

    poolSystem.add(shellMesh);
    poolSystem.add(finishMesh);
    poolSystem.add(waterMesh);
    poolSystem.add(copingMesh);
    poolSystem.add(deckMesh);
    scene.add(poolSystem);

    // Save refs for animation
    sceneObjectsRef.current = {
        ...sceneObjectsRef.current,
        shell: shellMesh,
        finish: finishMesh,
        water: waterMesh,
        waterFinalY: waterFinalY,
        waterStartY: -sAvgD + 0.1,
        waterHeight: sAvgD - 0.2
    };

    // Adjust Camera
    const maxDim = Math.max(shape === 'rectangular' ? sLen : sDia, sWid || 0, sDeck * 2);
    cameraRef.current.position.set(maxDim * 0.8, maxDim * 0.6, maxDim * 0.9);
    controlsRef.current.target.set(0, -sAvgD/4, 0);

    setResults({
      surfaceArea, perimeter, volume, waterCapacity, deckArea,
      billableExcavation, billableConcrete,
      costExcavation, costConcrete, costFinish, costCoping, costDeck, costAddons, costLabor, grandTotal,
      laborHours
    });
  };

  return (
    <div className={`flex flex-col xl:flex-row gap-6 p-4 md:p-6 text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block ${isProjectMode ? 'bg-transparent' : 'bg-[#020617]'}`}>
      
      {!isProjectMode && (
        <>
          <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-sky-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none print:hidden"></div>
        </>
      )}

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[420px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30 text-xl">🌊</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">AquaArchitect</h2>
                  <p className="text-[9px] text-sky-400 font-mono uppercase tracking-widest">Pool & Hardscape Engine</p>
                </div>
            </div>
            <select name="unit" value={inputs.unit} onChange={handleInputChange} className="bg-slate-800/80 border border-slate-600/50 rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-sky-500 text-sky-400 font-bold transition-all cursor-pointer">
                <option value="ft">Imperial (ft)</option>
                <option value="m">Metric (m)</option>
            </select>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            
            {/* GEOMETRY */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-sky-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-sky-400 transition-colors"><span className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9]"></span>Basin Geometry</h3>
                
                <div className="flex p-1 bg-slate-900/80 rounded-lg border border-slate-700/50 mb-3">
                    <button onClick={() => setInputs(p => ({...p, shape: 'rectangular'}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${inputs.shape === 'rectangular' ? 'bg-sky-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Rectangular</button>
                    <button onClick={() => setInputs(p => ({...p, shape: 'circular'}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${inputs.shape === 'circular' ? 'bg-sky-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Circular</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    {inputs.shape === 'rectangular' ? (
                        <>
                            <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length ({inputs.unit})</label>
                                <input type="number" step="0.5" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sky-500 outline-none text-white font-mono" />
                            </div>
                            <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Width ({inputs.unit})</label>
                                <input type="number" step="0.5" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sky-500 outline-none text-white font-mono" />
                            </div>
                        </>
                    ) : (
                        <div className="col-span-2">
                            <label className="block text-[9px] text-slate-400 mb-1 uppercase">Diameter ({inputs.unit})</label>
                            <input type="number" step="0.5" name="diameter" value={inputs.diameter} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sky-500 outline-none text-white font-mono" />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Shallow Depth</label>
                        <input type="number" step="0.5" name="depthShallow" value={inputs.depthShallow} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sky-500 outline-none text-sky-400 font-bold transition-all" />
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Deep End</label>
                        <input type="number" step="0.5" name="depthDeep" value={inputs.depthDeep} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-blue-400 font-bold transition-all" />
                    </div>
                </div>
            </div>

            {/* MATERIALS */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Finishes & Hardscape</h3>
                
                <div className="mb-3">
                    <label className="block text-[9px] text-slate-400 mb-1 uppercase">Interior Finish</label>
                    <select name="finishType" value={inputs.finishType} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none text-white">
                        <option value="plaster_white">Standard White Plaster</option>
                        <option value="plaster_blue">Tahitian Blue Plaster</option>
                        <option value="pebble">Premium PebbleTec</option>
                    </select>
                </div>

                <div className="pt-3 border-t border-slate-700/50">
                    <label className="flex justify-between items-center text-[10px] text-slate-400 mb-1 uppercase">
                        <span>Surrounding Deck Width</span>
                        <span className="text-emerald-400 font-mono text-[9px]">{inputs.deckWidth} {inputs.unit}</span>
                    </label>
                    <input type="range" name="deckWidth" min="0" max="15" step="0.5" value={inputs.deckWidth} onChange={handleInputChange} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>
            </div>

            {/* ADD-ONS */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-purple-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-purple-400 transition-colors"><span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></span>Equipment & Features</h3>
                
                <div className="space-y-2">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-purple-500/50 transition-all">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔥</span>
                            <span className="text-xs text-white font-medium">Gas/Electric Heater</span>
                        </div>
                        <input type="checkbox" name="hasHeater" checked={inputs.hasHeater} onChange={handleInputChange} className="w-4 h-4 accent-purple-500 cursor-pointer" />
                    </label>
                    
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-purple-500/50 transition-all">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💡</span>
                            <span className="text-xs text-white font-medium">Underwater LED Array</span>
                        </div>
                        <input type="checkbox" name="hasLED" checked={inputs.hasLED} onChange={handleInputChange} className="w-4 h-4 accent-purple-500 cursor-pointer" />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 cursor-pointer hover:border-purple-500/50 transition-all">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🛡️</span>
                            <span className="text-xs text-white font-medium">Safety Cover (Auto/Mesh)</span>
                        </div>
                        <input type="checkbox" name="hasCover" checked={inputs.hasCover} onChange={handleInputChange} className="w-4 h-4 accent-purple-500 cursor-pointer" />
                    </label>
                </div>
            </div>

            {/* ECONOMICS */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors group mb-2">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-orange-400 transition-colors"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>Local Rates</h3>
                    <select name="currency" value={inputs.currency} onChange={handleInputChange} className="bg-transparent border-none text-[10px] outline-none text-orange-400 cursor-pointer font-bold">
                        <option value="$">USD ($)</option>
                        <option value="₹">INR (₹)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                    </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Excavation (/yd³)</span>
                      <div className="flex items-center">
                          <span className="text-slate-500 text-xs mr-1">{inputs.currency}</span>
                          <input type="number" name="excavationRate" value={inputs.excavationRate} onChange={handleInputChange} className="w-full bg-transparent text-xs outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex flex-col gap-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Shotcrete (/yd³)</span>
                      <div className="flex items-center">
                          <span className="text-slate-500 text-xs mr-1">{inputs.currency}</span>
                          <input type="number" name="concreteRate" value={inputs.concreteRate} onChange={handleInputChange} className="w-full bg-transparent text-xs outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex flex-col gap-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Finish (/sq ft)</span>
                      <div className="flex items-center">
                          <span className="text-slate-500 text-xs mr-1">{inputs.currency}</span>
                          <input type="number" name="finishRate" value={inputs.finishRate} onChange={handleInputChange} className="w-full bg-transparent text-xs outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex flex-col gap-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Labor (/hr)</span>
                      <div className="flex items-center">
                          <span className="text-slate-500 text-xs mr-1">{inputs.currency}</span>
                          <input type="number" name="laborRate" value={inputs.laborRate} onChange={handleInputChange} className="w-full bg-transparent text-xs outline-none text-white font-mono" />
                      </div>
                  </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- Right Panel: Viewer & Report --- */}
      <div className="w-full xl:w-[calc(100%-424px)] bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden relative z-10 xl:h-[88vh] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        
        {/* Top Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-30 shrink-0 print:hidden">
            <div className="flex-1 h-10 flex items-center">
                {results && mode === 'normal' ? (
                    <div className="flex items-center gap-4 animate-fade-in">
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Capacity</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 leading-none">
                             {results.waterCapacity.toLocaleString('en-US', {maximumFractionDigits: 0})} {inputs.unit === 'ft' ? 'Gal' : 'L'}
                           </span>
                       </div>
                       <div className="w-px h-8 bg-slate-700"></div>
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Est. Total</span>
                           <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                       </div>
                    </div>
                ) : mode === 'civil' ? (
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Financial Takeoff</h2>
                ) : mode === 'math' ? (
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Fluid & Geometry Math</h2>
                ) : null}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {(mode === 'civil' || mode === 'math') && (
                    <button onClick={handlePrint} className="bg-slate-700/50 hover:bg-slate-600 border border-slate-500/50 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
                    </button>
                )}

                <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
                    <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'normal' ? 'bg-sky-500 text-slate-900 shadow-[0_0_10px_rgba(14,165,233,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
                    <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'math' ? 'bg-indigo-500 text-slate-900 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
                    <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'civil' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>Takeoff</button>
                </div>
            </div>
        </div>

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] group print:hidden`}>
            <div ref={mountRef} className="absolute inset-0"></div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={triggerSimulation} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all bg-sky-500/20 text-sky-400 border border-sky-500/50 hover:bg-sky-500 hover:text-slate-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                    Simulate Build
                </button>
            </div>
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-slate-200 pb-6 mb-8 print:border-black">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Geometry & Fluid Dynamics</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Detailed Mathematical Proof</p>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                 {/* Step 1 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-sky-700 border-b border-slate-100 pb-3 mb-4 print:text-black">1. Sloped Volume & Water Capacity</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Average Depth (D_avg)</span> = (Shallow + Deep) / 2</p>
                        <p>D_avg = ({inputs.depthShallow} + {inputs.depthDeep}) / 2 = <span className="font-bold text-slate-900">{((inputs.depthShallow + inputs.depthDeep)/2).toFixed(2)} {inputs.unit}</span></p>
                        <br/>
                        {inputs.shape === 'rectangular' ? (
                          <>
                            <p><span className="text-slate-400 print:text-black font-bold">Volume Formula</span> = Length × Width × D_avg</p>
                            <p>Volume = {inputs.length} × {inputs.width} × {((inputs.depthShallow + inputs.depthDeep)/2).toFixed(2)} = <span className="font-bold text-slate-900">{results.volume.toFixed(2)} cubic {inputs.unit}</span></p>
                          </>
                        ) : (
                          <>
                            <p><span className="text-slate-400 print:text-black font-bold">Volume Formula</span> = π × (Diameter / 2)² × D_avg</p>
                            <p>Volume = π × ({inputs.diameter/2})² × {((inputs.depthShallow + inputs.depthDeep)/2).toFixed(2)} = <span className="font-bold text-slate-900">{results.volume.toFixed(2)} cubic {inputs.unit}</span></p>
                          </>
                        )}
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Liquid Capacity Conversion</span> ({unitSystem === 'ft' ? '1 ft³ = 7.48 Gallons' : '1 m³ = 1000 Liters'})</p>
                        <p className="text-sky-700 print:text-black font-bold text-base mt-2">Total Capacity = {results.waterCapacity.toLocaleString('en-US', {maximumFractionDigits: 0})} {unitSystem === 'ft' ? 'Gallons' : 'Liters'}</p>
                    </div>
                 </div>

                 {/* Step 2 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-emerald-700 border-b border-slate-100 pb-3 mb-4 print:text-black">2. Internal Surface Area (Finish/Plaster)</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="italic text-slate-500 mb-2">Note: Calculates sloped floor hypotenuse for accurate finish area.</p>
                        {inputs.shape === 'rectangular' ? (
                            <>
                                <p><span className="text-slate-400 print:text-black font-bold">Floor Length (Hypotenuse)</span> = √[Length² + (Deep - Shallow)²]</p>
                                <p><span className="text-slate-400 print:text-black font-bold">Side Walls Area</span> = 2 × (Length × D_avg)</p>
                                <p><span className="text-slate-400 print:text-black font-bold">End Walls Area</span> = (Width × Shallow) + (Width × Deep)</p>
                            </>
                        ) : (
                            <>
                                <p><span className="text-slate-400 print:text-black font-bold">Floor Radius (Hypotenuse)</span> = √[Radius² + ((Deep - Shallow)/2)²]</p>
                                <p><span className="text-slate-400 print:text-black font-bold">Wall Area</span> = Perimeter × D_avg</p>
                            </>
                        )}
                        <p className="text-emerald-700 print:text-black font-bold text-base mt-2">Total Internal Surface = {results.surfaceArea.toFixed(2)} sq {inputs.unit}</p>
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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Architectural Takeoff</h1>
                        <p className="text-sm text-slate-500 mt-1 font-mono">Generated by AquaArchitect Engine</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest print:text-black">Estimated Project Cost</p>
                        <p className="text-4xl font-black text-emerald-600 font-mono print:text-black">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:block">
                    <div className="print:mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Pool Specifications</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Geometry Profile</td><td className="py-2 font-medium text-right capitalize">{inputs.shape}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300">
                                  <td className="py-2 text-slate-500 print:text-black">Footprint</td>
                                  <td className="py-2 font-medium text-right">
                                    {inputs.shape === 'rectangular' ? `${inputs.length}L × ${inputs.width}W` : `${inputs.diameter} Diameter`} {inputs.unit}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Depth Profile</td><td className="py-2 font-medium text-right">{inputs.depthShallow}{inputs.unit} (Shallow) to {inputs.depthDeep}{inputs.unit} (Deep)</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Water Capacity</td><td className="py-2 font-bold text-sky-600 text-right print:text-black">{results.waterCapacity.toLocaleString('en-US', {maximumFractionDigits: 0})} {unitSystem === 'ft' ? 'Gal' : 'Liters'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Material Metrics</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Excavation Cut (+25%)</td><td className="py-2 font-medium text-right">{results.billableExcavation.toFixed(1)} {unitSystem === 'ft' ? 'cu yd' : 'm³'}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Shotcrete/Gunite</td><td className="py-2 font-medium text-right">{results.billableConcrete.toFixed(1)} {unitSystem === 'ft' ? 'cu yd' : 'm³'}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Internal Finish Area</td><td className="py-2 font-medium text-right">{results.surfaceArea.toFixed(1)} sq {inputs.unit}</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Coping Perimeter</td><td className="py-2 font-medium text-right">{results.perimeter.toFixed(1)} linear {inputs.unit}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Itemized Bill of Quantities (BoQ)</h3>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 print:border-black print:shadow-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider print:bg-transparent print:text-black print:border-b print:border-black">
                            <tr>
                                <th className="p-4 font-semibold">Phase / Description</th>
                                <th className="p-4 font-semibold">Quantity</th>
                                <th className="p-4 font-semibold">Unit Rate</th>
                                <th className="p-4 font-semibold text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 print:divide-slate-300">
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">1. Earthworks & Excavation</p><p className="text-xs text-slate-500">Includes haul-off and overdig allowance</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.billableExcavation.toFixed(1)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.excavationRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costExcavation.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">2. Structural Shell</p><p className="text-xs text-slate-500">Pneumatically applied concrete (Shotcrete)</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.billableConcrete.toFixed(1)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.concreteRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costConcrete.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">3. Interior Finish</p><p className="text-xs text-slate-500 capitalize">{inputs.finishType.replace('_', ' ')}</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.surfaceArea.toFixed(0)} sq {inputs.unit}</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.finishRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costFinish.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">4. Hardscape & Decking</p><p className="text-xs text-slate-500">Coping and {inputs.deckWidth}{inputs.unit} perimeter deck</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">Lump Sum</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">-</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{(results.costCoping + results.costDeck).toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">5. Plumbing, Equip & Electrical</p><p className="text-xs text-slate-500">Pumps, Filters {inputs.hasHeater ? ', Heater' : ''} {inputs.hasLED ? ', LEDs' : ''}</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">1 System</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">-</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costAddons.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                            </tr>
                            <tr className="bg-slate-50/50 print:bg-transparent">
                                <td className="p-4"><p className="font-bold text-slate-800">6. Labor & Logistics</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">~{results.laborHours.toFixed(0)} hrs</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.laborRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costLabor.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
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
                
                <p className="text-xs text-slate-400 text-center italic print:hidden">* Estimates are for preliminary architectural planning. Site accessibility, permitting, and soil conditions (e.g., rock hit) may significantly alter final contractor bids.</p>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}