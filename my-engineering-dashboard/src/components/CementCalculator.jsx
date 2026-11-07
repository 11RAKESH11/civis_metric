import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const unitToMeter = { m: 1, ft: 0.3048, cm: 0.01, in: 0.0254 };

// Categorized mix ratios
const mixRatios = {
  // Concrete Mixes
  'M10': { category: 'concrete', cement: 1, sand: 3, aggregate: 6, label: 'M10 (1:3:6) - PCC/Base' },
  'M15': { category: 'concrete', cement: 1, sand: 2, aggregate: 4, label: 'M15 (1:2:4) - Standard' },
  'M20': { category: 'concrete', cement: 1, sand: 1.5, aggregate: 3, label: 'M20 (1:1.5:3) - RCC Slabs' },
  'M25': { category: 'concrete', cement: 1, sand: 1, aggregate: 2, label: 'M25 (1:1:2) - Heavy RCC' },
  // Mortar Mixes
  'Mortar 1:3': { category: 'mortar', cement: 1, sand: 3, aggregate: 0, label: 'Mortar (1:3) - Rich Plaster' },
  'Mortar 1:4': { category: 'mortar', cement: 1, sand: 4, aggregate: 0, label: 'Mortar (1:4) - Std Plaster' },
  'Mortar 1:6': { category: 'mortar', cement: 1, sand: 6, aggregate: 0, label: 'Mortar (1:6) - Brickwork' },
  'Custom': { category: 'custom', cement: 1, sand: 2, aggregate: 4, label: 'Custom Ratio' },
};

// Applications
const applicationTypes = [
  { id: 'concrete', name: 'Concrete Work', dryFactor: 1.54, hasAgg: true },
  { id: 'mortar', name: 'Brickwork Mortar', dryFactor: 1.33, hasAgg: false },
  { id: 'plaster', name: 'Wall Plastering', dryFactor: 1.33, hasAgg: false }
];

export default function CementCalculator() {
  // --- Inputs ---
  const [appType, setAppType] = useState('concrete');
  const [calcMethod, setCalcMethod] = useState('dimensions'); 
  const [unitSystem, setUnitSystem] = useState('ft'); 
  
  // Dimensions
  const [length, setLength] = useState(20);
  const [width, setWidth] = useState(15);
  const [thickness, setThickness] = useState(6); 
  const [directVolume, setDirectVolume] = useState(10); 
  
  // Mix & Specs
  const [mixKey, setMixKey] = useState('M20');
  const [customCement, setCustomCement] = useState(1);
  const [customSand, setCustomSand] = useState(1.5);
  const [customAggregate, setCustomAggregate] = useState(3);
  const [wastage, setWastage] = useState(5); 
  const [bagSize, setBagSize] = useState(50); 
  
  // Rates
  const [cementPrice, setCementPrice] = useState(400); 
  const [sandPrice, setSandPrice] = useState(1500); 
  const [aggregatePrice, setAggregatePrice] = useState(1200); 
  const [laborRate, setLaborRate] = useState(200); 
  const [currency] = useState('₹');

  // --- UI State ---
  const [mode, setMode] = useState('normal');
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  // --- 3D Refs ---
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  const instancedMeshRef = useRef(null);
  const animationDataRef = useRef([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = ['currency'].includes(name) ? value : parseFloat(value) || 0;
    if (typeof parsedValue === 'number') parsedValue = Math.max(0, parsedValue);
    
    const stateMap = {
        length: setLength, width: setWidth, thickness: setThickness, directVolume: setDirectVolume,
        customCement: setCustomCement, customSand: setCustomSand, customAggregate: setCustomAggregate,
        wastage: setWastage, bagSize: setBagSize, cementPrice: setCementPrice, 
        sandPrice: setSandPrice, aggregatePrice: setAggregatePrice, laborRate: setLaborRate
    };
    if(stateMap[name]) stateMap[name](parsedValue);
  };

  const handlePrint = () => window.print();

  // Automatically adjust mix dropdown if application changes
  useEffect(() => {
    const app = applicationTypes.find(a => a.id === appType);
    if (!app.hasAgg && mixKey.includes('M') && mixKey !== 'Custom' && !mixKey.includes('Mortar')) {
        setMixKey('Mortar 1:4');
    } else if (app.hasAgg && mixKey.includes('Mortar') && mixKey !== 'Custom') {
        setMixKey('M20');
    }
  }, [appType, mixKey]);

  // --- Calculations ---
  const getMix = () => {
    const app = applicationTypes.find(a => a.id === appType);
    if (mixKey !== 'Custom') return mixRatios[mixKey];
    return { 
        cement: customCement, 
        sand: customSand, 
        aggregate: app.hasAgg ? customAggregate : 0, 
        label: 'Custom Ratio' 
    };
  };

  const calculate = () => {
    const app = applicationTypes.find(a => a.id === appType);
    let rawVolume = 0;
    let volM3 = 0;

    if (calcMethod === 'dimensions') {
        const lenM = length * unitToMeter[unitSystem];
        const widM = width * unitToMeter[unitSystem];
        const thickM = thickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
        volM3 = lenM * widM * thickM;
        if (unitSystem === 'ft') {
            rawVolume = length * width * (thickness / 12);
        } else {
            rawVolume = length * width * (thickness / 100);
        }
    } else {
        rawVolume = directVolume;
        volM3 = unitSystem === 'ft' ? (directVolume * 0.0283168) : directVolume;
    }

    if (volM3 <= 0) return;

    const mix = getMix();
    const totalParts = mix.cement + mix.sand + mix.aggregate;
    if (totalParts === 0) return;

    // Dry Volume Math
    const dryVol = volM3 * app.dryFactor * (1 + wastage / 100);

    // Cement Math
    const cementVol = (mix.cement / totalParts) * dryVol; 
    const bagVolumeM3 = bagSize / 1440; 
    // A bag size of 0 or less can't hold cement; count no bags rather than Infinity.
    const cementBags = bagVolumeM3 > 0 ? Math.ceil(cementVol / bagVolumeM3) : 0;

    // Sand Math
    const sandVol = (mix.sand / totalParts) * dryVol; 
    const sandKg = sandVol * 1500; 
    const sandTons = sandKg / 1000;

    // Aggregate Math
    let aggregateVol = 0, aggregateTons = 0;
    if (app.hasAgg) {
        aggregateVol = (mix.aggregate / totalParts) * dryVol; 
        const aggregateKg = aggregateVol * 1600; 
        aggregateTons = aggregateKg / 1000;
    }

    // Financials
    const costCement = cementBags * cementPrice;
    const costSand = sandTons * sandPrice;
    const costAggregate = aggregateTons * aggregatePrice;
    const laborHours = volM3 * (app.id === 'plaster' ? 1.5 : 0.8);
    const laborCost = laborHours * laborRate;
    
    const totalCost = costCement + costSand + costAggregate + laborCost;

    setResults({
      app, volM3: volM3.toFixed(2), rawVolume: rawVolume.toFixed(2), dryVol: dryVol.toFixed(2),
      cementBags, cementVol: cementVol.toFixed(3),
      sandVol: sandVol.toFixed(3), sandTons: sandTons.toFixed(2),
      aggregateVol: aggregateVol.toFixed(3), aggregateTons: aggregateTons.toFixed(2),
      costCement: costCement.toFixed(2), costSand: costSand.toFixed(2),
      costAggregate: costAggregate.toFixed(2), 
      laborCost: laborCost.toFixed(2), totalCost: totalCost.toFixed(2), mix,
    });

    update3DModel(cementBags, false); // Build instantly on calc change
  };

  // --- Smooth Professional Animation Stacking Logic ---
  const update3DModel = (bagCount, withAnimation = false) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old meshes safely
    const childrenToRemove = scene.children.filter(c => c.isGroup);
    childrenToRemove.forEach(c => scene.remove(c));

    const isBlueprint = visualTheme === 'blueprint';
    const color = isBlueprint ? 0x0ea5e9 : 0xd2cabb; 
    const opacity = isBlueprint ? 0.4 : 1;
    const wireframe = isBlueprint;

    // Visual cap at 150 bags for performance
    const displayBags = Math.min(bagCount, 150);
    const group = new THREE.Group();
    
    const bagGeo = new THREE.BoxGeometry(0.6, 0.12, 0.4);
    const bagMat = new THREE.MeshStandardMaterial({ 
        color, roughness: 0.9, transparent: isBlueprint, opacity, wireframe 
    });
    
    const instancedMesh = new THREE.InstancedMesh(bagGeo, bagMat, displayBags);
    instancedMesh.castShadow = !isBlueprint;
    instancedMesh.receiveShadow = !isBlueprint;
    instancedMeshRef.current = instancedMesh;

    const dummy = new THREE.Object3D();
    const animData = [];
    
    const bagsPerLayer = 6;
    const bagL = 0.6;
    const bagW = 0.4;
    const bagH = 0.12;
    const gap = 0.02;

    for (let i = 0; i < displayBags; i++) {
      const layer = Math.floor(i / bagsPerLayer);
      const posInLayer = i % bagsPerLayer;
      const isRotated = layer % 2 !== 0; 
      
      let x = 0, z = 0, rotY = 0;

      if (!isRotated) {
          const c = posInLayer % 2; 
          const r = Math.floor(posInLayer / 2); 
          x = (c - 0.5) * (bagL + gap);
          z = (r - 1) * (bagW + gap);
      } else {
          const c = posInLayer % 3; 
          const r = Math.floor(posInLayer / 3); 
          x = (c - 1) * (bagW + gap);
          z = (r - 0.5) * (bagL + gap);
          rotY = Math.PI / 2;
      }

      // Add very slight random variation so it looks stacked by a human
      x += (Math.random() - 0.5) * 0.015;
      z += (Math.random() - 0.5) * 0.015;
      rotY += (Math.random() - 0.5) * 0.03;
      
      const targetY = 0.12 + (layer * bagH) + (bagH / 2); 

      if (withAnimation) {
          // Smooth fade/slide down animation data
          animData.push({
              index: i, x, z, rotY,
              targetY, 
              progress: 0, // 0 to 1
              delay: i * 2 // sequence delay
          });
          dummy.position.set(x, targetY + 1, z); // Start slightly above
          dummy.scale.set(0.01, 0.01, 0.01);     // Start scaled down
      } else {
          // Instant build
          dummy.position.set(x, targetY, z);
          dummy.scale.set(1, 1, 1);
      }

      dummy.rotation.set(0, rotY, 0);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    animationDataRef.current = animData;
    group.add(instancedMesh);

    // Add Wooden Pallet
    if (!isBlueprint) {
        const palletGeo = new THREE.BoxGeometry(1.3, 0.12, 1.3); 
        const palletMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 1.0 });
        const pallet = new THREE.Mesh(palletGeo, palletMat);
        pallet.position.set(0, 0.06, 0);
        pallet.receiveShadow = true;
        pallet.castShadow = true;
        group.add(pallet);
    }

    scene.add(group);

    // Frame camera on the stack beautifully
    cameraRef.current.position.set(2.5, 3.0, 3.5);
    controlsRef.current.target.set(0, (Math.min(displayBags, 60) / 6) * 0.12 / 2, 0);
    controlsRef.current.update();
  };

  const triggerSimulation = () => {
    if (results) update3DModel(results.cementBags, true);
  };

  // --- Init Three.js ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.05);
    sceneRef.current = scene;

    const container = mountRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(initialWidth, initialHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
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
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.0;
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.2);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x0ea5e9, 0.8);
    rimLight.position.set(-5, 2, -5);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.01;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.2;
    scene.add(gridHelper);

    const dummy = new THREE.Object3D();
    let tick = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      tick++;

      // Process Smooth Materialization Animation
      let needsUpdate = false;
      if (instancedMeshRef.current && animationDataRef.current.length > 0) {
          animationDataRef.current.forEach((data) => {
              if (tick > data.delay && data.progress < 1) {
                  data.progress += 0.04; // Animation speed
                  if (data.progress > 1) data.progress = 1;
                  
                  // Ease-Out Cubic formula for smooth landing
                  const p = 1 - Math.pow(1 - data.progress, 3);
                  
                  // Slide down from 1 unit above, while scaling up
                  const currentY = data.targetY + (1 - p) * 1.0; 
                  const currentScale = Math.max(0.01, p); // prevent 0 scale warning

                  dummy.position.set(data.x, currentY, data.z);
                  dummy.rotation.set(0, data.rotY, 0);
                  dummy.scale.set(currentScale, currentScale, currentScale);
                  dummy.updateMatrix();
                  
                  instancedMeshRef.current.setMatrixAt(data.index, dummy.matrix);
                  needsUpdate = true;
              }
          });
          if (needsUpdate) instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      }

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
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      disposeObject(scene);
      renderer.dispose();
    };
  }, []);

  // Recalculate whenever an input changes.
  const recalculate = useEffectEvent(() => calculate());
  useEffect(() => {
    recalculate();
  }, [appType, calcMethod, length, width, thickness, directVolume, unitSystem, mixKey, customCement, customSand, customAggregate, wastage, bagSize, cementPrice, sandPrice, aggregatePrice, laborRate, visualTheme]);

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

  const activeApp = applicationTypes.find(a => a.id === appType);

  return (
    <div className="flex flex-col wide:flex-row gap-6 w-full h-full pb-6 text-ink font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block">
      
      {/* Left Panel */}
      <div className="w-full wide:w-[380px] bg-surface p-5 rounded-lg border border-line flex flex-col gap-4 z-10 relative h-auto wide:h-[calc(100vh-140px)] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
          <h2 className="text-sm font-semibold text-ink">Inputs</h2>
          <span className="text-xs text-muted font-medium whitespace-nowrap">Rates in ₹ INR</span>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          
          {/* Application Type */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">
              Application Type
            </h3>
            <select aria-label="Application type" value={appType} onChange={(e) => setAppType(e.target.value)} className="w-full bg-surface border border-line-control text-xs rounded-lg px-3 py-2.5 outline-none text-ink cursor-pointer focus:ring-1 focus:ring-focus mt-3 transition-all">
                {applicationTypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Geometry */}
          <div className="p-4 rounded-lg border border-line">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">Volume</h3>
              <select aria-label="Unit system" value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)} className="bg-surface border border-line-control text-xs rounded px-1.5 py-1 outline-none text-ink cursor-pointer focus:ring-1 focus:ring-focus transition-all">
                <option value="ft">Imperial (ft/in)</option>
                <option value="m">Metric (m/cm)</option>
              </select>
            </div>
            
            <div className="flex p-1 bg-surface rounded-lg border border-line mb-3">
                <button onClick={() => setCalcMethod('dimensions')} className={`flex-1 py-1.5 text-xs font-bold  rounded ${calcMethod === 'dimensions' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>Dimensions</button>
                <button onClick={() => setCalcMethod('volume')} className={`flex-1 py-1.5 text-xs font-bold  rounded ${calcMethod === 'volume' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>Direct Volume</button>
            </div>

            {calcMethod === 'dimensions' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label htmlFor="cement-length" className="block text-xs text-muted mb-1">Length ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                        <input id="cement-length" type="number" step="0.1" name="length" value={length} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                      </div>
                      <div>
                        <label htmlFor="cement-width" className="block text-xs text-muted mb-1">Width ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                        <input id="cement-width" type="number" step="0.1" name="width" value={width} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                      </div>
                  </div>
                  <div className="border-t border-line pt-3">
                        <label htmlFor="cement-thickness" className="block text-xs text-muted mb-1">Thickness / Depth ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                        <input id="cement-thickness" type="number" step="0.5" name="thickness" value={thickness} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                  </div>
                </>
            ) : (
                <div>
                  <label htmlFor="cement-directVolume" className="block text-xs text-muted mb-1">Total Volume ({unitSystem === 'ft' ? 'ft³' : 'm³'})</label>
                  <input id="cement-directVolume" type="number" step="0.5" name="directVolume" value={directVolume} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                </div>
            )}
          </div>

          {/* DYNAMIC MIX RATIO */}
          <div className="p-4 rounded-lg border border-line animate-fade-in">
            <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">
              
              {activeApp.hasAgg ? 'Concrete Mix Grade (C:S:A)' : 'Mortar Ratio (C:S)'}
            </h3>
            <select aria-label="Concrete mix grade" value={mixKey} onChange={(e) => setMixKey(e.target.value)} className="w-full bg-surface border border-line rounded-lg p-2 text-xs text-ink mt-3 focus:ring-1 focus:ring-focus outline-none">
              {Object.entries(mixRatios)
                .filter(([, v]) => activeApp.hasAgg ? (v.category === 'concrete' || v.category === 'custom') : (v.category === 'mortar' || v.category === 'custom'))
                .map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            
            {mixKey === 'Custom' && (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-line">
                <div>
                  <label htmlFor="cement-customCement" className="block text-xs text-muted mb-1">Cement</label>
                  <input id="cement-customCement" type="number" step="0.1" name="customCement" value={customCement} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs text-ink" />
                </div>
                <div>
                  <label htmlFor="cement-customSand" className="block text-xs text-muted mb-1">Sand</label>
                  <input id="cement-customSand" type="number" step="0.1" name="customSand" value={customSand} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs text-ink" />
                </div>
                {activeApp.hasAgg && (
                  <div>
                    <label htmlFor="cement-customAggregate" className="block text-xs text-muted mb-1">Aggregate</label>
                    <input id="cement-customAggregate" type="number" step="0.1" name="customAggregate" value={customAggregate} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs text-ink" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Specs & Wastage */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">
              Specs & Wastage
            </h3>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label htmlFor="cement-wastage" className="block text-xs text-muted mb-1">Wastage Buffer</label>
                <div className="flex items-center bg-surface border border-line rounded-lg pr-2">
                  <input id="cement-wastage" type="number" step="1" name="wastage" value={wastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-ink" />
                  <span className="text-muted text-xs">%</span>
                </div>
              </div>
              <div>
                <label htmlFor="cement-bagSize" className="block text-xs text-muted mb-1">Bag Size (kg)</label>
                <input id="cement-bagSize" type="number" step="1" name="bagSize" value={bagSize} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs text-ink outline-none" />
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="p-4 rounded-lg border border-line mb-2">
            <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2 transition-colors">Rates & Operations</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                  <span className="text-xs text-muted font-medium ml-1">Cement (per bag)</span>
                  <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                      <span className="text-ink">{currency}</span>
                      <input aria-label="Cement (per bag)" type="number" name="cementPrice" value={cementPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                  </div>
              </div>
              <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                  <span className="text-xs text-muted font-medium ml-1">Sand (per ton)</span>
                  <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                      <span className="text-ink">{currency}</span>
                      <input aria-label="Sand (per ton)" type="number" name="sandPrice" value={sandPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                  </div>
              </div>
              {activeApp.hasAgg && (
                <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                    <span className="text-xs text-muted font-medium ml-1">Aggregate (per ton)</span>
                    <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                        <span className="text-ink">{currency}</span>
                        <input aria-label="Aggregate (per ton)" type="number" name="aggregatePrice" value={aggregatePrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                    </div>
                </div>
              )}
              <div className="flex items-center justify-between bg-sunken p-2 rounded-lg border border-line-control">
                  <span className="text-xs text-ink font-medium ml-1">Labor (per hr)</span>
                  <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                      <span className="text-ink">{currency}</span>
                      <input aria-label="Labor (per hr)" type="number" name="laborRate" value={laborRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full wide:w-[calc(100%-404px)] bg-surface rounded-lg border border-line flex flex-col overflow-hidden relative z-10 wide:h-[calc(100vh-140px)] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        
        {/* Top Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-line bg-surface z-30 shrink-0 print:hidden">
          <div className="flex-1 min-h-10 flex items-center">
            {results && mode === 'normal' ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 animate-fade-in">
                <div className="flex flex-col">
                  <span className="text-xs text-muted font-bold">Cement Bags</span>
                  <span className="text-lg font-semibold text-ink leading-none">{results.cementBags}</span>
                </div>
                <div className="w-px h-8 bg-line"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted font-bold">Est. Total</span>
                  <span className="text-lg font-semibold text-ink leading-none">{currency}{results.totalCost}</span>
                </div>
              </div>
            ) : mode === 'civil' ? (
              <div className="flex items-center animate-fade-in">
                <h2 className="text-lg font-bold text-ink">Financial Report</h2>
              </div>
            ) : mode === 'math' ? (
              <div className="flex items-center animate-fade-in">
                <h2 className="text-lg font-bold text-ink">Engineering Calculations</h2>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {(mode === 'civil' || mode === 'math') && (
              <button onClick={handlePrint} className="bg-sunken hover:bg-primary border border-line-control hover:border-primary text-ink hover:text-on-primary px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print
              </button>
            )}
            <div className="bg-sunken p-1 rounded-lg border border-line flex gap-1">
              <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all duration-300 ${mode === 'normal' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>3D Vis</button>
              <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all duration-300 ${mode === 'math' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>Math</button>
              <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all duration-300 ${mode === 'civil' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>Report</button>
            </div>
          </div>
        </div>

        {/* 3D View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-[#14171B] group print:hidden`}>
          <div ref={mountRef} className="absolute inset-0 cursor-move" role="img" aria-label="3D model of the current inputs. All quantities are listed in the Math and Report views."></div>
          
          <div className="absolute bottom-6 right-6 z-30 bg-sunken p-1 rounded-lg border border-line flex gap-1">
            <button onClick={triggerSimulation} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-sunken text-ink border border-line-control hover:bg-primary hover:text-on-primary mr-2">
                Simulate Stacking
            </button>
            <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-xs font-bold  transition-all ${visualTheme === 'realistic' ? 'bg-sunken text-primary border border-line-control' : 'text-muted hover:text-ink-2'}`}>Realistic</button>
            <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-xs font-bold  transition-all ${visualTheme === 'blueprint' ? 'bg-sunken text-primary border border-line-control' : 'text-muted hover:text-ink-2'}`}>Blueprint</button>
          </div>
        </div>

        {/* Math View */}
        {results && mode === 'math' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
            <div className="border-b-2 border-line pb-6 mb-8 print:border-black">
              <h2 className="text-3xl font-semibold text-ink tracking-tight">Engineering Calculations</h2>
              <p className="text-sm text-muted mt-1 font-mono">Detailed Mathematical Proof</p>
            </div>
            <div className="space-y-8 max-w-4xl mx-auto">
              
              <div className="bg-surface border border-line rounded-lg p-6 print:shadow-none print:border-black print:border-2">
                <h3 className="text-lg font-bold text-ink border-b border-line pb-3 mb-4 print:text-black">Step 1: Dry Volume of Material</h3>
                <div className="font-mono text-sm space-y-3 text-ink-2 bg-bg p-4 rounded-lg print:bg-transparent print:p-0">
                  <p><span className="text-muted print:text-black font-bold">Application</span> = {results.app.name}</p>
                  <p><span className="text-muted print:text-black font-bold">Wet Volume</span> = {results.volM3} m³ ({results.rawVolume} {unitSystem === 'ft' ? 'ft³' : 'm³'})</p>
                  <p><span className="text-muted print:text-black font-bold">Dry Factor Constant</span> = {results.app.dryFactor}</p>
                  <p><span className="text-muted print:text-black font-bold">Wastage Buffer</span> = {wastage}%</p>
                  <br/>
                  <p><span className="text-muted print:text-black font-bold">Dry Volume</span> = Wet Volume × Dry Factor × (1 + Wastage/100)</p>
                  <p><span className="text-muted print:text-black font-bold">Dry Volume</span> = {results.volM3} × {results.app.dryFactor} × {(1 + wastage/100).toFixed(2)} = <span className="font-bold text-ink">{results.dryVol} m³</span></p>
                </div>
              </div>

              <div className="bg-surface border border-line rounded-lg p-6 print:shadow-none print:border-black print:border-2">
                <h3 className="text-lg font-bold text-ink border-b border-line pb-3 mb-4 print:text-black">Step 2: Cement Quantity</h3>
                <div className="font-mono text-sm space-y-3 text-ink-2 bg-bg p-4 rounded-lg print:bg-transparent print:p-0">
                  <p><span className="text-muted print:text-black font-bold">Mix Ratio (C:S{results.app.hasAgg ? ':A' : ''})</span> = {results.mix.cement} : {results.mix.sand} {results.app.hasAgg ? `: ${results.mix.aggregate}` : ''}</p>
                  <p><span className="text-muted print:text-black font-bold">Total Parts</span> = {results.mix.cement + results.mix.sand + results.mix.aggregate}</p>
                  <br/>
                  <p><span className="text-muted print:text-black font-bold">Cement Volume</span> = (Cement Part / Total Parts) × Dry Volume</p>
                  <p><span className="text-muted print:text-black font-bold">Cement Volume</span> = ({results.mix.cement} / {results.mix.cement + results.mix.sand + results.mix.aggregate}) × {results.dryVol} = {results.cementVol} m³</p>
                  <br/>
                  <p><span className="text-muted print:text-black font-bold">Density of Cement</span> = 1440 kg/m³</p>
                  <p><span className="text-muted print:text-black font-bold">Bag Volume</span> = {bagSize} kg / 1440 kg/m³ = {(bagSize / 1440).toFixed(4)} m³ per bag</p>
                  <p><span className="text-muted print:text-black font-bold">Number of Bags</span> = {results.cementVol} / {(bagSize / 1440).toFixed(4)} = <span className="font-bold text-ink">{results.cementBags} Bags</span></p>
                </div>
              </div>

              <div className="bg-surface border border-line rounded-lg p-6 print:shadow-none print:border-black print:border-2">
                <h3 className="text-lg font-bold text-ink border-b border-line pb-3 mb-4 print:text-black">Step 3: Sand {results.app.hasAgg && '& Aggregate'}</h3>
                <div className="font-mono text-sm space-y-3 text-ink-2 bg-bg p-4 rounded-lg print:bg-transparent print:p-0">
                  <p><span className="text-muted print:text-black font-bold">Sand Volume</span> = ({results.mix.sand} / {results.mix.cement + results.mix.sand + results.mix.aggregate}) × {results.dryVol} = {results.sandVol} m³</p>
                  <p><span className="text-muted print:text-black font-bold">Sand Weight</span> = {results.sandVol} × 1500 kg/m³ = {(results.sandVol * 1500).toFixed(0)} kg → <span className="font-bold text-ink">{results.sandTons} Tons</span></p>
                  
                  {results.app.hasAgg && (
                    <>
                      <br/>
                      <p><span className="text-muted print:text-black font-bold">Aggregate Volume</span> = ({results.mix.aggregate} / {results.mix.cement + results.mix.sand + results.mix.aggregate}) × {results.dryVol} = {results.aggregateVol} m³</p>
                      <p><span className="text-muted print:text-black font-bold">Aggregate Weight</span> = {results.aggregateVol} × 1600 kg/m³ = {(results.aggregateVol * 1600).toFixed(0)} kg → <span className="font-bold text-ink">{results.aggregateTons} Tons</span></p>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Report View */}
        {results && mode === 'civil' && (
          <div className="flex-1 flex flex-col bg-bg overflow-hidden relative animate-fade-in print:bg-white print:p-0 print:overflow-visible print:h-auto print:w-full print:block">
            <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink print:text-black print:p-0 print:overflow-visible print:h-auto print:w-full">
              <div className="border-b-2 border-line pb-6 mb-8 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-semibold text-ink tracking-tight">Material Estimate</h2>
                  <p className="text-sm text-muted mt-1 font-mono">Generated by CivisMetric Engine</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted font-bold print:text-black">Grand Total</p>
                  <p className="text-4xl font-semibold text-ink font-mono print:text-black">{currency}{results.totalCost}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:block">
                <div className="print:mb-6">
                  <h3 className="text-xs font-bold text-muted mb-3 border-b border-line pb-1 print:text-black">Project Specifications</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Application</th><td className="py-2 font-medium text-right">{results.app.name}</td></tr>
                      <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Volume</th><td className="py-2 font-medium text-right">{results.rawVolume} {unitSystem === 'ft' ? 'ft³' : 'm³'}</td></tr>
                      <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Mix Ratio</th><td className="py-2 font-medium text-right">{results.mix.label}</td></tr>
                      <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Wastage Buffer</th><td className="py-2 font-medium text-right">{wastage}%</td></tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-muted mb-3 border-b border-line pb-1 print:text-black">Material Quantities</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Cement ({bagSize}kg)</th><td className="py-2 font-medium text-right text-primary print:text-black">{results.cementBags} bags</td></tr>
                      <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Sand</th><td className="py-2 font-medium text-right">{results.sandTons} tons</td></tr>
                      {results.app.hasAgg && <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Aggregate</th><td className="py-2 font-medium text-right">{results.aggregateTons} tons</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 className="text-xs font-bold text-muted mb-3 border-b border-line pb-1 print:text-black">Itemized Cost Breakdown</h3>
              <div className="bg-surface border border-line rounded-lg overflow-hidden mb-8 print:border-black print:shadow-none">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-bg text-muted text-xs uppercase tracking-wider print:bg-transparent print:text-black print:border-b print:border-black">
                    <tr><th scope="col" className="p-4 font-semibold">Item</th><th scope="col" className="p-4 font-semibold">Quantity</th><th scope="col" className="p-4 font-semibold">Rate</th><th scope="col" className="p-4 font-semibold text-right">Amount</th></tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-line print:divide-slate-300">
                    <tr><td className="p-4 font-bold text-ink">Cement</td><td className="p-4 font-mono">{results.cementBags} bags</td><td className="p-4 font-mono">{currency}{cementPrice}/bag</td><td className="p-4 font-mono font-bold text-right">{currency}{results.costCement}</td></tr>
                    <tr><td className="p-4 font-bold text-ink">River Sand</td><td className="p-4 font-mono">{results.sandTons} tons</td><td className="p-4 font-mono">{currency}{sandPrice}/ton</td><td className="p-4 font-mono font-bold text-right">{currency}{results.costSand}</td></tr>
                    {results.app.hasAgg && <tr><td className="p-4 font-bold text-ink">Coarse Aggregate</td><td className="p-4 font-mono">{results.aggregateTons} tons</td><td className="p-4 font-mono">{currency}{aggregatePrice}/ton</td><td className="p-4 font-mono font-bold text-right">{currency}{results.costAggregate}</td></tr>}
                    <tr className="bg-bg print:bg-transparent"><td className="p-4 font-bold text-ink">Skilled Labor</td><td className="p-4 font-mono">Est. {(results.volM3 * (results.app.id === 'plaster' ? 1.5 : 0.8)).toFixed(1)} hrs</td><td className="p-4 font-mono">{currency}{laborRate}/hr</td><td className="p-4 font-mono font-bold text-right">{currency}{results.laborCost}</td></tr>
                  </tbody>
                  <tfoot className="bg-sunken print:bg-transparent print:border-t-2 print:border-black">
                    <tr><td colSpan="3" className="p-4 text-right font-bold text-ink text-xs print:text-black">Total Cost</td><td className="p-4 font-mono font-semibold text-ink text-xl text-right print:text-black">{currency}{results.totalCost}</td></tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-muted text-center italic print:hidden">* Estimates are approximate. Actual costs may vary based on site conditions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}