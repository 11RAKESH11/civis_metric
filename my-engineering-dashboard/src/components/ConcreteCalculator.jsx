import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'in': 0.0254 };
const m3ToYd3 = 1.30795;
const yd3ToFt3 = 27;

// Standard premixed concrete bag yields (in cubic feet)
const BAG_YIELDS = {
    '80lb': 0.60,
    '60lb': 0.45,
    '40lb': 0.30
};

// Authentic Real-World Material Colors
const COLORS = {
    DRY_CONCRETE: 0x9ca3af,
    WET_CONCRETE: 0x6b7280,
    FORMWORK: 0x92400e, 
    BASE_DIRT: 0x3f2e20,
    BLUEPRINT_STRUCT: 0x0ea5e9,
    BLUEPRINT_FORM: 0xf59e0b
};

export default function ConcreteCalculator({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('ft'); // 'ft' or 'm'
  
  const [inputs, setInputs] = useState({
    type: 'slab', // slab, wall, hole
    length: 10,          
    width: 10,           
    depth: 4, // usually inches in US, cm in metric
    depthUnit: 'in', // 'in' or 'cm'
    diameter: 12, // for holes/sonotubes
    count: 1,
    wastage: 10,   
    readyMixPrice: 150, // per yd3 or m3
    bag80Price: 5.50,
    laborRate: 65,
    currency: '$'
  });

  const [mode, setMode] = useState('normal'); 
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);
  
  // --- 3D Refs ---
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const resizeObserverRef = useRef(null);
  
  const sceneObjectsRef = useRef({ elements: [] });
  const animStateRef = useRef({ active: false, startTime: 0 });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = ['currency', 'type', 'depthUnit'].includes(name) ? value : parseFloat(value) || 0;
    
    if (typeof parsedValue === 'number' && name !== 'type') parsedValue = Math.max(0, parsedValue);
    if (name === 'count') parsedValue = Math.max(1, Math.floor(parsedValue));
    
    setInputs(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleUnitSystemChange = (e) => {
      const newSys = e.target.value;
      setUnitSystem(newSys);
      setInputs(prev => ({
          ...prev,
          depthUnit: newSys === 'ft' ? 'in' : 'cm'
      }));
  }

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

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 2000);
    camera.position.set(15, 10, 15);
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
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go too far below ground
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5); 
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xa5f3fc, 0.7); 
    rimLight.position.set(-15, -5, -15);
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

      if (animStateRef.current.active && sceneObjectsRef.current.elements.length > 0) {
          const elapsed = (Date.now() - animStateRef.current.startTime) / 1000;

          sceneObjectsRef.current.elements.forEach(({ formwork, concrete }) => {
              if (elapsed < 1.0) {
                  formwork.visible = true;
                  concrete.visible = false;
                  formwork.scale.y = Math.max(0.001, elapsed / 1.0);
              } 
              else if (elapsed < 3.0) {
                  formwork.scale.y = 1;
                  concrete.visible = true;
                  const progress = (elapsed - 1.0) / 2.0;
                  concrete.scale.y = Math.max(0.001, progress);
                  if (visualTheme === 'realistic') concrete.material.color.setHex(COLORS.WET_CONCRETE);
              } 
              else if (elapsed < 4.5) {
                  concrete.scale.y = 1;
                  if (visualTheme === 'realistic') {
                      const cureProgress = (elapsed - 3.0) / 1.5;
                      const wet = new THREE.Color(COLORS.WET_CONCRETE);
                      const dry = new THREE.Color(COLORS.DRY_CONCRETE);
                      concrete.material.color.copy(wet.lerp(dry, cureProgress));
                  }
              } 
              else {
                  concrete.scale.y = 1;
                  formwork.scale.y = 1;
                  animStateRef.current.active = false;
              }
          });
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
  }, [visualTheme]); 

  const triggerSimulation = () => {
      animStateRef.current = { active: true, startTime: Date.now() };
  };

  // --- Core Calculation & 3D Rebuild ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 300);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, visualTheme]);

  const calculateAndRender = () => {
    const { type, length, width, depth, depthUnit, diameter, count, wastage, readyMixPrice, bag80Price, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    // Convert depth to main unit system (ft or m)
    // If unit is ft, depth is usually inches. If m, depth is usually cm.
    let depthInMainUnit = 0;
    if (unitSystem === 'ft' && depthUnit === 'in') depthInMainUnit = depth / 12;
    else if (unitSystem === 'm' && depthUnit === 'cm') depthInMainUnit = depth / 100;
    else depthInMainUnit = depth; // Fallback

    let volPerUnitM3 = 0;
    let safeLen = Math.max(0.1, length * unitToMeter[unitSystem]);
    let safeWid = Math.max(0.1, width * unitToMeter[unitSystem]);
    let safeDepM = Math.max(0.01, depthInMainUnit * unitToMeter[unitSystem]);
    let safeDia = Math.max(0.1, diameter * unitToMeter[unitSystem]);

    if (type === 'slab' || type === 'wall') {
        volPerUnitM3 = safeLen * safeWid * safeDepM;
    } else if (type === 'hole') { // Footing/Sonotube
        const radius = safeDia / 2;
        volPerUnitM3 = Math.PI * (radius * radius) * safeDepM;
    }

    const totalExactVolumeM3 = volPerUnitM3 * count;
    const orderVolumeM3 = totalExactVolumeM3 * (1 + (wastage / 100));
    
    // Unit specific math
    const totalExactVolumeYd3 = totalExactVolumeM3 * m3ToYd3;
    const orderVolumeYd3 = orderVolumeM3 * m3ToYd3;
    
    const billableVolume = unitSystem === 'ft' ? orderVolumeYd3 : orderVolumeM3;
    
    // Bag calculations (done in cubic feet)
    const orderVolumeFt3 = orderVolumeYd3 * yd3ToFt3;
    const bags80 = Math.ceil(orderVolumeFt3 / BAG_YIELDS['80lb']);
    const bags60 = Math.ceil(orderVolumeFt3 / BAG_YIELDS['60lb']);
    const bags40 = Math.ceil(orderVolumeFt3 / BAG_YIELDS['40lb']);

    // Costs
    const costReadyMix = billableVolume * readyMixPrice; 
    const costBags = bags80 * bag80Price;
    
    // Estimate labor: slabs are faster per yd3 than walls. Tubes are fast but dig time varies.
    // Basic approx: 1.5 hours per yd3/m3
    const laborHours = billableVolume * 1.5; 
    const costLabor = laborHours * laborRate;
    
    const grandTotalReadyMix = costReadyMix + costLabor;
    const grandTotalBags = costBags + costLabor;

    // --- 3D SCENE REBUILD ---
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'concreteSystem') toRemove.push(c); });
    toRemove.forEach(c => {
        scene.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
    });

    const isBlueprint = visualTheme === 'blueprint';
    const getMat = (colorHex, opacityVal) => new THREE.MeshStandardMaterial({
        color: colorHex, wireframe: isBlueprint, transparent: opacityVal < 1 || isBlueprint, 
        opacity: isBlueprint ? 0.4 : opacityVal, roughness: 0.9, side: THREE.DoubleSide
    });

    const mainGroup = new THREE.Object3D();
    mainGroup.name = 'concreteSystem'; 

    const displayCount = Math.min(count, 16); // Limit 3D rendering count
    const cols = Math.ceil(Math.sqrt(displayCount));
    const rows = Math.ceil(displayCount / cols);
    
    // Visual Scale logic to keep it looking good on screen
    const maxVisDim = Math.max(safeLen, safeWid, safeDia, safeDepM);
    const visScale = 10 / maxVisDim; 
    
    const vLen = safeLen * visScale;
    const vWid = safeWid * visScale;
    const vDep = safeDepM * visScale;
    const vDia = safeDia * visScale;

    const spacing = Math.max(vLen, vDia) * 1.5;
    const startX = -((cols - 1) * spacing) / 2;
    const startZ = -((rows - 1) * spacing) / 2;

    const generatedElements = [];

    for (let i = 0; i < displayCount; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const itemGroup = new THREE.Group();
        itemGroup.position.set(startX + (c * spacing), 0, startZ + (r * spacing));

        let concreteGeo, formGeo;
        
        if (type === 'slab') {
            concreteGeo = new THREE.BoxGeometry(vLen, vDep, vWid);
            formGeo = new THREE.BoxGeometry(vLen + 0.2, vDep, vWid + 0.2); 
            concreteGeo.translate(0, vDep / 2, 0);
            formGeo.translate(0, vDep / 2, 0);
        } else if (type === 'wall') {
            // Walls usually stand up: L x W(thickness) x D(height)
            concreteGeo = new THREE.BoxGeometry(vLen, vDep, vWid);
            formGeo = new THREE.BoxGeometry(vLen + 0.1, vDep, vWid + 0.1); 
            concreteGeo.translate(0, vDep / 2, 0);
            formGeo.translate(0, vDep / 2, 0);
        } else {
            // Hole / Column
            concreteGeo = new THREE.CylinderGeometry(vDia/2, vDia/2, vDep, 32);
            formGeo = new THREE.CylinderGeometry((vDia/2) + 0.1, (vDia/2) + 0.1, vDep, 32);
            // Holes go *down* into the grid, columns go *up*
            concreteGeo.translate(0, -(vDep / 2), 0);
            formGeo.translate(0, -(vDep / 2), 0);
        }

        const formMesh = new THREE.Mesh(formGeo, getMat(isBlueprint ? COLORS.BLUEPRINT_FORM : COLORS.FORMWORK, 0.7));
        formMesh.castShadow = !isBlueprint; 
        itemGroup.add(formMesh);

        const concMesh = new THREE.Mesh(concreteGeo, getMat(isBlueprint ? COLORS.BLUEPRINT_STRUCT : COLORS.DRY_CONCRETE, 1));
        concMesh.castShadow = !isBlueprint; concMesh.receiveShadow = !isBlueprint;
        itemGroup.add(concMesh);

        formMesh.visible = false;
        concMesh.visible = true;

        mainGroup.add(itemGroup);
        generatedElements.push({ formwork: formMesh, concrete: concMesh });
    }

    scene.add(mainGroup);
    sceneObjectsRef.current.elements = generatedElements;
    animStateRef.current.active = false;

    // Adjust camera
    const padL = cols * spacing;
    const padW = rows * spacing;
    const maxGroupDim = Math.max(padL, padW, vDep);
    cameraRef.current.position.set(maxGroupDim * 0.8, maxGroupDim * 0.6, maxGroupDim * 1.0);
    controlsRef.current.target.set(0, type === 'hole' ? -vDep/2 : vDep / 2, 0); 

    setResults({
      volPerUnitM3, totalExactVolumeM3, orderVolumeM3, 
      totalExactVolumeYd3, orderVolumeYd3, orderVolumeFt3, billableVolume,
      bags80, bags60, bags40,
      costReadyMix, costBags, laborHours, costLabor, grandTotalReadyMix, grandTotalBags,
      displayCount
    });
  };

  return (
    <div className={`flex flex-col xl:flex-row gap-6 p-4 md:p-6 text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block ${isProjectMode ? 'bg-transparent' : 'bg-[#020617]'}`}>
      
      {!isProjectMode && (
        <>
          <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-slate-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none print:hidden"></div>
        </>
      )}

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[400px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center shadow-lg shadow-slate-500/30 text-xl">🧱</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">Concrete Calc</h2>
                  <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest">Volume & Batching</p>
                </div>
            </div>
            <select name="unitSystem" value={unitSystem} onChange={handleUnitSystemChange} className="bg-slate-800/80 border border-slate-600/50 rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-cyan-400 font-bold transition-all cursor-pointer">
                <option value="ft">Imperial</option>
                <option value="m">Metric</option>
            </select>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            
            {/* GEOMETRY */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-cyan-400 transition-colors"><span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>Structure Type</h3>
                
                <div className="flex p-1 bg-slate-900/80 rounded-lg border border-slate-700/50 mb-4">
                    <button onClick={() => setInputs(p => ({...p, type: 'slab'}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${inputs.type === 'slab' ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Slab</button>
                    <button onClick={() => setInputs(p => ({...p, type: 'wall'}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${inputs.type === 'wall' ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Wall</button>
                    <button onClick={() => setInputs(p => ({...p, type: 'hole'}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${inputs.type === 'hole' ? 'bg-cyan-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Tube/Hole</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    {inputs.type !== 'hole' ? (
                        <>
                            <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length ({unitSystem})</label>
                                <input type="number" step="0.5" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white font-mono" />
                            </div>
                            <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase">{inputs.type === 'wall' ? 'Thickness' : 'Width'} ({unitSystem})</label>
                                <input type="number" step="0.5" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white font-mono" />
                            </div>
                        </>
                    ) : (
                        <div className="col-span-2">
                            <label className="block text-[9px] text-slate-400 mb-1 uppercase">Diameter ({unitSystem})</label>
                            <input type="number" step="0.5" name="diameter" value={inputs.diameter} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white font-mono" />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">{inputs.type === 'wall' ? 'Height' : 'Depth'}</label>
                        <div className="flex bg-slate-900/80 border border-slate-700/80 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-cyan-500">
                            <input type="number" step="1" name="depth" value={inputs.depth} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-cyan-400 font-bold" />
                            <select name="depthUnit" value={inputs.depthUnit} onChange={handleInputChange} className="bg-slate-800 text-[10px] text-slate-300 outline-none px-1 border-l border-slate-700/80 cursor-pointer">
                                <option value="in">in</option>
                                <option value="ft">ft</option>
                                <option value="cm">cm</option>
                                <option value="m">m</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase text-indigo-400">Quantity</label>
                        <input type="number" step="1" name="count" value={inputs.count} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-indigo-400 font-bold transition-all" />
                    </div>
                </div>
            </div>

            {/* WASTAGE */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-orange-400 transition-colors"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>Wastage Margin</h3>
                <div>
                    <label className="flex justify-between items-center text-[10px] text-slate-400 mb-1 uppercase">
                        <span>Spill & Uneven Subgrade</span>
                        <span className="text-orange-400 font-mono text-[10px]">+{inputs.wastage}%</span>
                    </label>
                    <input type="range" name="wastage" min="0" max="25" step="1" value={inputs.wastage} onChange={handleInputChange} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                    <div className="flex justify-between text-[8px] text-slate-500 mt-1 uppercase font-bold"><span>0%</span><span>Standard (10%)</span><span>25%</span></div>
                </div>
            </div>

            {/* ECONOMICS */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group mb-2">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Economics</h3>
                    <select name="currency" value={inputs.currency} onChange={handleInputChange} className="bg-transparent border-none text-[10px] outline-none text-emerald-400 cursor-pointer font-bold">
                        <option value="$">USD ($)</option>
                        <option value="₹">INR (₹)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                    </select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Ready-Mix (per {unitSystem === 'ft' ? 'yd³' : 'm³'})</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="readyMixPrice" value={inputs.readyMixPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">80lb Premix Bag</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="bag80Price" value={inputs.bag80Price} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Labor (per hr)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="laborRate" value={inputs.laborRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
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
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Req. Volume</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 leading-none">
                             {results.billableVolume.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}
                           </span>
                       </div>
                       <div className="w-px h-8 bg-slate-700"></div>
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Ready-Mix Est.</span>
                           <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotalReadyMix.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                       </div>
                    </div>
                ) : mode === 'civil' ? (
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Financial Takeoff</h2>
                ) : mode === 'math' ? (
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Mathematical Proof</h2>
                ) : null}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {(mode === 'civil' || mode === 'math') && (
                    <button onClick={handlePrint} className="bg-slate-700/50 hover:bg-slate-600 border border-slate-500/50 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
                    </button>
                )}

                <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
                    <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'normal' ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
                    <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'math' ? 'bg-indigo-500 text-slate-900 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
                    <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'civil' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>Takeoff</button>
                </div>
            </div>
        </div>

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] group print:hidden`}>
            <div ref={mountRef} className="absolute inset-0"></div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={triggerSimulation} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500 hover:text-slate-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg> 
                    Simulate Pour
                </button>
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Solid</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}>Wireframe</button>
            </div>
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-slate-200 pb-6 mb-8 print:border-black">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Volumetric Calculations</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Detailed Mathematical Proof</p>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                 {/* Step 1 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-cyan-700 border-b border-slate-100 pb-3 mb-4 print:text-black">1. Base Exact Volume (Per Unit)</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="italic text-slate-500 mb-2">Note: All inputs converted to primary unit ({unitSystem}) before multiplication.</p>
                        {inputs.type !== 'hole' ? (
                          <>
                            <p><span className="text-slate-400 print:text-black font-bold">Formula</span> = Length × Width × {inputs.type === 'wall' ? 'Height' : 'Depth'}</p>
                            <p>Exact Volume = {inputs.length} × {inputs.width} × {inputs.depth} {inputs.depthUnit}</p>
                          </>
                        ) : (
                          <>
                            <p><span className="text-slate-400 print:text-black font-bold">Formula</span> = π × (Diameter / 2)² × Depth</p>
                            <p>Exact Volume = π × ({inputs.diameter/2})² × {inputs.depth} {inputs.depthUnit}</p>
                          </>
                        )}
                        <br/>
                        <p className="text-cyan-700 print:text-black font-bold text-base mt-2">Unit Volume = {(results.totalExactVolumeYd3 / inputs.count).toFixed(4)} cubic yards / {(results.totalExactVolumeM3 / inputs.count).toFixed(4)} cubic meters</p>
                    </div>
                 </div>

                 {/* Step 2 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-orange-700 border-b border-slate-100 pb-3 mb-4 print:text-black">2. Total Volume & Wastage Allowance</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Base Total</span> = Unit Volume × {inputs.count} Units</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Base Total</span> = <span className="font-bold text-slate-900">{results.totalExactVolumeYd3.toFixed(3)} yd³</span> / <span className="font-bold text-slate-900">{results.totalExactVolumeM3.toFixed(3)} m³</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Order Volume (+{inputs.wastage}% Wastage)</span> = Base Total × {(1 + inputs.wastage/100).toFixed(2)}</p>
                        <p className="text-orange-700 print:text-black font-bold text-base mt-2">Final Required Volume = {results.orderVolumeYd3.toFixed(2)} yd³ / {results.orderVolumeM3.toFixed(2)} m³</p>
                    </div>
                 </div>

                 {/* Step 3 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-indigo-700 border-b border-slate-100 pb-3 mb-4 print:text-black">3. Premix Bag Conversion (If not using Ready-Mix)</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Required Cubic Feet</span> = {results.orderVolumeFt3.toFixed(2)} ft³</p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">80lb Bags (Yield {BAG_YIELDS['80lb']} ft³)</span> = ceil({results.orderVolumeFt3.toFixed(2)} / {BAG_YIELDS['80lb']}) = <span className="font-bold text-indigo-700">{results.bags80} bags</span></p>
                        <p><span className="text-slate-400 print:text-black font-bold">60lb Bags (Yield {BAG_YIELDS['60lb']} ft³)</span> = ceil({results.orderVolumeFt3.toFixed(2)} / {BAG_YIELDS['60lb']}) = <span className="font-bold text-indigo-700">{results.bags60} bags</span></p>
                        <p><span className="text-slate-400 print:text-black font-bold">40lb Bags (Yield {BAG_YIELDS['40lb']} ft³)</span> = ceil({results.orderVolumeFt3.toFixed(2)} / {BAG_YIELDS['40lb']}) = <span className="font-bold text-indigo-700">{results.bags40} bags</span></p>
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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Concrete Takeoff</h1>
                        <p className="text-sm text-slate-500 mt-1 font-mono">Generated by CivisMetric Engine</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest print:text-black">Ready-Mix Total</p>
                        <p className="text-4xl font-black text-emerald-600 font-mono print:text-black">{inputs.currency}{results.grandTotalReadyMix.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:block">
                    <div className="print:mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Project Specifications</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Element Type</td><td className="py-2 font-medium text-right capitalize">{inputs.type}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300">
                                  <td className="py-2 text-slate-500 print:text-black">Dimensions</td>
                                  <td className="py-2 font-medium text-right">
                                    {inputs.type !== 'hole' ? `${inputs.length} x ${inputs.width} ${unitSystem} x ${inputs.depth}${inputs.depthUnit}` : `${inputs.diameter} Dia x ${inputs.depth}${inputs.depthUnit}`}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Total Units</td><td className="py-2 font-bold text-indigo-600 text-right print:text-black">{inputs.count}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Volume Requirements</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Order Volume (+{inputs.wastage}%)</td><td className="py-2 font-bold text-cyan-600 text-right print:text-black">{results.billableVolume.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Alternative: 80lb Bags</td><td className="py-2 font-medium text-right">{results.bags80} bags</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Est. Labor Time</td><td className="py-2 font-medium text-right">{results.laborHours.toFixed(1)} Hours</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Option 1: Ready Mix */}
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Option A: Ready-Mix Truck Delivery</h3>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 print:border-black print:shadow-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider print:bg-transparent print:text-black print:border-b print:border-black">
                            <tr>
                                <th className="p-4 font-semibold">Item Description</th>
                                <th className="p-4 font-semibold">Quantity</th>
                                <th className="p-4 font-semibold">Rate</th>
                                <th className="p-4 font-semibold text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 print:divide-slate-300">
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Ready-Mix Concrete</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.billableVolume.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.readyMixPrice}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costReadyMix.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr className="bg-slate-50/50 print:bg-transparent">
                                <td className="p-4"><p className="font-bold text-slate-800">Site Labor & Placement</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.laborHours.toFixed(1)} hrs</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.laborRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costLabor.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                        <tfoot className="bg-emerald-50 print:bg-transparent print:border-t-2 print:border-black">
                            <tr>
                                <td colSpan="3" className="p-4 text-right font-bold text-emerald-800 uppercase tracking-widest text-xs print:text-black">Total (Ready-Mix)</td>
                                <td className="p-4 font-mono font-black text-emerald-600 text-xl text-right print:text-black">{inputs.currency}{results.grandTotalReadyMix.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Option 2: Bagged Mix */}
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Option B: Premixed Bags (DIY / Small Job)</h3>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 print:border-black print:shadow-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider print:bg-transparent print:text-black print:border-b print:border-black">
                            <tr>
                                <th className="p-4 font-semibold">Item Description</th>
                                <th className="p-4 font-semibold">Quantity</th>
                                <th className="p-4 font-semibold">Rate</th>
                                <th className="p-4 font-semibold text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 print:divide-slate-300">
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">80lb Concrete Bags</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.bags80} Bags</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.bag80Price}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costBags.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr className="bg-slate-50/50 print:bg-transparent">
                                <td className="p-4">
                                    <p className="font-bold text-slate-800">Site Labor & Placement</p>
                                    <p className="text-xs text-slate-500">Note: Mixing bags manually may take significantly longer than truck delivery.</p>
                                </td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.laborHours.toFixed(1)} hrs</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.laborRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costLabor.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                        <tfoot className="bg-emerald-50 print:bg-transparent print:border-t-2 print:border-black">
                            <tr>
                                <td colSpan="3" className="p-4 text-right font-bold text-emerald-800 uppercase tracking-widest text-xs print:text-black">Total (Bagged)</td>
                                <td className="p-4 font-mono font-black text-emerald-600 text-xl text-right print:text-black">{inputs.currency}{results.grandTotalBags.toLocaleString('en-US', {maximumFractionDigits: 0})}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <p className="text-xs text-slate-400 text-center italic print:hidden">* Estimates exclude rebar/wire mesh, subbase prep, delivery fees, and formwork materials unless otherwise noted.</p>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}