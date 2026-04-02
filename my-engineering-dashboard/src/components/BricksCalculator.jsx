import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'in': 0.0254, 'cm': 0.01, 'mm': 0.001 };

// Expanded brick library with precise base colors
const brickTypes = [
  { name: 'Standard India (Red Clay)', l: 19, w: 9, h: 9, unit: 'cm', color: '#c9402a' },
  { name: 'Fly Ash Brick', l: 23, w: 11, h: 7.6, unit: 'cm', color: '#8b5a2b' },
  { name: 'Concrete Brick', l: 20, w: 10, h: 10, unit: 'cm', color: '#808080' },
  { name: 'Solid Concrete Block', l: 40, w: 20, h: 20, unit: 'cm', color: '#a0a0a0' },
  { name: 'Hollow Concrete Block', l: 40, w: 20, h: 20, unit: 'cm', color: '#c0c0c0' },
  { name: 'US Modular', l: 7.625, w: 3.625, h: 2.25, unit: 'in', color: '#b87333' },
  { name: 'UK Standard', l: 215, w: 102.5, h: 65, unit: 'mm', color: '#9c6e3e' },
  { name: 'Australia Standard', l: 230, w: 110, h: 76, unit: 'mm', color: '#b5704b' }
];

export default function BricksCalculator() {
  // --- Core Inputs ---
  const [unitSystem, setUnitSystem] = useState('ft'); 
  const [inputs, setInputs] = useState({
    wallL: 15, wallH: 10, wallT: 0.75,
    ratio: 5,
    brickWastage: 5,     
    brickPrice: 8,       
    cementPrice: 400,    
    sandPrice: 1500,
    laborRate: 1200,     
    currency: '₹'
  });

  const [selectedBrick, setSelectedBrick] = useState(brickTypes[0]);

  // --- Openings Engine ---
  const [openings, setOpenings] = useState([]);
  const [newOpening, setNewOpening] = useState({ type: 'door', width: 3, height: 7, posX: 7.5, posY: 3.5 });

  // --- UI State ---
  const [mode, setMode] = useState('normal'); 
  const [visualTheme, setVisualTheme] = useState('realistic'); 
  const [results, setResults] = useState(null);
  const [visualWarning, setVisualWarning] = useState("");
  
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
    setInputs(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleBrickChange = (e) => {
    const brick = brickTypes.find(b => b.name === e.target.value);
    setSelectedBrick(brick);
  };

  const addOpening = () => {
    if (newOpening.width > 0 && newOpening.height > 0) {
      setOpenings([...openings, { ...newOpening }]);
    }
  };

  const removeOpening = (index) => {
    setOpenings(openings.filter((_, i) => i !== index));
  };

  const handlePrint = () => window.print();

  // --- Initialize Three.js Scene ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null; 
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02); 
    sceneRef.current = scene;

    const container = mountRef.current;
    
    // Fallback to 800x500 if container hasn't painted yet
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
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
    controls.maxDistance = 300; 
    controls.minDistance = 0.5;
    controls.autoRotate = true; 
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5); 
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.8);
    rimLight.position.set(-15, -5, -15);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(100, 100, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = -0.01; 
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);

    const dummy = new THREE.Object3D();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update(); 

      if (instancedMeshRef.current && animationDataRef.current.length > 0) {
        let stillAnimating = false;
        animationDataRef.current.forEach((data) => {
          if (data.currentY > data.targetY) {
            stillAnimating = true;
            data.currentY -= data.speed; 
            if (data.currentY <= data.targetY) data.currentY = data.targetY;
            dummy.position.set(data.x, data.currentY, data.z);
            dummy.updateMatrix();
            instancedMeshRef.current.setMatrixAt(data.index, dummy.matrix);
          }
        });
        if (stillAnimating) {
          instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        } else {
          animationDataRef.current = [];
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    // Robust Centralized Resize Handler
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
    
    // Force one more check shortly after mount
    setTimeout(handleResize, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Recalculate dimensions immediately when switching back to 3D View
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
      }, 50); // 50ms gives React time to un-hide the container
    }
  }, [mode]);

  // --- Dynamic Core Calculation ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 300);
    return () => clearTimeout(handler);
  }, [inputs, selectedBrick, unitSystem, openings, visualTheme]);

  const calculateAndRender = () => {
    const { wallL, wallH, wallT, ratio, brickWastage, brickPrice, cementPrice, sandPrice, laborRate } = inputs;
    const scene = sceneRef.current;
    
    // Fail-safes: Don't crash Three.js if user deletes an input making it 0
    if(!wallL || !wallH || !wallT || !scene) {
        if (instancedMeshRef.current) { 
            scene?.remove(instancedMeshRef.current); 
            instancedMeshRef.current.dispose(); 
            instancedMeshRef.current = null;
        }
        return;
    }

    const wMult = unitToMeter[unitSystem];
    const wL_m = wallL * wMult;
    const wH_m = wallH * wMult;
    const wT_m = wallT * wMult;
    
    let openings_m2 = 0;
    openings.forEach(open => {
        openings_m2 += (open.width * wMult) * (open.height * wMult);
    });
    
    const totalWallArea_m2 = wL_m * wH_m;
    if (openings_m2 > totalWallArea_m2 * 0.9) openings_m2 = totalWallArea_m2 * 0.9;
    const netWallArea_m2 = totalWallArea_m2 - openings_m2;

    const bMult = unitToMeter[selectedBrick.unit];
    const bL_m = selectedBrick.l * bMult;
    const bW_m = selectedBrick.w * bMult;
    const bH_m = selectedBrick.h * bMult;
    const mT_m = 0.01; 
    const sumRatio = 1 + ratio;

    const volWall = netWallArea_m2 * wT_m;
    const volBrickWithoutMortar = bL_m * bW_m * bH_m;
    const volBrickWithMortar = (bL_m + mT_m) * (bW_m + mT_m) * (bH_m + mT_m);
    
    if (volBrickWithMortar <= 0 || volWall <= 0) return;

    const noOfBricksExact = volWall / volBrickWithMortar;
    const noOfBricksToOrder = Math.ceil(noOfBricksExact * (1 + (brickWastage / 100)));
    
    const volBricksOnly = noOfBricksExact * volBrickWithoutMortar;
    let volMortarWet = Math.max(0, volWall - volBricksOnly);
    
    const mortarFrogWastage = volMortarWet * 0.15;
    const mortarDryConversion = (volMortarWet + mortarFrogWastage) * 0.25;
    const volMortarDry = volMortarWet + mortarFrogWastage + mortarDryConversion; 

    const cementVol = volMortarDry * (1 / sumRatio);
    const cementBagsExact = cementVol / 0.035;
    const cementBagsBuy = Math.ceil(cementBagsExact);
    const cementKg = cementBagsExact * 50;
    
    const sandVol = volMortarDry * (ratio / sumRatio);
    const sandKg = sandVol * 1500;
    const sandTons = sandKg / 1000;

    const laborDays = Math.ceil(noOfBricksExact / 600);
    const costLabor = laborDays * laborRate;

    const costBricks = noOfBricksToOrder * brickPrice;
    const costCement = cementBagsBuy * cementPrice;
    const costSand = sandTons * sandPrice;
    const totalMaterialCost = costBricks + costCement + costSand;
    const grandTotal = totalMaterialCost + costLabor;

    // --- 3D Scene Assembly ---
    if (instancedMeshRef.current) { 
        scene.remove(instancedMeshRef.current); 
        instancedMeshRef.current.dispose(); 
    }

    // Protection against NaN/Infinity causing rendering crashes
    const rows = Math.max(1, Math.floor(wH_m / (bH_m + mT_m)) || 1);
    const cols = Math.max(1, Math.floor(wL_m / (bL_m + mT_m)) || 1);
    const depthLayers = Math.max(1, Math.round(wT_m / bW_m) || 1);
    
    let renderRows = rows, renderCols = cols, renderDepth = depthLayers;
    let theoreticalBricks = renderRows * renderCols * renderDepth;

    if (theoreticalBricks > 30000) {
        setVisualWarning(`Massive Scale! 3D Visualizer capped to prevent lagging. Math remains exact.`);
        const scaleFactor = Math.pow(30000 / theoreticalBricks, 1/3);
        renderRows = Math.max(1, Math.floor(rows * scaleFactor));
        renderCols = Math.max(1, Math.floor(cols * scaleFactor));
        renderDepth = Math.max(1, Math.floor(depthLayers * scaleFactor));
        theoreticalBricks = renderRows * renderCols * renderDepth;
    } else {
        setVisualWarning("");
    }

    const shouldAnimate = theoreticalBricks < 10000; 
    const isBlueprint = visualTheme === 'blueprint';
    const geometry = new THREE.BoxGeometry(bL_m * 0.96, bH_m * 0.96, bW_m * 0.96); 
    
    const material = new THREE.MeshStandardMaterial(
        isBlueprint 
        ? { color: 0x0284c7, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.8 }
        : { color: 0xffffff, roughness: 0.8, metalness: 0.1 }
    );
    
    const mesh = new THREE.InstancedMesh(geometry, material, theoreticalBricks); 
    if(!isBlueprint) { mesh.castShadow = true; mesh.receiveShadow = true; }
    scene.add(mesh);
    instancedMeshRef.current = mesh;

    const actualWidth = renderCols * (bL_m + mT_m);
    const actualHeight = renderRows * (bH_m + mT_m);
    const actualDepth = renderDepth * (bW_m + mT_m);

    const offsetX = - (actualWidth / 2) + ((bL_m + mT_m) / 2);
    const offsetY = (bH_m / 2); 
    const offsetZ = - (actualDepth / 2) + (bW_m / 2);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const baseColor = new THREE.Color(selectedBrick.color);
    const animData = [];
    let actualRenderCount = 0;

    for (let z = 0; z < renderDepth; z++) {
      for (let y = 0; y < renderRows; y++) {
        const isEvenRow = y % 2 === 0;
        const rowCols = isEvenRow ? renderCols : Math.max(1, renderCols - 1);

        for (let x = 0; x < rowCols; x++) {
          let xPos = offsetX + (x * (bL_m + mT_m));
          if (!isEvenRow) xPos += ((bL_m + mT_m) / 2); 

          const targetY = offsetY + (y * (bH_m + mT_m));
          const zPos = offsetZ + (z * (bW_m + mT_m));

          const brickMinX = xPos - (bL_m/2);
          const brickMaxX = xPos + (bL_m/2);
          const brickMinY = targetY - (bH_m/2);
          const brickMaxY = targetY + (bH_m/2);

          let isInsideCutout = false;
          for (const open of openings) {
            const openWidthM = open.width * wMult;
            const openHeightM = open.height * wMult;
            
            const openCenterX = -(actualWidth / 2) + (open.posX * wMult);
            const openCenterY = (open.posY * wMult);

            const openMinX = openCenterX - (openWidthM / 2);
            const openMaxX = openCenterX + (openWidthM / 2);
            const openMinY = openCenterY - (openHeightM / 2);
            const openMaxY = openCenterY + (openHeightM / 2);

            if (brickMaxX > openMinX && brickMinX < openMaxX && brickMaxY > openMinY && brickMinY < openMaxY) {
                isInsideCutout = true;
                break;
            }
          }
          
          if (!isInsideCutout) {
            if (shouldAnimate) {
                const startY = targetY + 4 + (x * 0.05) + (y * 0.1); 
                animData.push({ index: actualRenderCount, x: xPos, z: zPos, targetY, currentY: startY, speed: 0.3 + (Math.random() * 0.2) });
                dummy.position.set(xPos, startY, zPos);
            } else {
                dummy.position.set(xPos, targetY, zPos);
            }

            dummy.updateMatrix();
            mesh.setMatrixAt(actualRenderCount, dummy.matrix);
            
            if (!isBlueprint) {
                const shadePerturbation = (Math.random() - 0.5) * 0.15; 
                color.copy(baseColor).offsetHSL(0, 0, shadePerturbation);
                mesh.setColorAt(actualRenderCount, color);
            } else {
                color.set('#0ea5e9'); 
                mesh.setColorAt(actualRenderCount, color);
            }

            actualRenderCount++;
          }
        }
      }
    }
    
    // Prevent crashes if actualRenderCount drops to 0 due to massive cutouts
    if (actualRenderCount === 0) {
        scene.remove(mesh);
        setResults(null);
        return;
    }

    mesh.count = actualRenderCount;
    mesh.instanceMatrix.needsUpdate = true;
    if(mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    animationDataRef.current = animData;

    const maxDim = Math.max(actualWidth, actualHeight, actualDepth);
    cameraRef.current.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.8);
    controlsRef.current.target.set(0, actualHeight / 2, 0); 
    
    if(isBlueprint) {
        sceneRef.current.fog.color.setHex(0x0a192f);
    } else {
        sceneRef.current.fog.color.setHex(0x0f172a);
    }
    sceneRef.current.fog.density = 0.05 / Math.max(1, maxDim);

    setResults({
      wL_m, wH_m, wT_m, openings_m2, bL_m, bW_m, bH_m, mT_m, sumRatio, totalWallArea_m2,
      volWall, netWallArea_m2, volWallCft: volWall * 35.3147, 
      volBrickWithoutMortar, volBrickWithMortar, 
      noOfBricksExact, noOfBricksToOrder, volBricksOnly,
      volMortarWet, mortarFrogWastage, mortarDryConversion, volMortarDry, 
      cementVol, cementBagsExact, cementBagsBuy, cementKg, sandVol, sandKg, sandTons,
      costBricks, costCement, costSand, totalMaterialCost, laborDays, costLabor, grandTotal
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 md:p-6 bg-[#020617] text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block">
      
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none print:hidden"></div>

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[380px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 text-lg">🧱</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">CivisMetric</h2>
                  <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest">Estimation Engine</p>
                </div>
            </div>
            <select name="currency" value={inputs.currency} onChange={handleInputChange} className="bg-slate-800/80 border border-slate-600/50 rounded-lg py-1 px-2 text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-cyan-400 font-bold transition-all cursor-pointer">
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
                <option value="£">£ GBP</option>
            </select>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            
            {/* Dimensions Card */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-400 transition-colors"><span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>Geometry</h3>
                    <select value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-cyan-500 transition-all">
                        <option value="m">Meters (m)</option>
                        <option value="ft">Feet (ft)</option>
                    </select>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length</label>
                      <input type="number" step="0.1" name="wallL" value={inputs.wallL} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Height</label>
                      <input type="number" step="0.1" name="wallH" value={inputs.wallH} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Thick</label>
                      <input type="number" step="0.1" name="wallT" value={inputs.wallT} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
                    </div>
                </div>
                
                <div className="pt-3 border-t border-slate-700/50">
                    <label className="flex justify-between items-center text-[10px] text-slate-300 uppercase mb-2">
                        <span>Physical Openings</span>
                        <span className="text-cyan-500 font-mono text-[9px]">{openings.length} Active</span>
                    </label>
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 mb-2">
                        <div className="flex gap-1 mb-2">
                            <button onClick={() => setNewOpening({...newOpening, type: 'door'})} className={`flex-1 py-1 text-[10px] rounded uppercase font-bold transition-all ${newOpening.type === 'door' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Door</button>
                            <button onClick={() => setNewOpening({...newOpening, type: 'window'})} className={`flex-1 py-1 text-[10px] rounded uppercase font-bold transition-all ${newOpening.type === 'window' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Window</button>
                        </div>
                        <div className="grid grid-cols-4 gap-1 mb-2">
                             <div><label className="block text-[8px] text-slate-500 uppercase">W ({unitSystem})</label><input type="number" value={newOpening.width} onChange={(e)=>setNewOpening({...newOpening, width: parseFloat(e.target.value)||0})} className="w-full bg-slate-800 text-white text-xs p-1 rounded text-center outline-none border border-slate-700 focus:border-cyan-500"/></div>
                             <div><label className="block text-[8px] text-slate-500 uppercase">H ({unitSystem})</label><input type="number" value={newOpening.height} onChange={(e)=>setNewOpening({...newOpening, height: parseFloat(e.target.value)||0})} className="w-full bg-slate-800 text-white text-xs p-1 rounded text-center outline-none border border-slate-700 focus:border-cyan-500"/></div>
                             <div><label className="block text-[8px] text-slate-500 uppercase">Ctr X</label><input type="number" value={newOpening.posX} onChange={(e)=>setNewOpening({...newOpening, posX: parseFloat(e.target.value)||0})} className="w-full bg-slate-800 text-white text-xs p-1 rounded text-center outline-none border border-slate-700 focus:border-cyan-500"/></div>
                             <div><label className="block text-[8px] text-slate-500 uppercase">Ctr Y</label><input type="number" value={newOpening.posY} onChange={(e)=>setNewOpening({...newOpening, posY: parseFloat(e.target.value)||0})} className="w-full bg-slate-800 text-white text-xs p-1 rounded text-center outline-none border border-slate-700 focus:border-cyan-500"/></div>
                        </div>
                        <button onClick={addOpening} className="w-full bg-slate-800 hover:bg-cyan-500/20 border border-slate-600 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 py-1 text-[10px] uppercase tracking-widest rounded transition-all">Add Cutout</button>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto custom-scroll pr-1">
                        {openings.map((op, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-900/80 px-2 py-1.5 rounded border border-slate-700/50">
                                <span className={`text-[10px] font-bold uppercase ${op.type==='door'?'text-emerald-400':'text-blue-400'}`}>{op.type}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{op.width}x{op.height} @ {op.posX},{op.posY}</span>
                                <button onClick={()=>removeOpening(i)} className="text-red-400 hover:text-red-300 font-bold text-xs">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Brick & Mortar Card */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-orange-400 transition-colors"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>Materials</h3>
                    <select value={selectedBrick.name} onChange={handleBrickChange} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-orange-500 transition-all max-w-[120px] truncate">
                        {brickTypes.map((b) => (<option key={b.name} value={b.name}>{b.name}</option>))}
                    </select>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-1 uppercase text-center">L ({selectedBrick.unit})</label>
                    <div className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 text-xs text-center text-slate-400 font-mono">{selectedBrick.l}</div>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-1 uppercase text-center">W ({selectedBrick.unit})</label>
                    <div className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 text-xs text-center text-slate-400 font-mono">{selectedBrick.w}</div>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-1 uppercase text-center">H ({selectedBrick.unit})</label>
                    <div className="w-full bg-slate-900/50 border border-slate-700/80 rounded-lg p-2 text-xs text-center text-slate-400 font-mono">{selectedBrick.h}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Mortar Ratio (C:S)</label>
                        <select name="ratio" value={inputs.ratio} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs outline-none cursor-pointer focus:ring-1 focus:ring-orange-500 text-white">
                            <option value="4">1:4 (Heavy)</option>
                            <option value="5">1:5 (Std)</option>
                            <option value="6">1:6 (Light)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">Wastage Buffer</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-orange-500">
                            <input type="number" name="brickWastage" value={inputs.brickWastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial & Ops Card */}
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group mb-2">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Rates & Operations</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Brick (1 unit)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="brickPrice" value={inputs.brickPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Cement (Bag)</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="cementPrice" value={inputs.cementPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Sand (Ton)</span>
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
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Req. Bricks</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 leading-none">{results.noOfBricksToOrder.toLocaleString()}</span>
                       </div>
                       <div className="w-px h-8 bg-slate-700"></div>
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Est. Total</span>
                           <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotal.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                       </div>
                    </div>
                ) : mode === 'civil' ? (
                    <div className="flex items-center animate-fade-in">
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest">Financial Report</h2>
                    </div>
                ) : mode === 'math' ? (
                    <div className="flex items-center animate-fade-in">
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest">Engineering Calculations</h2>
                    </div>
                ) : null}
            </div>

            {/* Right Side: Actions & Toggles */}
            <div className="flex items-center gap-3 shrink-0">
                {(mode === 'civil' || mode === 'math') && (
                    <button onClick={handlePrint} className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                       Print
                    </button>
                )}

                <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
                    <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'normal' ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
                    <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'math' ? 'bg-blue-500 text-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
                    <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${mode === 'civil' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>Report</button>
                </div>
            </div>
        </div>

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] group print:hidden`}>
            <div ref={mountRef} className="absolute inset-0 cursor-move"></div>
            
            {/* Theme Toggle */}
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Realistic</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}>Blueprint</button>
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
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Engineering Calculations</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Detailed Mathematical Proof (Base Unit: Meters)</p>
              </div>

              <div className="space-y-8 max-w-4xl mx-auto">
                 {/* Step 1 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-cyan-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 1: Volume of Brick Masonry</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Total Wall Area</span> = Length (m) × Height (m)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Total Wall Area</span> = {results.wL_m.toFixed(4)} × {results.wH_m.toFixed(4)} = <span className="font-bold text-slate-900">{results.totalWallArea_m2.toFixed(4)} m²</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Openings Subtracted</span> = {results.openings_m2.toFixed(4)} m²</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Net Wall Area</span> = {results.totalWallArea_m2.toFixed(4)} - {results.openings_m2.toFixed(4)} = <span className="font-bold text-slate-900">{results.netWallArea_m2.toFixed(4)} m²</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Volume of Brick Masonry (V)</span> = Net Wall Area × Wall Thickness (m)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">V</span> = {results.netWallArea_m2.toFixed(4)} × {results.wT_m.toFixed(4)}</p>
                        <p className="text-cyan-700 print:text-black font-bold text-base mt-2">V = {results.volWall.toFixed(4)} m³</p>
                    </div>
                 </div>

                 {/* Step 2 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-orange-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 2: Number of Bricks Calculation</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Size of 1 Brick (without mortar)</span> = {results.bL_m.toFixed(3)}m × {results.bW_m.toFixed(3)}m × {results.bH_m.toFixed(3)}m = <span className="font-bold text-slate-900">{results.volBrickWithoutMortar.toFixed(5)} m³</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Size of 1 Brick (with {results.mT_m}m mortar)</span> = {(results.bL_m + results.mT_m).toFixed(3)}m × {(results.bW_m + results.mT_m).toFixed(3)}m × {(results.bH_m + results.mT_m).toFixed(3)}m</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Volume of 1 Brick with mortar</span> = <span className="font-bold text-slate-900">{results.volBrickWithMortar.toFixed(5)} m³</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">No. of Bricks</span> = Volume of Brick Masonry / Volume of 1 Brick with mortar</p>
                        <p><span className="text-slate-400 print:text-black font-bold">No. of Bricks</span> = {results.volWall.toFixed(4)} / {results.volBrickWithMortar.toFixed(5)} = <span className="font-bold text-slate-900">{results.noOfBricksExact.toFixed(2)} Bricks</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Add {inputs.brickWastage}% for Wastage</span> = {results.noOfBricksExact.toFixed(2)} × {(1 + inputs.brickWastage/100).toFixed(2)}</p>
                        <p className="text-orange-700 print:text-black font-bold text-base mt-2">Total Bricks Required = {results.noOfBricksToOrder.toLocaleString()} Bricks</p>
                    </div>
                 </div>

                 {/* Step 3 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-indigo-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 3: Mortar Volume Calculation</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Volume covered by bricks only</span> = Exact No. of Bricks × Volume of 1 Brick (without mortar)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Volume of Bricks</span> = {results.noOfBricksExact.toFixed(2)} × {results.volBrickWithoutMortar.toFixed(5)} = <span className="font-bold text-slate-900">{results.volBricksOnly.toFixed(4)} m³</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Wet Volume of Mortar</span> = Total Volume (V) - Volume of Bricks</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Wet Volume of Mortar</span> = {results.volWall.toFixed(4)} - {results.volBricksOnly.toFixed(4)} = <span className="font-bold text-slate-900">{results.volMortarWet.toFixed(4)} m³</span></p>
                        <br/>
                        <p className="text-xs text-slate-500 italic print:text-black">// Industry standard: Add 15% for frog filling & wastage, then 25% to convert wet volume to dry volume.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Add 15% for Frog & Wastage</span> = {results.volMortarWet.toFixed(4)} + {results.mortarFrogWastage.toFixed(4)} = {(results.volMortarWet + results.mortarFrogWastage).toFixed(4)} m³</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Add 25% for Dry Volume</span> = {(results.volMortarWet + results.mortarFrogWastage).toFixed(4)} + {results.mortarDryConversion.toFixed(4)}</p>
                        <p className="text-indigo-700 print:text-black font-bold text-base mt-2">Dry Volume of Mortar = {results.volMortarDry.toFixed(4)} m³</p>
                    </div>
                 </div>

                 {/* Step 4 */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-emerald-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 4: Cement & Sand Calculation (Ratio 1:{inputs.ratio})</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">Sum of Ratio</span> = 1 + {inputs.ratio} = <span className="font-bold text-slate-900">{results.sumRatio}</span></p>
                        <br/>
                        <div className="border-l-4 border-emerald-500 pl-4 py-1 print:border-black print:border-l-2">
                            <p className="font-bold text-slate-900 mb-2">Amount of Cement:</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Cement Volume</span> = (1 / Sum of Ratio) × Dry Volume</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Cement Volume</span> = (1 / {results.sumRatio}) × {results.volMortarDry.toFixed(4)} = <span className="font-bold text-slate-900">{results.cementVol.toFixed(4)} m³</span></p>
                            <p className="text-xs text-slate-500 italic mt-1 print:text-black">// Note: 1 Bag of cement = 0.035 m³ (50 kg)</p>
                            <p><span className="text-slate-400 print:text-black font-bold">No. of Cement Bags</span> = {results.cementVol.toFixed(4)} / 0.035</p>
                            <p className="text-emerald-700 print:text-black font-bold text-base mt-2">Total Cement = {results.cementBagsExact.toFixed(2)} Bags</p>
                        </div>
                        <br/>
                        <div className="border-l-4 border-yellow-500 pl-4 py-1 print:border-black print:border-l-2">
                            <p className="font-bold text-slate-900 mb-2">Amount of Sand:</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Sand Volume</span> = ({inputs.ratio} / Sum of Ratio) × Dry Volume</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Sand Volume</span> = ({inputs.ratio} / {results.sumRatio}) × {results.volMortarDry.toFixed(4)} = <span className="font-bold text-slate-900">{results.sandVol.toFixed(4)} m³</span></p>
                            <p className="text-xs text-slate-500 italic mt-1 print:text-black">// Note: Density of dry loose sand ≈ 1500 kg/m³</p>
                            <p><span className="text-slate-400 print:text-black font-bold">Sand Weight (kg)</span> = {results.sandVol.toFixed(4)} × 1500</p>
                            <p className="text-yellow-600 print:text-black font-bold text-base mt-2">Total Sand = {results.sandKg.toFixed(2)} kg ({results.sandTons.toFixed(2)} Tons)</p>
                        </div>
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
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Wall Dimensions</td><td className="py-2 font-medium text-right">{inputs.wallL}×{inputs.wallH}×{inputs.wallT} {unitSystem}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Openings Cutouts ({openings.length})</td><td className="py-2 font-medium text-right text-rose-500 print:text-black">- {results.openings_m2.toFixed(2)} m²</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Net Construction Vol</td><td className="py-2 font-medium text-right">{results.volWall.toFixed(2)} m³</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Brick Material</td><td className="py-2 font-medium text-right capitalize">{selectedBrick.name}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Material Requirements</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Exact Bricks Calculated</td><td className="py-2 font-medium text-right">{results.noOfBricksExact.toLocaleString('en-US', {maximumFractionDigits:0})} units</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Wastage Buffer</td><td className="py-2 font-medium text-right text-orange-500 print:text-black">+ {inputs.brickWastage}%</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Dry Mortar Vol (1:{inputs.ratio})</td><td className="py-2 font-medium text-right">{results.volMortarDry.toFixed(2)} m³</td></tr>
                                <tr><td className="py-2 text-slate-500 print:text-black">Est. Labor Time</td><td className="py-2 font-medium text-right">{results.laborDays} Crew Days</td></tr>
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
                                <td className="p-4"><p className="font-bold text-slate-800">{selectedBrick.name}</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Includes {inputs.brickWastage}% wastage buffer</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.noOfBricksToOrder.toLocaleString()} units</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.brickPrice}/unit</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costBricks.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">Portland Cement</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Rounded up to whole 50kg bags</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.cementBagsBuy} bags</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.cementPrice}/bag</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costCement.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">River Sand</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Ratio 1 Cement : {inputs.ratio} Sand</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.sandTons.toFixed(2)} tons</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.sandPrice}/ton</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costSand.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr className="bg-slate-50/50 print:bg-transparent">
                                <td className="p-4"><p className="font-bold text-slate-800">Labor & Crew Operations</p><p className="text-xs text-slate-500 mt-0.5 print:text-black">Est. 600 bricks / crew / day</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{results.laborDays} days</td>
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
                
                <p className="text-xs text-slate-400 text-center italic print:hidden">* This is an automated estimate. Actual costs may vary based on site conditions, transportation, and local market fluctuations.</p>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}