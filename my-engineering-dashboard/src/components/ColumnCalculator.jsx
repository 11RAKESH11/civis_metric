import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DragControls } from 'three/examples/jsm/controls/DragControls'; 

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254 };

// Authentic Real-World Material Colors
const COLORS = {
    DRY_CONCRETE: 0x9ca3af,
    WET_CONCRETE: 0x4b5563,
    REBAR: 0x334155,
    FORMWORK: 0x92400e, 
    BASE_SLAB: 0x78716c,
    BLUEPRINT_STRUCT: 0x0ea5e9,
    BLUEPRINT_FORM: 0xf59e0b
};

export default function ColumnCalculator({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    shape: 'rectangular', 
    count: 4,             
    length: 1.5,          
    width: 1.5,           
    diameter: 1.5,        
    height: 10,           
    steelRatio: 1.5,      
    concreteWastage: 5,   
    rebarWastage: 5,
    concretePrice: 120,   
    rebarPrice: 0.85,
    formworkPrice: 18,    
    laborRate: 200,
    currency: '₹'
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
  const dragControlsRef = useRef(null); 
  
  const sceneObjectsRef = useRef({ columns: [] });
  const animStateRef = useRef({ active: false, startTime: 0 });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = ['currency', 'shape'].includes(name) ? value : parseFloat(value) || 0;
    if (typeof parsedValue === 'number' && name !== 'shape') parsedValue = Math.max(0, parsedValue);
    if (name === 'count') parsedValue = Math.max(1, Math.floor(parsedValue));
    setInputs(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handlePrint = () => window.print();

  const handleAddOnToProject = () => {
      if (onAddOn && results) {
          onAddOn({
              stepName: 'Columns',
              type: 'column',
              inputs: { ...inputs },
              results: { ...results },
              cost: results.grandTotal
          });
      }
  };

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

      if (animStateRef.current.active && sceneObjectsRef.current.columns.length > 0) {
          const elapsed = (Date.now() - animStateRef.current.startTime) / 1000;

          sceneObjectsRef.current.columns.forEach(({ rebar, formwork, concrete }) => {
              if (elapsed < 1.5) {
                  rebar.visible = true;
                  formwork.visible = false;
                  concrete.visible = false;
                  rebar.scale.y = Math.max(0.001, elapsed / 1.5);
              } 
              else if (elapsed < 3.0) {
                  rebar.scale.y = 1;
                  formwork.visible = true;
                  formwork.material.opacity = visualTheme === 'blueprint' ? 0.3 : 0.9;
                  const progress = (elapsed - 1.5) / 1.5;
                  formwork.scale.y = Math.max(0.001, progress);
              } 
              else if (elapsed < 5.0) {
                  formwork.scale.y = 1;
                  concrete.visible = true;
                  const progress = (elapsed - 3.0) / 2.0;
                  concrete.scale.y = Math.max(0.001, progress);
                  if (visualTheme === 'realistic') concrete.material.color.setHex(COLORS.WET_CONCRETE);
              } 
              else if (elapsed < 6.0) {
                  concrete.scale.y = 1;
                  const progress = (elapsed - 5.0) / 1.0;
                  if (visualTheme === 'realistic') {
                      formwork.material.transparent = true;
                      formwork.material.opacity = 0.9 * (1 - progress);
                  } else {
                      formwork.visible = false;
                  }
              } 
              else if (elapsed < 7.5) {
                  formwork.visible = false;
                  if (visualTheme === 'realistic') {
                      const cureProgress = (elapsed - 6.0) / 1.5;
                      const wet = new THREE.Color(COLORS.WET_CONCRETE);
                      const dry = new THREE.Color(COLORS.DRY_CONCRETE);
                      concrete.material.color.copy(wet.lerp(dry, cureProgress));
                  }
              } 
              else {
                  formwork.visible = false;
                  concrete.scale.y = 1;
                  rebar.scale.y = 1;
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
      if (dragControlsRef.current) dragControlsRef.current.dispose(); 
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
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
      animStateRef.current = { active: true, startTime: Date.now() };
  };

  // --- Core Calculation & 3D Rebuild ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 300);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, visualTheme]);

  const calculateAndRender = () => {
    const { shape, count, length, width, diameter, height, steelRatio, concreteWastage, rebarWastage, concretePrice, rebarPrice, formworkPrice, laborRate } = inputs;
    const scene = sceneRef.current;

    if (!height || !count || !scene) return;

    const htM = height * unitToMeter[unitSystem];
    let volPerColumnM3 = 0;
    let formworkPerColumnM2 = 0;
    let safeLen = 1, safeWid = 1, safeDia = 1;

    if (shape === 'rectangular') {
        safeLen = Math.max(0.1, length * unitToMeter[unitSystem]);
        safeWid = Math.max(0.1, width * unitToMeter[unitSystem]);
        volPerColumnM3 = safeLen * safeWid * htM;
        formworkPerColumnM2 = 2 * (safeLen + safeWid) * htM;
    } else {
        safeDia = Math.max(0.1, diameter * unitToMeter[unitSystem]);
        const radius = safeDia / 2;
        volPerColumnM3 = Math.PI * (radius * radius) * htM;
        formworkPerColumnM2 = Math.PI * safeDia * htM;
    }

    if (volPerColumnM3 <= 0) return;

    const totalExactVolumeM3 = volPerColumnM3 * count;
    const totalFormworkM2 = formworkPerColumnM2 * count;
    const exactRebarKg = totalExactVolumeM3 * (steelRatio / 100) * 7850;
    const orderVolumeM3 = totalExactVolumeM3 * (1 + (concreteWastage / 100));
    const orderRebarKg = exactRebarKg * (1 + (rebarWastage / 100));
    const orderVolumeYd3 = orderVolumeM3 * 1.30795;
    const billableConcrete = unitSystem === 'ft' ? orderVolumeYd3 : orderVolumeM3;
    const costConcrete = billableConcrete * concretePrice; 
    const costRebar = orderRebarKg * rebarPrice;
    const costFormwork = totalFormworkM2 * formworkPrice;
    const laborHours = orderVolumeM3 * 2.5; 
    const costLabor = laborHours * laborRate;
    const grandTotal = costConcrete + costRebar + costFormwork + costLabor;

    // Clean up old objects
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicBuild') toRemove.push(c); });
    toRemove.forEach(c => {
        scene.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
    });

    const isBlueprint = visualTheme === 'blueprint';
    const getMat = (colorHex, opacityVal, isWireframe = false) => new THREE.MeshStandardMaterial({
        color: colorHex, wireframe: isBlueprint || isWireframe, transparent: opacityVal < 1 || isBlueprint, 
        opacity: isBlueprint ? 0.4 : opacityVal, roughness: 0.8, side: THREE.DoubleSide
    });

    // THIS IS THE CRITICAL FIX: Changing THREE.Group() to THREE.Object3D()
    const mainGroup = new THREE.Object3D();
    mainGroup.name = 'dynamicBuild'; 

    const displayCount = Math.min(count, 36); 
    const cols = Math.ceil(Math.sqrt(displayCount));
    const rows = Math.ceil(displayCount / cols);
    
    const spacing = Math.max(safeLen, safeDia) * 2.5;
    const padL = (cols * spacing);
    const padW = (rows * spacing);
    
    // Base Slab
    const baseGeo = new THREE.PlaneGeometry(padL + 2, padW + 2);
    baseGeo.rotateX(-Math.PI / 2);
    const baseMesh = new THREE.Mesh(baseGeo, getMat(COLORS.BASE_SLAB, 1));
    baseMesh.receiveShadow = true;
    mainGroup.add(baseMesh);

    const generatedColumns = [];
    const draggableObjects = []; 

    const startX = -(padL / 2) + (spacing / 2);
    const startZ = -(padW / 2) + (spacing / 2);

    for (let i = 0; i < displayCount; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const colGroup = new THREE.Group();
        colGroup.position.set(startX + (c * spacing), 0, startZ + (r * spacing));

        let concreteGeo, formGeo, rebarGeo;
        if (shape === 'rectangular') {
            concreteGeo = new THREE.BoxGeometry(safeLen, htM, safeWid);
            formGeo = new THREE.BoxGeometry(safeLen + 0.05, htM, safeWid + 0.05); 
            rebarGeo = new THREE.BoxGeometry(safeLen - 0.1, htM - 0.1, safeWid - 0.1); 
        } else {
            concreteGeo = new THREE.CylinderGeometry(safeDia/2, safeDia/2, htM, 32);
            formGeo = new THREE.CylinderGeometry((safeDia/2) + 0.025, (safeDia/2) + 0.025, htM, 32);
            rebarGeo = new THREE.CylinderGeometry((safeDia/2) - 0.05, (safeDia/2) - 0.05, htM - 0.1, 12);
        }

        concreteGeo.translate(0, htM / 2, 0);
        formGeo.translate(0, htM / 2, 0);
        rebarGeo.translate(0, htM / 2, 0);

        const rebarMesh = new THREE.Mesh(rebarGeo, getMat(COLORS.REBAR, 1, true));
        rebarMesh.castShadow = true; colGroup.add(rebarMesh);

        const formMesh = new THREE.Mesh(formGeo, getMat(isBlueprint ? COLORS.BLUEPRINT_FORM : COLORS.FORMWORK, 0.9));
        formMesh.castShadow = !isBlueprint; colGroup.add(formMesh);

        const concMesh = new THREE.Mesh(concreteGeo, getMat(isBlueprint ? COLORS.BLUEPRINT_STRUCT : COLORS.DRY_CONCRETE, 1));
        concMesh.castShadow = !isBlueprint; concMesh.receiveShadow = !isBlueprint;
        colGroup.add(concMesh);

        rebarMesh.visible = false;
        formMesh.visible = false;
        concMesh.visible = true;

        mainGroup.add(colGroup);
        generatedColumns.push({ group: colGroup, rebar: rebarMesh, formwork: formMesh, concrete: concMesh });
        draggableObjects.push(colGroup); 
    }

    scene.add(mainGroup);
    sceneObjectsRef.current.columns = generatedColumns;
    animStateRef.current.active = false;

    // --- SETUP DRAG CONTROLS ---
    if (dragControlsRef.current) {
        dragControlsRef.current.dispose(); 
    }
    
    const dragControls = new DragControls(draggableObjects, cameraRef.current, rendererRef.current.domElement);
    
    dragControls.transformGroup = true; 
    
    dragControls.addEventListener('dragstart', function (event) {
        if (controlsRef.current) {
            controlsRef.current.enabled = false; 
            controlsRef.current.autoRotate = false;
        }
        event.object.scale.set(1.05, 1.05, 1.05); 
        document.body.style.cursor = 'grabbing';
    });

    dragControls.addEventListener('drag', function (event) {
        event.object.position.y = 0; 
    });

    dragControls.addEventListener('dragend', function (event) {
        if (controlsRef.current) {
            controlsRef.current.enabled = true; 
            controlsRef.current.autoRotate = true;
        }
        event.object.scale.set(1, 1, 1);
        document.body.style.cursor = 'auto';
    });

    dragControlsRef.current = dragControls;

    // Adjust camera
    const maxDim = Math.max(padL, padW, htM);
    cameraRef.current.position.set(maxDim * 0.8, maxDim * 0.5, maxDim * 1.2);
    controlsRef.current.target.set(0, htM / 3, 0); 
    scene.fog.density = 0.02 / Math.max(1, maxDim);

    setResults({
      volPerColumnM3, formworkPerColumnM2,
      totalExactVolumeM3, totalFormworkM2,
      exactRebarKg, orderRebarKg,
      orderVolumeM3, orderVolumeYd3,
      costConcrete, costRebar, costFormwork, costLabor, grandTotal, laborHours,
      displayCount
    });
  };

  return (
    <div className={`flex flex-col xl:flex-row gap-6 p-4 md:p-6 text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block ${isProjectMode ? 'bg-transparent' : 'bg-[#020617]'}`}>
      
      {!isProjectMode && (
        <>
          <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none print:hidden"></div>
        </>
      )}

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[400px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-lg">🏛️</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">Column Builder</h2>
                  <p className="text-[9px] text-blue-400 font-mono uppercase tracking-widest">Structural Estimate</p>
                </div>
            </div>
            <select name="currency" value={inputs.currency} onChange={handleInputChange} className="bg-slate-800/80 border border-slate-600/50 rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 text-blue-400 font-bold transition-all cursor-pointer">
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
            </select>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-blue-400 transition-colors"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>Profile & Geometry</h3>
                    <select name="unit" value={inputs.unit} onChange={handleInputChange} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-blue-500 transition-all">
                        <option value="m">Meters</option>
                        <option value="ft">Feet</option>
                    </select>
                </div>
                
                <div className="flex p-1 bg-slate-900/80 rounded-lg border border-slate-700/50 mb-3">
                    <button onClick={() => setInputs(p => ({...p, shape: 'rectangular'}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${inputs.shape === 'rectangular' ? 'bg-blue-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Rectangular</button>
                    <button onClick={() => setInputs(p => ({...p, shape: 'circular'}))} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${inputs.shape === 'circular' ? 'bg-blue-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Circular</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    {inputs.shape === 'rectangular' ? (
                        <>
                            <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length ({inputs.unit})</label>
                                <input type="number" step="0.1" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-mono" />
                            </div>
                            <div>
                                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Width ({inputs.unit})</label>
                                <input type="number" step="0.1" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-mono" />
                            </div>
                        </>
                    ) : (
                        <div className="col-span-2">
                            <label className="block text-[9px] text-slate-400 mb-1 uppercase">Diameter ({inputs.unit})</label>
                            <input type="number" step="0.1" name="diameter" value={inputs.diameter} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-mono" />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Total Height ({inputs.unit})</label>
                        <input type="number" step="0.5" name="height" value={inputs.height} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-blue-400 font-bold transition-all" />
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase text-indigo-400">Total Columns</label>
                        <input type="number" step="1" name="count" value={inputs.count} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-indigo-400 font-bold transition-all" />
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-orange-400 transition-colors"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>Reinforcement & Waste</h3>
                <div className="mb-3">
                    <label className="flex justify-between items-center text-[10px] text-slate-400 mb-1 uppercase">
                        <span>Steel / Rebar Ratio</span>
                        <span className="text-orange-400 font-mono text-[9px]">{inputs.steelRatio}% Vol</span>
                    </label>
                    <input type="range" name="steelRatio" min="0.5" max="4.0" step="0.1" value={inputs.steelRatio} onChange={handleInputChange} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                    <div className="flex justify-between text-[8px] text-slate-500 mt-1 uppercase font-bold"><span>0.5% (Light)</span><span>4.0% (Heavy)</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Concrete Waste</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-cyan-500">
                            <input type="number" name="concreteWastage" value={inputs.concreteWastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Rebar Waste</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-orange-500">
                            <input type="number" name="rebarWastage" value={inputs.rebarWastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white font-mono" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group mb-2">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Rates & Operations</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Concrete (per {inputs.unit === 'ft' ? 'yd³' : 'm³'})</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="concretePrice" value={inputs.concretePrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Rebar (per kg)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="rebarPrice" value={inputs.rebarPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Formwork (per m²)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="formworkPrice" value={inputs.formworkPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-900/10 p-2 rounded-lg border border-emerald-800/30">
                      <span className="text-[11px] text-emerald-400/80 font-medium ml-1">Labor (per hr)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-emerald-600/50">
                          <span className="text-emerald-400">{inputs.currency}</span>
                          <input type="number" name="laborRate" value={inputs.laborRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                </div>
            </div>

            {isProjectMode && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <button 
                      onClick={handleAddOnToProject}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                  >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Columns to Project
                  </button>
              </div>
            )}
        </div>
      </div>

      {/* --- Right Panel: Viewer & Report --- */}
      <div className="w-full xl:w-[calc(100%-404px)] bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden relative z-10 xl:h-[88vh] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        
        {/* Top Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-30 shrink-0 print:hidden">
            <div className="flex-1 h-10 flex items-center">
                {results && mode === 'normal' ? (
                    <div className="flex items-center gap-4 animate-fade-in">
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Concrete</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 leading-none">
                             {inputs.unit === 'ft' ? results.orderVolumeYd3.toFixed(1) : results.orderVolumeM3.toFixed(1)} {inputs.unit === 'ft' ? 'yd³' : 'm³'}
                           </span>
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
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Structural Mathematics</h2>
                ) : null}
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {(mode === 'civil' || mode === 'math') && (
                    <button onClick={handlePrint} className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
                    </button>
                )}

                <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
                    <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'normal' ? 'bg-blue-500 text-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
                    <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'math' ? 'bg-indigo-500 text-slate-900 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
                    <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'civil' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>Report</button>
                </div>
            </div>
        </div>

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] group print:hidden`}>
            
            {/* Visual Hint for Drag and Drop */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-blue-500/80 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)] backdrop-blur-md pointer-events-none flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                Drag columns to move them
            </div>

            <div ref={mountRef} className="absolute inset-0"></div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={triggerSimulation} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-500 hover:text-slate-900 mr-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Simulate Pour
                </button>
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Realistic</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}>Wireframe</button>
            </div>
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-slate-200 pb-6 mb-8 print:border-black">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Structural Calculations</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Detailed Mathematical Proof (Base Unit: Meters/Kg)</p>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                 {/* Step 1 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-blue-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 1: Concrete Volume (per Column)</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        {inputs.shape === 'rectangular' ? (
                          <>
                            <p><span className="text-slate-400 print:text-black font-bold">Formula</span> = Length × Width × Height</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Volume</span> = {(inputs.length * unitToMeter[inputs.unit]).toFixed(3)}m × {(inputs.width * unitToMeter[inputs.unit]).toFixed(3)}m × {(inputs.height * unitToMeter[inputs.unit]).toFixed(3)}m</p>
                          </>
                        ) : (
                          <>
                            <p><span className="text-slate-400 print:text-black font-bold">Formula</span> = π × (Diameter / 2)² × Height</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Volume</span> = π × ({(inputs.diameter * unitToMeter[inputs.unit] / 2).toFixed(3)}m)² × {(inputs.height * unitToMeter[inputs.unit]).toFixed(3)}m</p>
                          </>
                        )}
                        <p className="text-blue-700 print:text-black font-bold text-base mt-2">Volume = {results.volPerColumnM3.toFixed(3)} m³ / column</p>
                    </div>
                 </div>

                 {/* Step 2 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-orange-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 2: Steel Reinforcement Matrix</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Total Concrete Vol</span> = {results.volPerColumnM3.toFixed(3)} m³ × {inputs.count} columns = <span className="font-bold text-slate-900">{results.totalExactVolumeM3.toFixed(3)} m³</span></p>
                        <p><span className="text-slate-400 print:text-black font-bold">Steel Density Constant</span> = 7850 kg/m³</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Design Ratio</span> = {inputs.steelRatio}% of concrete volume</p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Exact Weight</span> = Total Vol × (Ratio / 100) × Density</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Exact Weight</span> = {results.totalExactVolumeM3.toFixed(3)} × {(inputs.steelRatio / 100).toFixed(4)} × 7850 = <span className="font-bold text-slate-900">{results.exactRebarKg.toFixed(2)} kg</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Order Weight (+{inputs.rebarWastage}% Wastage)</span> = {results.exactRebarKg.toFixed(2)} × {(1 + inputs.rebarWastage/100).toFixed(2)}</p>
                        <p className="text-orange-700 print:text-black font-bold text-base mt-2">Final Rebar Weight = {results.orderRebarKg.toFixed(2)} kg</p>
                    </div>
                 </div>

                 {/* Step 3 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-indigo-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 3: Formwork (Shuttering) Area</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        {inputs.shape === 'rectangular' ? (
                          <>
                            <p><span className="text-slate-400 print:text-black font-bold">Perimeter</span> = 2 × (Length + Width)</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Surface Area</span> = Perimeter × Height</p>
                          </>
                        ) : (
                          <>
                            <p><span className="text-slate-400 print:text-black font-bold">Circumference</span> = π × Diameter</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Surface Area</span> = Circumference × Height</p>
                          </>
                        )}
                        <p><span className="text-slate-400 print:text-black font-bold">Area per Column</span> = {results.formworkPerColumnM2.toFixed(3)} m²</p>
                        <p className="text-indigo-700 print:text-black font-bold text-base mt-2">Total Formwork Area = {results.formworkPerColumnM2.toFixed(3)} × {inputs.count} = {results.totalFormworkM2.toFixed(2)} m²</p>
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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Project Estimate</h1>
                        <p className="text-sm text-slate-500 mt-1 font-mono">Generated by CivisMetric Engine</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest print:text-black">Grand Total</p>
                        <p className="text-4xl font-black text-emerald-600 font-mono print:text-black">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:block">
                    <div className="print:mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Project Specifications</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Column Profile</td><td className="py-2 font-medium text-right capitalize">{inputs.shape}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300">
                                  <td className="py-2 text-slate-500 print:text-black">Dimensions</td>
                                  <td className="py-2 font-medium text-right">
                                    {inputs.shape === 'rectangular' ? `${inputs.length}L × ${inputs.width}W × ${inputs.height}H` : `${inputs.diameter}D × ${inputs.height}H`} {inputs.unit}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Total Units</td><td className="py-2 font-bold text-indigo-600 text-right print:text-black">{inputs.count} Columns</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Steel Design Ratio</td><td className="py-2 font-medium text-right">{inputs.steelRatio}% of Volume</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Material Quantities</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Required Concrete (+{inputs.concreteWastage}%)</td><td className="py-2 font-medium text-right text-blue-600 print:text-black">{inputs.unit === 'ft' ? results.orderVolumeYd3.toFixed(2) : results.orderVolumeM3.toFixed(2)} {inputs.unit === 'ft' ? 'yd³' : 'm³'}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Required Steel (+{inputs.rebarWastage}%)</td><td className="py-2 font-medium text-right text-orange-600 print:text-black">{results.orderRebarKg.toFixed(0)} kg</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Formwork Surface</td><td className="py-2 font-medium text-right">{results.totalFormworkM2.toFixed(2)} m²</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Est. Labor Time</td><td className="py-2 font-medium text-right">{results.laborHours.toFixed(1)} Hours</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Itemized Cost Breakdown</h3>
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
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.unit === 'ft' ? results.orderVolumeYd3.toFixed(2) : results.orderVolumeM3.toFixed(2)} {inputs.unit === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.concretePrice}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costConcrete.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Steel Reinforcement</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.orderRebarKg.toFixed(2)} kg</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.rebarPrice}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costRebar.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Timber Formwork</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.totalFormworkM2.toFixed(2)} m²</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.formworkPrice}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costFormwork.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr className="bg-slate-50/50 print:bg-transparent">
                                <td className="p-4"><p className="font-bold text-slate-800">Skilled Labor</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.laborHours.toFixed(1)} hrs</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.laborRate}</td>
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
                
                <p className="text-xs text-slate-400 text-center italic print:hidden">* This is an automated estimate. Actual costs may vary based on site conditions, transportation, and local market fluctuations.</p>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}