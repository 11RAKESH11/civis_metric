import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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
  // --- Core Inputs (Strictly Foundation) ---
  const [unitSystem, setUnitSystem] = useState('ft');
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(initialWidth, initialHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // NO maxPolarAngle -> Full 360 rotation enabled!
    controls.enableZoom = true;
    controls.maxDistance = 300;
    controls.minDistance = 0.5;
    controls.autoRotate = true;
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
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 300);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, foundationType, visualTheme]);

  const calculateAndRender = () => {
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
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
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
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-4 md:p-6 bg-[#020617] text-slate-100 min-h-screen relative overflow-hidden font-sans print:p-0 print:bg-white print:text-black print:overflow-visible print:min-h-0 print:block">
      
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none print:hidden"></div>

      {/* --- Left Panel: Settings --- */}
      <div className="w-full xl:w-[400px] bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col gap-4 z-10 relative h-auto xl:h-[88vh] overflow-hidden shrink-0 print:hidden">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30 text-lg">🏗️</div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide leading-tight">CivisMetric</h2>
                  <p className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest">Foundation Engine</p>
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
            
            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-400 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>Foundation Type
                </h3>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {foundationTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFoundationType(type.value)}
                      className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                        foundationType === type.value
                          ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-white hover:border-cyan-500/50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-400 transition-colors"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Base Geometry</h3>
                    <select value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-cyan-500 transition-all">
                        <option value="ft">Imperial (ft/in)</option>
                        <option value="m">Metric (m/cm)</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                      <input type="number" step="0.1" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Width ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                      <input type="number" step="0.1" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
                    </div>
                </div>
                <div className="border-t border-slate-700/50 pt-3">
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">
                        {foundationType === 'slab' ? 'Slab Thickness' : foundationType === 'stone' ? 'Wall Thickness' : 'Wall Thickness'} ({unitSystem === 'ft' ? 'in' : 'cm'})
                      </label>
                      <input type="number" step="0.5" name="thickness" value={inputs.thickness} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
                </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-amber-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-amber-400 transition-colors"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>Site Prep & Sub-base</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Excavation Depth ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                      <input type="number" step="0.5" name="excavationDepth" value={inputs.excavationDepth} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">Overdig/Space ({unitSystem === 'ft' ? 'ft' : 'm'})</label>
                      <input type="number" step="0.5" name="overdig" value={inputs.overdig} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white" />
                    </div>
                </div>
                <div className="border-t border-slate-700/50 pt-3">
                      <label className="block text-[9px] text-slate-400 mb-1 uppercase">PCC Blinding Layer Thickness ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                      <input type="number" step="0.5" name="pccThickness" value={inputs.pccThickness} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white" />
                </div>
            </div>

            {foundationType !== 'slab' && (
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-indigo-500/30 transition-colors group animate-fade-in">
                  <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-indigo-400 transition-colors"><span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></span>Structural Details</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="col-span-2">
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">{foundationType === 'stone' ? 'Stone Wall Height' : 'Stem Wall Height'} ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                        <input type="number" step="1" name="stemHeight" value={inputs.stemHeight} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-white" />
                      </div>
                      
                      {foundationType !== 'stone' && (
                        <>
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1 uppercase">Footing Width ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                            <input type="number" step="1" name="footingWidth" value={inputs.footingWidth} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-white" />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1 uppercase">Footing Depth ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                            <input type="number" step="1" name="footingDepth" value={inputs.footingDepth} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-white" />
                          </div>
                        </>
                      )}
                  </div>
              </div>
            )}

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-orange-500/30 transition-colors group">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-orange-400 transition-colors"><span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>Wastage Buffers</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[9px] text-slate-400 mb-1 uppercase">{foundationType === 'stone' ? 'Stone/Mortar Loss' : 'Concrete Loss'}</label>
                        <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-orange-500">
                            <input type="number" name="concreteWastage" value={inputs.concreteWastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white" />
                            <span className="text-slate-500 text-xs">%</span>
                        </div>
                    </div>
                    {foundationType !== 'stone' && (
                      <div>
                          <label className="block text-[9px] text-slate-400 mb-1 uppercase">Steel/Rebar Loss</label>
                          <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2 focus-within:ring-1 focus-within:ring-orange-500">
                              <input type="number" name="rebarWastage" value={inputs.rebarWastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white" />
                              <span className="text-slate-500 text-xs">%</span>
                          </div>
                      </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group mb-2">
                <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400 transition-colors"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Rates & Operations</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">Excavation (per {unitSystem === 'ft' ? 'yd³' : 'm³'})</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="excavationRate" value={inputs.excavationRate} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">PCC Blinding (per {unitSystem === 'ft' ? 'yd³' : 'm³'})</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="pccPrice" value={inputs.pccPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                      <span className="text-[11px] text-slate-400 font-medium ml-1">{foundationType === 'stone' ? 'Stone & Mortar' : 'Struct. Concrete'} (per {unitSystem === 'ft' ? 'yd³' : 'm³'})</span>
                      <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                          <span className="text-emerald-500">{inputs.currency}</span>
                          <input type="number" name="concretePrice" value={inputs.concretePrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                      </div>
                  </div>
                  {foundationType !== 'stone' && (
                    <>
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
                              <input type="number" name="formworkPrice" value={inputs.formworkPrice} onChange={handleInputChange} className="w-full bg-transparent p-1 text-right outline-none text-white font-mono" />
                          </div>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between bg-emerald-900/10 p-2 rounded-lg border border-emerald-800/30">
                      <span className="text-[11px] text-emerald-400/80 font-medium ml-1">Labor (per hr)</span>
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
      <div className="w-full xl:w-[calc(100%-424px)] bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden relative z-10 xl:h-[88vh] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        
        {/* Unified Top Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-30 shrink-0 print:hidden">
            <div className="flex-1 h-10 flex items-center">
                {results && mode === 'normal' ? (
                    <div className="flex items-center gap-4 animate-fade-in">
                       <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">{foundationType === 'stone' ? 'Total Stone (Inc PCC)' : 'Total Concrete (Inc PCC)'}</span>
                           <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 leading-none">
                             {unitSystem === 'ft' ? (results.orderVolumeYd3 + results.orderPccYd3).toFixed(1) : (results.orderVolumeM3 + results.orderPccM3).toFixed(1)} {unitSystem === 'ft' ? 'yd³' : 'm³'}
                           </span>
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
            
            <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
                <button onClick={triggerSimulation} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-slate-900 mr-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Simulate Excavate & Pour
                </button>
                <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Realistic</button>
                <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}>Blueprint</button>
            </div>
        </div>

        {/* --- Engineering Math View --- */}
        {results && mode === 'math' && (
           <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black print:overflow-visible print:h-auto print:w-full print:block">
              <div className="border-b-2 border-slate-200 pb-6 mb-8 print:border-black">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Engineering Calculations</h1>
                  <p className="text-sm text-slate-500 mt-1 font-mono">Detailed Mathematical Proof (Base Unit: Meters/Kg)</p>
              </div>
              <div className="space-y-8 max-w-4xl mx-auto">
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-amber-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 1: Excavation & Site Prep</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p className="text-xs text-slate-500 italic print:text-black">// Working space (overdig) is added to all sides for formwork placement.</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Trench Length</span> = L + (2 × Overdig)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Trench Length</span> = {results.lenM.toFixed(2)} + (2 × {(inputs.overdig * unitToMeter[unitSystem]).toFixed(2)}) = <span className="font-bold text-slate-900">{(results.lenM + 2*(inputs.overdig * unitToMeter[unitSystem])).toFixed(2)} m</span></p>
                        <p><span className="text-slate-400 print:text-black font-bold">Trench Width</span> = W + (2 × Overdig)</p>
                        <p><span className="text-slate-400 print:text-black font-bold">Trench Width</span> = {results.widM.toFixed(2)} + (2 × {(inputs.overdig * unitToMeter[unitSystem]).toFixed(2)}) = <span className="font-bold text-slate-900">{(results.widM + 2*(inputs.overdig * unitToMeter[unitSystem])).toFixed(2)} m</span></p>
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Total Excavation Vol</span> = Trench L × Trench W × Depth</p>
                        <p className="text-amber-700 print:text-black font-bold text-base mt-2">Excavation Volume = {results.excavationVolM3.toFixed(2)} m³</p>
                    </div>
                 </div>

                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                    <h3 className="text-lg font-bold text-cyan-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 2: Volume Matrix (PCC & Structural)</h3>
                    <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                        <p><span className="text-slate-400 print:text-black font-bold">PCC (Blinding) Vol</span> = Trench L × Trench W × PCC Thickness</p>
                        <p><span className="text-slate-400 print:text-black font-bold">PCC Vol</span> = {(results.lenM + 2*(inputs.overdig * unitToMeter[unitSystem])).toFixed(2)}m × {(results.widM + 2*(inputs.overdig * unitToMeter[unitSystem])).toFixed(2)}m × {(inputs.pccThickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm']).toFixed(3)}m = <span className="font-bold text-slate-900">{results.pccVolM3.toFixed(3)} m³</span></p>
                        <div className="w-full h-px bg-slate-200 my-2"></div>
                        {foundationType === 'slab' ? (
                            <>
                                <p><span className="text-slate-400 print:text-black font-bold">Exact Structural Vol</span> = L × W × Thickness</p>
                                <p><span className="text-slate-400 print:text-black font-bold">Exact Structural Vol</span> = {results.lenM.toFixed(3)}m × {results.widM.toFixed(3)}m × {results.thickM.toFixed(3)}m = <span className="font-bold text-slate-900">{results.exactVolumeM3.toFixed(3)} m³</span></p>
                            </>
                        ) : foundationType === 'stone' ? (
                            <>
                                <p><span className="text-slate-400 print:text-black font-bold">Stone Wall Vol</span> = L × Wall Thickness × Height</p>
                                <p><span className="text-slate-400 print:text-black font-bold">Stone Wall Vol</span> = {results.lenM.toFixed(3)}m × {results.thickM.toFixed(3)}m × {results.stemHtM.toFixed(3)}m = <span className="font-bold text-slate-900">{(results.lenM * results.thickM * results.stemHtM).toFixed(3)} m³</span></p>
                                <br/>
                                <p><span className="text-slate-400 print:text-black font-bold">Total Exact Vol</span> = <span className="font-bold text-slate-900">{results.exactVolumeM3.toFixed(3)} m³</span></p>
                            </>
                        ) : (
                            <>
                                <p><span className="text-slate-400 print:text-black font-bold">Footing Vol</span> = L × Footing Width × Footing Depth</p>
                                <p><span className="text-slate-400 print:text-black font-bold">Footing Vol</span> = {results.lenM.toFixed(3)}m × {results.footWidM.toFixed(3)}m × {results.footDepthM.toFixed(3)}m = <span className="font-bold text-slate-900">{(results.lenM * results.footWidM * results.footDepthM).toFixed(3)} m³</span></p>
                                <br/>
                                <p><span className="text-slate-400 print:text-black font-bold">Stem Wall Vol</span> = L × Wall Thickness × Stem Height</p>
                                <p><span className="text-slate-400 print:text-black font-bold">Stem Wall Vol</span> = {results.lenM.toFixed(3)}m × {results.thickM.toFixed(3)}m × {results.stemHtM.toFixed(3)}m = <span className="font-bold text-slate-900">{(results.lenM * results.thickM * results.stemHtM).toFixed(3)} m³</span></p>
                                <br/>
                                <p><span className="text-slate-400 print:text-black font-bold">Total Exact Vol</span> = Footing + Stem = <span className="font-bold text-slate-900">{results.exactVolumeM3.toFixed(3)} m³</span></p>
                            </>
                        )}
                        <br/>
                        <p><span className="text-slate-400 print:text-black font-bold">Order Vol (+{inputs.concreteWastage}% Wastage)</span> = {results.exactVolumeM3.toFixed(3)} × {(1 + inputs.concreteWastage/100).toFixed(2)}</p>
                        <p className="text-cyan-700 print:text-black font-bold text-base mt-2">Final Structural Volume = {results.orderVolumeM3.toFixed(3)} m³</p>
                    </div>
                 </div>

                 {foundationType !== 'stone' && (
                   <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                      <h3 className="text-lg font-bold text-orange-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 3: Steel Reinforcement (Rebar)</h3>
                      <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                          <p><span className="text-slate-400 print:text-black font-bold">Density of Steel</span> = 7850 kg/m³</p>
                          <p><span className="text-slate-400 print:text-black font-bold">Steel Ratio ({foundationType})</span> = {foundationType === 'slab' ? '0.5%' : foundationType === 'stem' ? '0.6%' : foundationType === 'tshaped' ? '0.7%' : '0.75%'} of concrete volume</p>
                          <br/>
                          <p><span className="text-slate-400 print:text-black font-bold">Exact Weight</span> = Structural Vol × Ratio × Density</p>
                          <p><span className="text-slate-400 print:text-black font-bold">Exact Weight</span> = {results.exactVolumeM3.toFixed(3)} × {foundationType === 'slab' ? '0.005' : foundationType === 'stem' ? '0.006' : foundationType === 'tshaped' ? '0.007' : '0.0075'} × 7850 = <span className="font-bold text-slate-900">{results.exactRebarKg.toFixed(2)} kg</span></p>
                          <br/>
                          <p><span className="text-slate-400 print:text-black font-bold">Order Weight (+{inputs.rebarWastage}% Wastage)</span> = {results.exactRebarKg.toFixed(2)} × {(1 + inputs.rebarWastage/100).toFixed(2)}</p>
                          <p className="text-orange-700 print:text-black font-bold text-base mt-2">Final Rebar Weight = {results.orderRebarKg.toFixed(2)} kg</p>
                      </div>
                   </div>
                 )}

                 {foundationType !== 'stone' && (
                   <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:shadow-none print:border-black print:border-2">
                      <h3 className="text-lg font-bold text-indigo-700 border-b border-slate-100 pb-3 mb-4 print:text-black">Step 4: Formwork (Shuttering) Area</h3>
                      <div className="font-mono text-sm space-y-3 text-slate-700 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0">
                          {foundationType === 'slab' ? (
                              <>
                                  <p><span className="text-slate-400 print:text-black font-bold">Exposed Perimeter</span> = 2 × (L + W)</p>
                                  <p><span className="text-slate-400 print:text-black font-bold">Formwork Area</span> = Perimeter × Thickness</p>
                                  <p><span className="text-slate-400 print:text-black font-bold">Formwork Area</span> = (2 × ({results.lenM.toFixed(2)} + {results.widM.toFixed(2)})) × {results.thickM.toFixed(3)}</p>
                              </>
                          ) : (
                              <>
                                  <p className="text-xs text-slate-500 italic print:text-black">// Estimating formwork for both sides of the trench / stem wall.</p>
                                  <p><span className="text-slate-400 print:text-black font-bold">Formwork Area</span> = (2 × L × Stem Height) + (2 × L × Footing Depth)</p>
                              </>
                          )}
                          <p className="text-indigo-700 print:text-black font-bold text-base mt-2">Total Formwork Surface = {results.formworkAreaM2.toFixed(2)} m²</p>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        )}

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
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Foundation Profile</td><td className="py-2 font-medium text-right capitalize">{foundationTypes.find(t => t.value === foundationType)?.label}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Dimensions (L×W)</td><td className="py-2 font-medium text-right">{inputs.length} × {inputs.width} {unitSystem}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Base Thickness</td><td className="py-2 font-medium text-right">{inputs.thickness} {unitSystem === 'ft' ? 'in' : 'cm'}</td></tr>
                                {foundationType !== 'slab' && (
                                  <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Wall Height</td><td className="py-2 font-medium text-right">{inputs.stemHeight} {unitSystem === 'ft' ? 'in' : 'cm'}</td></tr>
                                )}
                                {(foundationType !== 'slab' && foundationType !== 'stone') && (
                                  <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Footing Dimension</td><td className="py-2 font-medium text-right">{inputs.footingWidth}W × {inputs.footingDepth}D {unitSystem === 'ft' ? 'in' : 'cm'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 print:text-black">Material Quantities</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Excavation Cut</td><td className="py-2 font-medium text-right text-amber-600 print:text-black">{unitSystem === 'ft' ? results.excavationYd3.toFixed(2) : results.excavationVolM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">PCC Blinding (+{inputs.concreteWastage}%)</td><td className="py-2 font-medium text-right text-blue-600 print:text-black">{unitSystem === 'ft' ? results.orderPccYd3.toFixed(2) : results.orderPccM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td></tr>
                                <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">{foundationType === 'stone' ? 'Required Stone' : 'Required Concrete'} (+{inputs.concreteWastage}%)</td><td className="py-2 font-medium text-right text-cyan-600 print:text-black">{unitSystem === 'ft' ? results.orderVolumeYd3.toFixed(2) : results.orderVolumeM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td></tr>
                                {foundationType !== 'stone' && (
                                  <>
                                    <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Required Steel (+{inputs.rebarWastage}%)</td><td className="py-2 font-medium text-right text-orange-600 print:text-black">{results.orderRebarKg.toFixed(0)} kg</td></tr>
                                    <tr className="border-b border-slate-100 print:border-slate-300"><td className="py-2 text-slate-500 print:text-black">Formwork Surface</td><td className="py-2 font-medium text-right">{results.formworkAreaM2.toFixed(2)} m²</td></tr>
                                  </>
                                )}
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
                                <td className="p-4"><p className="font-bold text-slate-800">Earthworks & Excavation</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{unitSystem === 'ft' ? results.excavationYd3.toFixed(2) : results.excavationVolM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.excavationRate}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costExcavation.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">PCC Blinding Layer</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{unitSystem === 'ft' ? results.orderPccYd3.toFixed(2) : results.orderPccM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.pccPrice}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costPcc.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            <tr>
                                <td className="p-4"><p className="font-bold text-slate-800">{foundationType === 'stone' ? 'Stone Masonry' : 'Ready-Mix Structural Concrete'}</p></td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{unitSystem === 'ft' ? results.orderVolumeYd3.toFixed(2) : results.orderVolumeM3.toFixed(2)} {unitSystem === 'ft' ? 'yd³' : 'm³'}</td>
                                <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.concretePrice}</td>
                                <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costConcrete.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                            </tr>
                            {foundationType !== 'stone' && (
                              <>
                                <tr>
                                    <td className="p-4"><p className="font-bold text-slate-800">Steel Reinforcement</p></td>
                                    <td className="p-4 font-mono text-slate-600 print:text-black">{results.orderRebarKg.toFixed(2)} kg</td>
                                    <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.rebarPrice}</td>
                                    <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costRebar.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                                </tr>
                                <tr>
                                    <td className="p-4"><p className="font-bold text-slate-800">Timber Formwork</p></td>
                                    <td className="p-4 font-mono text-slate-600 print:text-black">{results.formworkAreaM2.toFixed(2)} m²</td>
                                    <td className="p-4 font-mono text-slate-600 print:text-black">{inputs.currency}{inputs.formworkPrice}</td>
                                    <td className="p-4 font-mono font-bold text-right text-slate-800">{inputs.currency}{results.costFormwork.toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                                </tr>
                              </>
                            )}
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