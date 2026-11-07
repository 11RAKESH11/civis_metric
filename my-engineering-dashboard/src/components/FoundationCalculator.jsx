import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';
import { useUnit } from '../context/UnitContext.jsx';
import { useCad } from '../context/CadContext.jsx';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254 };

const foundationTypes = [
  { value: 'slab', label: 'Slab-on-Grade' },
  { value: 'stem', label: 'Stem Wall' },
  { value: 'tshaped', label: 'T-Shaped' },
  { value: 'frost', label: 'Frost Wall' },
  { value: 'stone', label: 'Stone Foundation' },
];

// Authentic Real-World Material Colors
const COLORS = {
    DRY_CONCRETE: 0x9ca3af,
    WET_CONCRETE: 0x4b5563,
    PCC_BLINDING: 0x78716c,
    SOIL_PIT: 0x5c4033, // Earth dirt color
    GRASSLAND: 0x3f4a30, // Green grass
    BLUEPRINT_STRUCT: 0x0ea5e9,
    BLUEPRINT_PCC: 0x3b82f6,
    BLUEPRINT_PIT: 0xf59e0b
};

export default function FoundationCalculator() {
  const { addToCad } = useCad();
  const { unitSystem: globalUnitSystem } = useUnit();
  // --- Core Inputs (Strictly Foundation) ---
  const [unitSystem, setUnitSystem] = useState(globalUnitSystem === 'imperial' ? 'ft' : 'm');
  // Follow the header's Metric/Imperial switch when it changes; the local selector can still override.
  const [syncedGlobalUnit, setSyncedGlobalUnit] = useState(globalUnitSystem);
  if (globalUnitSystem !== syncedGlobalUnit) {
    setSyncedGlobalUnit(globalUnitSystem);
    setUnitSystem(globalUnitSystem === 'imperial' ? 'ft' : 'm');
  }
  const [inputs, setInputs] = useState({
    length: 20, width: 15, thickness: 6, 
    excavationDepth: 3, overdig: 2, pccThickness: 4, 
    stemHeight: 24, footingWidth: 24, footingDepth: 12,
    concreteWastage: 5, rebarWastage: 5,
    concretePrice: 120, pccPrice: 90, rebarPrice: 0.8,
    formworkPrice: 15, excavationRate: 25, laborRate: 200,
    currency: '₹'
  });

  const [foundationType, setFoundationType] = useState('slab');

  // --- UI & Anim State ---
  const [mode, setMode] = useState('normal'); 
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);
  
  // --- 3D Refs ---
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);
  
  // Scene Objects for Animation
  const sceneObjectsRef = useRef({ pccMesh: null, foundationGroup: null, particles: null });
  const animationDataRef = useRef([]);
  const animStateRef = useRef({ active: false, startTime: 0 });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = ['currency'].includes(name) ? value : parseFloat(value) || 0;
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

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 2000);
    camera.position.set(15, 10, 15); // Prevent black screen on load
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
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
    // NO maxPolarAngle -> Full 360 rotation enabled!
    controls.maxDistance = 300;
    controls.minDistance = 0.5;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // Realistic Lighting
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
    const dummy = new THREE.Object3D();
    
    // --- The Master Render & Animation Loop ---
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      if (animStateRef.current.active && sceneObjectsRef.current.foundationGroup) {
          const { pccMesh, foundationGroup, particles } = sceneObjectsRef.current;
          const elapsed = (Date.now() - animStateRef.current.startTime) / 1000;

          // 1. Dirt Animation
          if (particles && animationDataRef.current.length > 0) {
              let particlesActive = false;
              animationDataRef.current.forEach((p, i) => {
                  if (p.t < 1) {
                      particlesActive = true;
                      p.t += p.speed;
                      if (p.t < 0) {
                          dummy.position.set(0, -9999, 0);
                          dummy.scale.setScalar(0.001);
                      } else {
                          let clampedT = Math.min(1, p.t);
                          const currentX = p.startX + (p.endX - p.startX) * clampedT;
                          const currentZ = p.startZ + (p.endZ - p.startZ) * clampedT;
                          const height = Math.sin(clampedT * Math.PI) * p.arcHeight;
                          const currentY = p.startY + (p.endY - p.startY) * clampedT + height;

                          dummy.position.set(currentX, currentY, currentZ);
                          dummy.rotation.set(clampedT * Math.PI * 4, clampedT * Math.PI * 2, 0);
                          dummy.scale.setScalar(p.scale);
                      }
                      dummy.updateMatrix();
                      particles.setMatrixAt(i, dummy.matrix);
                  }
              });
              if(particlesActive) particles.instanceMatrix.needsUpdate = true;
          }

          // 2. Foundation Pouring Sequence
          if (elapsed < 2.5) {
              if(pccMesh) pccMesh.scale.y = 0.001;
              foundationGroup.scale.y = 0.001;
          } else if (elapsed < 3.5) {
              if(pccMesh) pccMesh.scale.y = Math.max(0.001, (elapsed - 2.5));
              foundationGroup.scale.y = 0.001;
          } else if (elapsed < 5.5) {
              if(pccMesh) pccMesh.scale.y = 1;
              foundationGroup.scale.y = Math.max(0.001, (elapsed - 3.5) / 2.0);
              
              if (foundationType !== 'stone' && visualTheme === 'realistic') {
                  foundationGroup.children.forEach(c => {
                      if(c.material && c.material.color) c.material.color.setHex(COLORS.WET_CONCRETE);
                  });
              }
          } else if (elapsed < 7.0) {
              foundationGroup.scale.y = 1;
              
              if (foundationType !== 'stone' && visualTheme === 'realistic') {
                  const cureProgress = (elapsed - 5.5) / 1.5;
                  const wet = new THREE.Color(COLORS.WET_CONCRETE);
                  const dry = new THREE.Color(COLORS.DRY_CONCRETE);
                  const lerped = wet.lerp(dry, cureProgress);
                  
                  foundationGroup.children.forEach(c => {
                      if(c.material && c.material.color) c.material.color.copy(lerped);
                  });
              }
          } else {
              foundationGroup.scale.y = 1;
              animStateRef.current.active = false;
          }
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
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      disposeObject(scene);
      renderer.dispose();
    };
  }, [visualTheme, foundationType]); 

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
      if (animationDataRef.current.length > 0) {
          animationDataRef.current.forEach(p => { p.t = -Math.random() * 2.5; });
      }
      animStateRef.current = { active: true, startTime: Date.now() };
  };

  // --- Core Calculation & 3D Rebuild ---

  function calculateAndRender() {
    const { length, width, thickness, excavationDepth, overdig, pccThickness, stemHeight, footingWidth, footingDepth, concreteWastage, rebarWastage, concretePrice, pccPrice, rebarPrice, formworkPrice, excavationRate, laborRate } = inputs;
    const scene = sceneRef.current;

    if (!length || !width || !scene) return;

    // Math Conversions
    const lenM = length * unitToMeter[unitSystem];
    const widM = width * unitToMeter[unitSystem];
    const thickM = thickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const depthM = excavationDepth * unitToMeter[unitSystem];
    const overdigM = overdig * unitToMeter[unitSystem];
    const pccThickM = pccThickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const stemHtM = stemHeight * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const footWidM = footingWidth * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const footDepthM = footingDepth * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];

    const excavLenM = lenM + (2 * overdigM);
    const excavWidM = widM + (2 * overdigM);
    const excavationVolM3 = excavLenM * excavWidM * depthM;
    const pccVolM3 = excavLenM * excavWidM * pccThickM;

    let exactVolumeM3 = 0, exactRebarKg = 0, formworkAreaM2 = 0;

    if (foundationType === 'slab') {
      exactVolumeM3 = lenM * widM * thickM;
      exactRebarKg = exactVolumeM3 * 0.005 * 7850; 
      formworkAreaM2 = 2 * (lenM + widM) * thickM; 
    } else if (foundationType === 'stem' || foundationType === 'tshaped' || foundationType === 'frost') {
      const footingVol = lenM * footWidM * footDepthM;
      const stemVol = lenM * thickM * stemHtM; 
      exactVolumeM3 = footingVol + stemVol;
      exactRebarKg = exactVolumeM3 * (foundationType==='frost'?0.0075 : foundationType==='tshaped'?0.007 : 0.006) * 7850; 
      formworkAreaM2 = (2 * lenM * stemHtM) + (2 * lenM * footDepthM);
    } else if (foundationType === 'stone') {
      exactVolumeM3 = lenM * thickM * stemHtM;
      exactRebarKg = 0; formworkAreaM2 = 0; 
    }

    if (exactVolumeM3 <= 0) return;

    const orderVolumeM3 = exactVolumeM3 * (1 + (concreteWastage / 100));
    const orderPccM3 = pccVolM3 * (1 + (concreteWastage / 100));
    const orderRebarKg = exactRebarKg * (1 + (rebarWastage / 100));

    const orderVolumeYd3 = orderVolumeM3 * 1.30795;
    const orderPccYd3 = orderPccM3 * 1.30795;
    const excavationYd3 = excavationVolM3 * 1.30795;

    const billableConcrete = unitSystem === 'ft' ? orderVolumeYd3 : orderVolumeM3;
    const billablePcc = unitSystem === 'ft' ? orderPccYd3 : orderPccM3;
    const billableExcavation = unitSystem === 'ft' ? excavationYd3 : excavationVolM3;

    const costExcavation = billableExcavation * excavationRate;
    const costPcc = billablePcc * pccPrice;
    const costConcrete = billableConcrete * concretePrice; 
    const costRebar = orderRebarKg * rebarPrice;
    const costFormwork = formworkAreaM2 * formworkPrice;
    
    const laborHours = (orderVolumeM3 + orderPccM3) * 0.8;
    const costLabor = laborHours * laborRate;
    const grandTotal = costExcavation + costPcc + costConcrete + costRebar + costFormwork + costLabor;

    // --- 3D Scene Assembly ---
    // Safe memory cleanup to prevent crashes
    const toRemove = [];
    scene.children.forEach(c => {
        if (c.name === 'dynamicBuild') toRemove.push(c);
    });
    toRemove.forEach(c => {
        scene.remove(c);
        disposeObject(c);
    });

    const isBlueprint = visualTheme === 'blueprint';
    const structColor = isBlueprint ? COLORS.BLUEPRINT_STRUCT : (foundationType === 'stone' ? 0x78716c : COLORS.DRY_CONCRETE); 
    const pccColor = isBlueprint ? COLORS.BLUEPRINT_PCC : COLORS.PCC_BLINDING;
    const pitColor = isBlueprint ? COLORS.BLUEPRINT_PIT : COLORS.SOIL_PIT;
    
    const opacity = isBlueprint ? 0.3 : 1;
    const wireframe = isBlueprint;
    
    const getMat = (colorHex) => new THREE.MeshStandardMaterial({
        color: colorHex, wireframe, transparent: isBlueprint, opacity: isBlueprint ? 0.4 : 1, roughness: 1, side: THREE.DoubleSide
    });
    
    const structMaterial = new THREE.MeshStandardMaterial({ color: structColor, roughness: 0.95, transparent: isBlueprint, opacity, wireframe });
    const pccMaterial = new THREE.MeshStandardMaterial({ color: pccColor, roughness: 1.0, transparent: isBlueprint, opacity: opacity * 0.9, wireframe });
    
    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicBuild'; // Tag for safe deletion

    const safeLen = Math.max(0.1, lenM);
    const safeWid = Math.max(0.1, widM);
    const safeThick = Math.max(0.01, thickM);
    const safeStemHt = Math.max(0.01, stemHtM);
    const safeFootWid = Math.max(0.01, footWidM);
    const safeFootDepth = Math.max(0.01, footDepthM);
    const safePccThick = Math.max(0.01, pccThickM);
    const safeExcavLen = Math.max(0.1, excavLenM);
    const safeExcavWid = Math.max(0.1, excavWidM);
    const safeDepth = Math.max(0.1, depthM);

    // 1. Grassland Ground
    const terrainSize = Math.max(safeExcavLen, safeExcavWid) * 3;
    const shape = new THREE.Shape();
    shape.moveTo(-terrainSize/2, -terrainSize/2);
    shape.lineTo(terrainSize/2, -terrainSize/2);
    shape.lineTo(terrainSize/2, terrainSize/2);
    shape.lineTo(-terrainSize/2, terrainSize/2);
    shape.lineTo(-terrainSize/2, -terrainSize/2);

    const hole = new THREE.Path();
    hole.moveTo(-safeExcavLen/2, -safeExcavWid/2);
    hole.lineTo(safeExcavLen/2, -safeExcavWid/2);
    hole.lineTo(safeExcavLen/2, safeExcavWid/2);
    hole.lineTo(-safeExcavLen/2, safeExcavWid/2);
    hole.lineTo(-safeExcavLen/2, -safeExcavWid/2);
    shape.holes.push(hole);

    const groundGeom = new THREE.ShapeGeometry(shape);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeom, getMat(COLORS.GRASSLAND)); 
    groundMesh.receiveShadow = true;
    mainGroup.add(groundMesh);

    // 2. Pit Floor & Vertical Walls
    const floorGeom = new THREE.PlaneGeometry(safeExcavLen, safeExcavWid);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeom, getMat(pitColor));
    floorMesh.position.y = -safeDepth;
    floorMesh.receiveShadow = true;
    mainGroup.add(floorMesh);

    const buildWall = (p1, p2, p3, p4) => {
        const geom = new THREE.BufferGeometry();
        const verts = new Float32Array([...p1, ...p2, ...p3, ...p1, ...p3, ...p4]);
        geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geom.computeVertexNormals();
        const mesh = new THREE.Mesh(geom, getMat(pitColor));
        mesh.receiveShadow = true;
        return mesh;
    };
    
    const hL = safeExcavLen/2, hW = safeExcavWid/2, d = -safeDepth;
    mainGroup.add(buildWall([-hL, 0, -hW], [hL, 0, -hW], [hL, d, -hW], [-hL, d, -hW])); 
    mainGroup.add(buildWall([hL, 0, hW], [-hL, 0, hW], [-hL, d, hW], [hL, d, hW]));     
    mainGroup.add(buildWall([-hL, 0, hW], [-hL, 0, -hW], [-hL, d, -hW], [-hL, d, hW])); 
    mainGroup.add(buildWall([hL, 0, -hW], [hL, 0, hW], [hL, d, hW], [hL, d, -hW]));     

    // 3. PCC Layer
    const pccGeo = new THREE.BoxGeometry(safeExcavLen, safePccThick, safeExcavWid);
    pccGeo.translate(0, safePccThick / 2, 0); 
    const pccMesh = new THREE.Mesh(pccGeo, pccMaterial);
    pccMesh.position.y = -safeDepth; 
    pccMesh.receiveShadow = !isBlueprint;
    mainGroup.add(pccMesh);

    // 4. Structural Foundation
    const foundationGroup = new THREE.Group();
    foundationGroup.position.y = -safeDepth + safePccThick; 

    if (foundationType === 'stone' && !isBlueprint) {
      const stoneL = 0.4, stoneH = 0.25; 
      let rows = Math.max(1, Math.ceil(safeStemHt / stoneH));
      let cols = Math.max(1, Math.ceil(safeLen / stoneL) + 1);
      
      // Memory safeguard
      if (rows * cols > 10000) {
          const scale = Math.sqrt(10000 / (rows * cols));
          rows = Math.max(1, Math.floor(rows * scale));
          cols = Math.max(1, Math.floor(cols * scale));
      }
      
      const stoneGeo = new THREE.BoxGeometry(stoneL * 0.95, stoneH * 0.92, safeThick * 0.95);
      stoneGeo.translate(0, (stoneH * 0.92) / 2, 0);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 });
      const stoneMesh = new THREE.InstancedMesh(stoneGeo, stoneMat, rows * cols);
      stoneMesh.castShadow = true; stoneMesh.receiveShadow = true;
      
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const stoneColors = ['#78716c', '#8a7f72', '#a8a29e', '#57534e', '#44403c', '#d6d3d1'];
      
      let count = 0;
      const startX = -safeLen / 2 + stoneL / 2;
      
      for (let r = 0; r < rows; r++) {
          const isEven = r % 2 === 0;
          let actualStoneH = stoneH;
          let yBase = r * stoneH; 
          
          if (r * stoneH + stoneH > safeStemHt) actualStoneH = safeStemHt - (r * stoneH);
          if (actualStoneH <= 0.01) continue;

          for (let c = 0; c < cols; c++) {
              let xCenter = startX + c * stoneL;
              if (!isEven) xCenter -= stoneL / 2; 

              let actualStoneL = stoneL;
              if (xCenter - stoneL/2 < -safeLen/2) {
                  const overlap = (-safeLen/2) - (xCenter - stoneL/2);
                  actualStoneL -= overlap; xCenter += overlap / 2;
              }
              if (xCenter + actualStoneL/2 > safeLen/2) {
                  const overlap = (xCenter + actualStoneL/2) - (safeLen/2);
                  actualStoneL -= overlap; xCenter -= overlap / 2;
              }
              if (actualStoneL <= 0.02) continue;

              dummy.position.set(xCenter, yBase, 0);
              dummy.scale.set(actualStoneL / stoneL, actualStoneH / stoneH, 1);
              dummy.updateMatrix();
              stoneMesh.setMatrixAt(count, dummy.matrix);
              
              color.set(stoneColors[Math.floor(Math.random() * stoneColors.length)]);
              stoneMesh.setColorAt(count, color);
              count++;
          }
      }
      stoneMesh.count = count;
      stoneMesh.instanceMatrix.needsUpdate = true;
      if(stoneMesh.instanceColor) stoneMesh.instanceColor.needsUpdate = true;
      foundationGroup.add(stoneMesh);

    } else if (foundationType === 'stone' && isBlueprint) {
      const stoneGeo = new THREE.BoxGeometry(safeLen, safeStemHt, safeThick);
      stoneGeo.translate(0, safeStemHt / 2, 0);
      const stoneMesh = new THREE.Mesh(stoneGeo, structMaterial);
      foundationGroup.add(stoneMesh);
    } else if (foundationType === 'slab') {
      const geometry = new THREE.BoxGeometry(safeLen, safeThick, safeWid);
      geometry.translate(0, safeThick / 2, 0);
      const slabMesh = new THREE.Mesh(geometry, structMaterial);
      slabMesh.castShadow = !isBlueprint; slabMesh.receiveShadow = !isBlueprint;
      foundationGroup.add(slabMesh);
    } else {
      const footingGeo = new THREE.BoxGeometry(safeLen, safeFootDepth, safeFootWid);
      footingGeo.translate(0, safeFootDepth / 2, 0);
      const footingMesh = new THREE.Mesh(footingGeo, structMaterial);
      footingMesh.castShadow = !isBlueprint; footingMesh.receiveShadow = !isBlueprint;
      foundationGroup.add(footingMesh);

      const stemGeo = new THREE.BoxGeometry(safeLen, safeStemHt, safeThick);
      stemGeo.translate(0, safeStemHt / 2, 0);
      const stemMesh = new THREE.Mesh(stemGeo, structMaterial);
      
      stemMesh.position.y = safeFootDepth;
      if (foundationType !== 'tshaped') {
          stemMesh.position.z = (safeFootWid/2) - (safeThick/2);
      }
      stemMesh.castShadow = !isBlueprint; stemMesh.receiveShadow = !isBlueprint;
      foundationGroup.add(stemMesh);
    }
    
    mainGroup.add(foundationGroup);
    scene.add(mainGroup);

    // --- 5. Flying Dirt Particles Setup ---
    // Safe minimum of 1 particle to prevent InstancedMesh 0-count crash
    const particleCount = Math.max(1, Math.min(2000, Math.floor(excavationVolM3 * 5))); 
    const pGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const pMesh = new THREE.InstancedMesh(pGeom, getMat(pitColor), particleCount);
    pMesh.name = 'dynamicBuild'; 
    pMesh.castShadow = !isBlueprint;
    scene.add(pMesh);

    const animData = [];
    const pileRadius = Math.sqrt(excavationVolM3) / 1.5;
    const pileCenterX = (safeExcavLen/2) + pileRadius + 2;
    const dummy = new THREE.Object3D();

    for(let i=0; i<particleCount; i++){
        const sx = (Math.random() - 0.5) * safeExcavLen;
        const sz = (Math.random() - 0.5) * safeExcavWid;
        const sy = -safeDepth + (Math.random() * safeDepth);

        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * pileRadius;
        const ex = pileCenterX + Math.cos(angle) * r;
        const ez = Math.sin(angle) * r;
        const ey = pileRadius - r; 

        animData.push({
            startX: sx, startY: sy, startZ: sz,
            endX: ex, endY: Math.max(0.2, ey), endZ: ez,
            t: 2, 
            speed: 0.01 + Math.random() * 0.015,
            arcHeight: 2 + Math.random() * 4 + safeDepth,
            scale: 0.4 + Math.random() * 1.2
        });
        
        // Hide particles deep underground until animation starts, avoiding 0 scale bugs
        dummy.position.set(0, -9999, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        pMesh.setMatrixAt(i, dummy.matrix);
    }
    pMesh.instanceMatrix.needsUpdate = true;
    animationDataRef.current = animData;

    // Save refs for animation loop
    sceneObjectsRef.current = { pccMesh, foundationGroup, particles: pMesh };

    // Adjust camera
    const maxDim = Math.max(safeExcavLen, safeExcavWid, safeDepth);
    cameraRef.current.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.4);
    controlsRef.current.target.set(0, -safeDepth / 2, 0); 
    scene.fog.density = 0.02 / Math.max(1, maxDim);

    setResults({
      excavationVolM3, excavationYd3,
      pccVolM3, orderPccM3, orderPccYd3,
      exactVolumeM3, orderVolumeM3, orderVolumeYd3,
      exactRebarKg, orderRebarKg,
      formworkAreaM2,
      costExcavation, costPcc, costConcrete, costRebar, costFormwork, costLabor, grandTotal, laborHours,
      lenM, widM, thickM, stemHtM, footWidM, footDepthM
    });
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 300);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, foundationType, visualTheme]);

  return (
    <div className="flex flex-col wide:flex-row gap-6 w-full h-full pb-6 text-ink font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block">
      
      {/* --- Left Panel: Settings --- */}
      <div className="w-full wide:w-[380px] bg-surface p-5 rounded-lg border border-line flex flex-col gap-4 z-10 relative h-auto wide:h-[calc(100vh-140px)] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
            <h2 className="text-sm font-semibold text-ink">Inputs</h2>
            <span className="text-xs text-muted font-medium whitespace-nowrap">Rates in ₹ INR</span>
        </div>
        
        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
            
            <div className="p-4 rounded-lg border border-line">
                <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">
                  Foundation Type
                </h3>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {foundationTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFoundationType(type.value)}
                      className={`py-2 rounded-lg text-xs font-bold   transition-all ${
                        foundationType === type.value
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface border border-line text-muted hover:text-ink hover:border-line-control'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
            </div>

            <div className="p-4 rounded-lg border border-line">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">Base Geometry</h3>
                    <select aria-label="Unit system" value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)} className="bg-surface border border-line-control text-xs rounded px-1.5 py-1 outline-none text-ink cursor-pointer focus:ring-1 focus:ring-focus transition-all">
                        <option value="ft">Imperial (ft/in)</option>
                        <option value="m">Metric (m/cm)</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor="foundation-length" className="block text-xs text-muted mb-1">Length ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                      <input id="foundation-length" type="number" step="0.1" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                    </div>
                    <div>
                      <label htmlFor="foundation-width" className="block text-xs text-muted mb-1">Width ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                      <input id="foundation-width" type="number" step="0.1" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                    </div>
                </div>
                <div className="border-t border-line pt-3">
                      <label htmlFor="foundation-thickness" className="block text-xs text-muted mb-1">
                        {foundationType === 'slab' ? 'Slab Thickness' : foundationType === 'stone' ? 'Wall Thickness' : 'Wall Thickness'} ({unitSystem === 'ft' ? 'in' : 'cm'})
                      </label>
                      <input id="foundation-thickness" type="number" step="0.5" name="thickness" value={inputs.thickness} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                </div>
            </div>

            <div className="p-4 rounded-lg border border-line">
                <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2 transition-colors">Site Prep & Sub-base</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor="foundation-excavationDepth" className="block text-xs text-muted mb-1">Excavation Depth ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                      <input id="foundation-excavationDepth" type="number" step="0.5" name="excavationDepth" value={inputs.excavationDepth} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                    </div>
                    <div>
                      <label htmlFor="foundation-overdig" className="block text-xs text-muted mb-1">Overdig/Space ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                      <input id="foundation-overdig" type="number" step="0.5" name="overdig" value={inputs.overdig} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                    </div>
                </div>
                <div className="border-t border-line pt-3">
                      <label htmlFor="foundation-pccThickness" className="block text-xs text-muted mb-1">PCC Blinding Layer Thickness ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                      <input id="foundation-pccThickness" type="number" step="0.5" name="pccThickness" value={inputs.pccThickness} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                </div>
            </div>

            {foundationType !== 'slab' && (
              <div className="p-4 rounded-lg border border-line animate-fade-in">
                  <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2 transition-colors">Structural Details</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="col-span-2">
                        <label htmlFor="foundation-stemHeight" className="block text-xs text-muted mb-1">{foundationType === 'stone' ? 'Stone Wall Height' : 'Stem Wall Height'} ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                        <input id="foundation-stemHeight" type="number" step="1" name="stemHeight" value={inputs.stemHeight} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                      </div>
                      
                      {foundationType !== 'stone' && (
                        <>
                          <div>
                            <label htmlFor="foundation-footingWidth" className="block text-xs text-muted mb-1">Footing Width ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                            <input id="foundation-footingWidth" type="number" step="1" name="footingWidth" value={inputs.footingWidth} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                          </div>
                          <div>
                            <label htmlFor="foundation-footingDepth" className="block text-xs text-muted mb-1">Footing Depth ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                            <input id="foundation-footingDepth" type="number" step="1" name="footingDepth" value={inputs.footingDepth} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
                          </div>
                        </>
                      )}
                  </div>
              </div>
            )}

            <div className="p-4 rounded-lg border border-line">
                <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2 transition-colors">Wastage Buffers</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="foundation-concreteWastage" className="block text-xs text-muted mb-1">{foundationType === 'stone' ? 'Stone/Mortar Loss' : 'Concrete Loss'}</label>
                        <div className="flex items-center bg-surface border border-line rounded-lg pr-2 focus-within:ring-1 focus-within:ring-focus">
                            <input id="foundation-concreteWastage" type="number" name="concreteWastage" value={inputs.concreteWastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-ink" />
                            <span className="text-muted text-xs">%</span>
                        </div>
                    </div>
                    {foundationType !== 'stone' && (
                      <div>
                          <label htmlFor="foundation-rebarWastage" className="block text-xs text-muted mb-1">Steel/Rebar Loss</label>
                          <div className="flex items-center bg-surface border border-line rounded-lg pr-2 focus-within:ring-1 focus-within:ring-focus">
                              <input id="foundation-rebarWastage" type="number" name="rebarWastage" value={inputs.rebarWastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-ink" />
                              <span className="text-muted text-xs">%</span>
                          </div>
                      </div>
                    )}
                </div>
            </div>

            <div className="p-4 rounded-lg border border-line mb-2">
                <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2 transition-colors">Rates & Operations</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                      <span className="text-xs text-muted font-medium ml-1">Excavation (per {unitSystem === 'ft' ? 'yd³' : 'm³'})</span>
                      <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                          <span className="text-ink">{inputs.currency}</span>
                          <input aria-label="Excavation rate" type="number" name="excavationRate" value={inputs.excavationRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                      <span className="text-xs text-muted font-medium ml-1">PCC Blinding (per {unitSystem === 'ft' ? 'yd³' : 'm³'})</span>
                      <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                          <span className="text-ink">{inputs.currency}</span>
                          <input aria-label="PCC rate" type="number" name="pccPrice" value={inputs.pccPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                      <span className="text-xs text-muted font-medium ml-1">{foundationType === 'stone' ? 'Stone & Mortar' : 'Struct. Concrete'} (per {unitSystem === 'ft' ? 'yd³' : 'm³'})</span>
                      <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                          <span className="text-ink">{inputs.currency}</span>
                          <input aria-label="Concrete rate" type="number" name="concretePrice" value={inputs.concretePrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                      </div>
                  </div>
                  {foundationType !== 'stone' && (
                    <>
                      <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                          <span className="text-xs text-muted font-medium ml-1">Rebar (per kg)</span>
                          <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                              <span className="text-ink">{inputs.currency}</span>
                              <input aria-label="Rebar (per kg)" type="number" name="rebarPrice" value={inputs.rebarPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                          </div>
                      </div>
                      <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                          <span className="text-xs text-muted font-medium ml-1">Formwork (per m²)</span>
                          <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                              <span className="text-ink">{inputs.currency}</span>
                              <input aria-label="Formwork (per m²)" type="number" name="formworkPrice" value={inputs.formworkPrice} onChange={handleInputChange} className="w-full bg-transparent p-1 text-right outline-none text-ink font-mono" />
                          </div>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between bg-sunken p-2 rounded-lg border border-line-control">
                      <span className="text-xs text-ink font-medium ml-1">Labor (per hr)</span>
                      <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                          <span className="text-ink">{inputs.currency}</span>
                          <input aria-label="Labor (per hr)" type="number" name="laborRate" value={inputs.laborRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                      </div>
                  </div>
                </div>
            </div>
        </div>
      </div>

      {results && (
        <div className="wide:hidden sticky bottom-0 lg:-bottom-8 z-30 -mx-4 sm:-mx-6 lg:-mx-8 -my-3 px-4 sm:px-6 lg:px-8 py-3 bg-surface border-y border-line print:hidden" aria-live="polite">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                       <div className="flex flex-col">
                           <span className="text-xs text-muted font-bold">{foundationType === 'stone' ? 'Total Stone (Inc PCC)' : 'Total Concrete (Inc PCC)'}</span>
                           <span className="text-lg font-semibold text-ink leading-none">
                             {unitSystem === 'ft' ? (results.orderVolumeYd3 + results.orderPccYd3).toFixed(1) : (results.orderVolumeM3 + results.orderPccM3).toFixed(1)} {unitSystem === 'ft' ? 'yd³' : 'm³'}
                           </span>
                       </div>
                       <div className="w-px h-8 bg-line"></div>
                       <div className="flex flex-col">
                           <span className="text-xs text-muted font-bold">Est. Total</span>
                           <span className="text-lg font-semibold text-ink leading-none">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                       </div>
                    </div>
        </div>
      )}

      {/* --- Right Panel: Viewer & Report --- */}
      <div className="w-full wide:w-[calc(100%-404px)] bg-surface rounded-lg border border-line flex flex-col overflow-hidden relative z-10 wide:h-[calc(100vh-140px)] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        
        {/* Unified Top Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-line bg-surface z-30 shrink-0 print:hidden">
            <div className="flex-1 min-h-10 flex items-center">
                {results && mode === 'normal' ? (
                    <div className="hidden wide:flex flex-wrap items-center gap-x-4 gap-y-1">
                       <div className="flex flex-col">
                           <span className="text-xs text-muted font-bold">{foundationType === 'stone' ? 'Total Stone (Inc PCC)' : 'Total Concrete (Inc PCC)'}</span>
                           <span className="text-lg font-semibold text-ink leading-none">
                             {unitSystem === 'ft' ? (results.orderVolumeYd3 + results.orderPccYd3).toFixed(1) : (results.orderVolumeM3 + results.orderPccM3).toFixed(1)} {unitSystem === 'ft' ? 'yd³' : 'm³'}
                           </span>
                       </div>
                       <div className="w-px h-8 bg-line"></div>
                       <div className="flex flex-col">
                           <span className="text-xs text-muted font-bold">Est. Total</span>
                           <span className="text-lg font-semibold text-ink leading-none">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
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
                {results && (
                    <button
                      onClick={() => addToCad({
                        type: 'foundation',
                        source: 'Foundation Calculator',
                        label: `${foundationTypes.find(t=>t.value===foundationType)?.label || 'Foundation'} (${results.lenM?.toFixed(1)}m × ${results.widM?.toFixed(1)}m)`,
                        length: results.lenM || 4,
                        width: results.widM || 4,
                        depth: results.thickM || 0.3
                      })}
                      className="px-3 py-2 bg-sunken hover:bg-primary text-accent hover:text-ink border border-line-control rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      Add to CAD
                    </button>
                )}
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

        {/* 3D Canvas View */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-[#14171B] group print:hidden`}>
            <div ref={mountRef} className="absolute inset-0 cursor-move" role="img" aria-label="3D model of the current inputs. All quantities are listed in the Math and Report views."></div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-sunken p-1 rounded-lg border border-line flex gap-1">
                <button onClick={triggerSimulation} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-sunken text-ink border border-line-control hover:bg-primary hover:text-on-primary mr-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Simulate Excavate & Pour
                </button>
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-xs font-bold  transition-all ${visualTheme === 'realistic' ? 'bg-sunken text-primary border border-line-control' : 'text-muted hover:text-ink-2'}`}>Realistic</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-xs font-bold  transition-all ${visualTheme === 'blueprint' ? 'bg-sunken text-primary border border-line-control' : 'text-muted hover:text-ink-2'}`}>Blueprint</button>
            </div>
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-line pb-6 mb-8 print:border-black">
                  <h2 className="text-3xl font-semibold text-ink tracking-tight">Engineering Calculations</h2>
                  <p className="text-sm text-muted mt-1 font-mono">Detailed Mathematical Proof (Base Unit: Meters/Kg)</p>
              </div>
              <div className="space-y-8 max-w-4xl mx-auto">
                 <div className="bg-surface border border-line rounded-lg p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-ink border-b border-line pb-3 mb-4 print:text-black">Step 1: Excavation & Site Prep</h3>
                    <div className="font-mono text-sm space-y-3 text-ink-2 bg-bg p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-muted italic print:text-black">// Working space (overdig) is added to all sides for formwork placement.</p>
                        <p><span className="text-muted print:text-black font-bold">Trench Length</span> = L + (2 × Overdig)</p>
                        <p><span className="text-muted print:text-black font-bold">Trench Length</span> = {results.lenM.toFixed(2)} + (2 × {(inputs.overdig * unitToMeter[unitSystem]).toFixed(2)}) = <span className="font-bold text-ink">{(results.lenM + 2*(inputs.overdig * unitToMeter[unitSystem])).toFixed(2)} m</span></p>
                        <p><span className="text-muted print:text-black font-bold">Trench Width</span> = W + (2 × Overdig)</p>
                        <p><span className="text-muted print:text-black font-bold">Trench Width</span> = {results.widM.toFixed(2)} + (2 × {(inputs.overdig * unitToMeter[unitSystem]).toFixed(2)}) = <span className="font-bold text-ink">{(results.widM + 2*(inputs.overdig * unitToMeter[unitSystem])).toFixed(2)} m</span></p>
                        <br/>
                        <p><span className="text-muted print:text-black font-bold">Total Excavation Vol</span> = Trench L × Trench W × Depth</p>
                        <p className="text-ink print:text-black font-bold text-base mt-2">Excavation Volume = {results.excavationVolM3.toFixed(2)} m³</p>
                    </div>
                 </div>

                 <div className="bg-surface border border-line rounded-lg p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-ink border-b border-line pb-3 mb-4 print:text-black">Step 2: Volume Matrix (PCC & Structural)</h3>
                    <div className="font-mono text-sm space-y-3 text-ink-2 bg-bg p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-muted print:text-black font-bold">PCC (Blinding) Vol</span> = Trench L × Trench W × PCC Thickness</p>
                        <p><span className="text-muted print:text-black font-bold">PCC Vol</span> = {(results.lenM + 2*(inputs.overdig * unitToMeter[unitSystem])).toFixed(2)}m × {(results.widM + 2*(inputs.overdig * unitToMeter[unitSystem])).toFixed(2)}m × {(inputs.pccThickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm']).toFixed(3)}m = <span className="font-bold text-ink">{results.pccVolM3.toFixed(3)} m³</span></p>
                        <div className="w-full h-px bg-sunken my-2"></div>
                        {foundationType === 'slab' ? (
                            <>
                                <p><span className="text-muted print:text-black font-bold">Exact Structural Vol</span> = L × W × Thickness</p>
                                <p><span className="text-muted print:text-black font-bold">Exact Structural Vol</span> = {results.lenM.toFixed(3)}m × {results.widM.toFixed(3)}m × {results.thickM.toFixed(3)}m = <span className="font-bold text-ink">{results.exactVolumeM3.toFixed(3)} m³</span></p>
                            </>
                        ) : foundationType === 'stone' ? (
                            <>
                                <p><span className="text-muted print:text-black font-bold">Stone Wall Vol</span> = L × Wall Thickness × Height</p>
                                <p><span className="text-muted print:text-black font-bold">Stone Wall Vol</span> = {results.lenM.toFixed(3)}m × {results.thickM.toFixed(3)}m × {results.stemHtM.toFixed(3)}m = <span className="font-bold text-ink">{(results.lenM * results.thickM * results.stemHtM).toFixed(3)} m³</span></p>
                                <br/>
                                <p><span className="text-muted print:text-black font-bold">Total Exact Vol</span> = <span className="font-bold text-ink">{results.exactVolumeM3.toFixed(3)} m³</span></p>
                            </>
                        ) : (
                            <>
                                <p><span className="text-muted print:text-black font-bold">Footing Vol</span> = L × Footing Width × Footing Depth</p>
                                <p><span className="text-muted print:text-black font-bold">Footing Vol</span> = {results.lenM.toFixed(3)}m × {results.footWidM.toFixed(3)}m × {results.footDepthM.toFixed(3)}m = <span className="font-bold text-ink">{(results.lenM * results.footWidM * results.footDepthM).toFixed(3)} m³</span></p>
                                <br/>
                                <p><span className="text-muted print:text-black font-bold">Stem Wall Vol</span> = L × Wall Thickness × Stem Height</p>
                                <p><span className="text-muted print:text-black font-bold">Stem Wall Vol</span> = {results.lenM.toFixed(3)}m × {results.thickM.toFixed(3)}m × {results.stemHtM.toFixed(3)}m = <span className="font-bold text-ink">{(results.lenM * results.thickM * results.stemHtM).toFixed(3)} m³</span></p>
                                <br/>
                                <p><span className="text-muted print:text-black font-bold">Total Exact Vol</span> = Footing + Stem = <span className="font-bold text-ink">{results.exactVolumeM3.toFixed(3)} m³</span></p>
                            </>
                        )}
                        <br/>
                        <p><span className="text-muted print:text-black font-bold">Order Vol (+{inputs.concreteWastage}% Wastage)</span> = {results.exactVolumeM3.toFixed(3)} × {(1 + inputs.concreteWastage/100).toFixed(2)}</p>
                        <p className="text-ink print:text-black font-bold text-base mt-2">Final Structural Volume = {results.orderVolumeM3.toFixed(3)} m³</p>
                    </div>
                 </div>

                 {foundationType !== 'stone' && (
                   <div className="bg-surface border border-line rounded-lg p-6 print:shadow-none print:border-black print:border-2">
                      <h3 className="text-lg font-bold text-ink border-b border-line pb-3 mb-4 print:text-black">Step 3: Steel Reinforcement (Rebar)</h3>
                      <div className="font-mono text-sm space-y-3 text-ink-2 bg-bg p-4 rounded-lg print:bg-transparent print:p-0">
                          <p><span className="text-muted print:text-black font-bold">Density of Steel</span> = 7850 kg/m³</p>
                          <p><span className="text-muted print:text-black font-bold">Steel Ratio ({foundationType})</span> = {foundationType === 'slab' ? '0.5%' : foundationType === 'stem' ? '0.6%' : foundationType === 'tshaped' ? '0.7%' : '0.75%'} of concrete volume</p>
                          <br/>
                          <p><span className="text-muted print:text-black font-bold">Exact Weight</span> = Structural Vol × Ratio × Density</p>
                          <p><span className="text-muted print:text-black font-bold">Exact Weight</span> = {results.exactVolumeM3.toFixed(3)} × {foundationType === 'slab' ? '0.005' : foundationType === 'stem' ? '0.006' : foundationType === 'tshaped' ? '0.007' : '0.0075'} × 7850 = <span className="font-bold text-ink">{results.exactRebarKg.toFixed(2)} kg</span></p>
                          <br/>
                          <p><span className="text-muted print:text-black font-bold">Order Weight (+{inputs.rebarWastage}% Wastage)</span> = {results.exactRebarKg.toFixed(2)} × {(1 + inputs.rebarWastage/100).toFixed(2)}</p>
                          <p className="text-ink print:text-black font-bold text-base mt-2">Final Rebar Weight = {results.orderRebarKg.toFixed(2)} kg</p>
                      </div>
                   </div>
                 )}

                 {foundationType !== 'stone' && (
                   <div className="bg-surface border border-line rounded-lg p-6 print:shadow-none print:border-black print:border-2">
                      <h3 className="text-lg font-bold text-ink border-b border-line pb-3 mb-4 print:text-black">Step 4: Formwork (Shuttering) Area</h3>
                      <div className="font-mono text-sm space-y-3 text-ink-2 bg-bg p-4 rounded-lg print:bg-transparent print:p-0">
                          {foundationType === 'slab' ? (
                              <>
                                  <p><span className="text-muted print:text-black font-bold">Exposed Perimeter</span> = 2 × (L + W)</p>
                                  <p><span className="text-muted print:text-black font-bold">Formwork Area</span> = Perimeter × Thickness</p>
                                  <p><span className="text-muted print:text-black font-bold">Formwork Area</span> = (2 × ({results.lenM.toFixed(2)} + {results.widM.toFixed(2)})) × {results.thickM.toFixed(3)}</p>
                              </>
                          ) : (
                              <>
                                  <p className="text-xs text-muted italic print:text-black">// Estimating formwork for both sides of the trench / stem wall.</p>
                                  <p><span className="text-muted print:text-black font-bold">Formwork Area</span> = (2 × L × Stem Height) + (2 × L × Footing Depth)</p>
                              </>
                          )}
                          <p className="text-ink print:text-black font-bold text-base mt-2">Total Formwork Surface = {results.formworkAreaM2.toFixed(2)} m²</p>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        )}

        {results && mode === 'civil' && (
          <div className="flex-1 flex flex-col bg-bg overflow-hidden relative animate-fade-in print:bg-white print:p-0 print:overflow-visible print:h-auto print:block">
            <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink print:text-black print:p-0 print:overflow-visible print:h-auto print:w-full">
                <div className="border-b-2 border-line pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-semibold text-ink tracking-tight">Project Estimate</h2>
                        <p className="text-sm text-muted mt-1 font-mono">Generated by CivisMetric Engine</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted font-bold print:text-black">Grand Total</p>
                        <p className="text-4xl font-semibold text-ink font-mono print:text-black">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:block">
                    <div className="print:mb-6">
                        <h3 className="text-xs font-bold text-muted mb-3 border-b border-line pb-1 print:text-black">Project Specifications</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Foundation Profile</th><td className="py-2 font-medium text-right capitalize">{foundationTypes.find(t => t.value === foundationType)?.label}</td></tr>
                                <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Dimensions (L×W)</th><td className="py-2 font-medium text-right">{inputs.length} × {inputs.width} {unitSystem}</td></tr>
                                <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Base Thickness</th><td className="py-2 font-medium text-right">{inputs.thickness} {unitSystem === 'ft' ? 'in' : 'cm'}</td></tr>
                                {foundationType !== 'slab' && (
                                  <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Wall Height</th><td className="py-2 font-medium text-right">{inputs.stemHeight} {unitSystem === 'ft' ? 'in' : 'cm'}</td></tr>
                                )}
                                {(foundationType !== 'slab' && foundationType !== 'stone') && (
                                  <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Footing Dimension</th><td className="py-2 font-medium text-right">{inputs.footingWidth}W × {inputs.footingDepth}D {unitSystem === 'ft' ? 'in' : 'cm'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-muted mb-3 border-b border-line pb-1 print:text-black">Material Quantities</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Excavation Cut</th><td className="py-2 font-medium text-right text-accent print:text-black">{unitSystem === 'ft' ? results.excavationYd3.toFixed(2) : results.excavationVolM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td></tr>
                                <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">PCC Blinding (+{inputs.concreteWastage}%)</th><td className="py-2 font-medium text-right text-primary print:text-black">{unitSystem === 'ft' ? results.orderPccYd3.toFixed(2) : results.orderPccM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td></tr>
                                <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">{foundationType === 'stone' ? 'Required Stone' : 'Required Concrete'} (+{inputs.concreteWastage}%)</th><td className="py-2 font-medium text-right text-primary print:text-black">{unitSystem === 'ft' ? results.orderVolumeYd3.toFixed(2) : results.orderVolumeM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td></tr>
                                {foundationType !== 'stone' && (
                                  <>
                                    <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Required Steel (+{inputs.rebarWastage}%)</th><td className="py-2 font-medium text-right text-accent print:text-black">{results.orderRebarKg.toFixed(0)} kg</td></tr>
                                    <tr className="border-b border-line print:border-slate-300"><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Formwork Surface</th><td className="py-2 font-medium text-right">{results.formworkAreaM2.toFixed(2)} m²</td></tr>
                                  </>
                                )}
                                <tr><th scope="row" className="py-2 font-normal text-left text-muted print:text-black">Est. Labor Time</th><td className="py-2 font-medium text-right">{results.laborHours.toFixed(1)} Hours</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <h3 className="text-xs font-bold text-muted mb-3 border-b border-line pb-1 print:text-black">Itemized Cost Breakdown</h3>
                <div className="bg-surface border border-line rounded-lg overflow-hidden mb-8 print:border-black print:shadow-none">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-bg text-muted text-xs uppercase tracking-wider print:bg-transparent print:text-black print:border-b print:border-black">
                            <tr>
                                <th scope="col" className="p-4 font-semibold">Item Description</th>
                                <th scope="col" className="p-4 font-semibold">Quantity</th>
                                <th scope="col" className="p-4 font-semibold">Rate</th>
                                <th scope="col" className="p-4 font-semibold text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-line print:divide-slate-300">
                            <tr>
                                <td className="p-4"><p className="font-bold text-ink">Earthworks & Excavation</p></td>
                                <td className="p-4 font-mono text-ink-2 print:text-black">{unitSystem === 'ft' ? results.excavationYd3.toFixed(2) : results.excavationVolM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-ink-2 print:text-black">{inputs.currency}{inputs.excavationRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-ink">{inputs.currency}{results.costExcavation.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-ink">PCC Blinding Layer</p></td>
                                <td className="p-4 font-mono text-ink-2 print:text-black">{unitSystem === 'ft' ? results.orderPccYd3.toFixed(2) : results.orderPccM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-ink-2 print:text-black">{inputs.currency}{inputs.pccPrice}</td>
                                <td className="p-4 font-mono font-bold text-right text-ink">{inputs.currency}{results.costPcc.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-ink">{foundationType === 'stone' ? 'Stone Masonry' : 'Ready-Mix Structural Concrete'}</p></td>
                                <td className="p-4 font-mono text-ink-2 print:text-black">{unitSystem === 'ft' ? results.orderVolumeYd3.toFixed(2) : results.orderVolumeM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-ink-2 print:text-black">{inputs.currency}{inputs.concretePrice}</td>
                                <td className="p-4 font-mono font-bold text-right text-ink">{inputs.currency}{results.costConcrete.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                            </tr>
                            {foundationType !== 'stone' && (
                              <>
                                <tr>
                                    <td className="p-4"><p className="font-bold text-ink">Steel Reinforcement</p></td>
                                    <td className="p-4 font-mono text-ink-2 print:text-black">{results.orderRebarKg.toFixed(2)} kg</td>
                                    <td className="p-4 font-mono text-ink-2 print:text-black">{inputs.currency}{inputs.rebarPrice}</td>
                                    <td className="p-4 font-mono font-bold text-right text-ink">{inputs.currency}{results.costRebar.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                                </tr>
                                <tr>
                                    <td className="p-4"><p className="font-bold text-ink">Timber Formwork</p></td>
                                    <td className="p-4 font-mono text-ink-2 print:text-black">{results.formworkAreaM2.toFixed(2)} m²</td>
                                    <td className="p-4 font-mono text-ink-2 print:text-black">{inputs.currency}{inputs.formworkPrice}</td>
                                    <td className="p-4 font-mono font-bold text-right text-ink">{inputs.currency}{results.costFormwork.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                                </tr>
                              </>
                            )}
                            <tr className="bg-bg print:bg-transparent">
                                <td className="p-4"><p className="font-bold text-ink">Skilled Labor</p></td>
                                <td className="p-4 font-mono text-ink-2 print:text-black">{results.laborHours.toFixed(1)} hrs</td>
                                <td className="p-4 font-mono text-ink-2 print:text-black">{inputs.currency}{inputs.laborRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-ink">{inputs.currency}{results.costLabor.toLocaleString('en-IN', {maximumFractionDigits: 2})}</td>
                            </tr>
                        </tbody>
                        <tfoot className="bg-sunken print:bg-transparent print:border-t-2 print:border-black">
                            <tr>
                                <td colSpan="3" className="p-4 text-right font-bold text-ink text-xs print:text-black">Estimated Grand Total</td>
                                <td className="p-4 font-mono font-semibold text-ink text-xl text-right print:text-black">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <p className="text-xs text-muted text-center italic print:hidden">* This is an automated estimate. Actual costs may vary based on site conditions, transportation, and local market fluctuations.</p>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}