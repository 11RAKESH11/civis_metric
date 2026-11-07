import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const initialTrades = [
  { id: 'mason', name: 'Head Mason / Bricklayer', dailyWage: 1100, menCount: 3, days: 25 },
  { id: 'barbender', name: 'Steel Barbender', dailyWage: 950, menCount: 2, days: 15 },
  { id: 'carpenter', name: 'Shuttering Carpenter', dailyWage: 950, menCount: 2, days: 18 },
  { id: 'plasterer', name: 'Plasterer (Finishing)', dailyWage: 1000, menCount: 2, days: 14 },
  { id: 'painter', name: 'Painter', dailyWage: 850, menCount: 2, days: 12 },
  { id: 'electrician', name: 'Electrician / Wireman', dailyWage: 900, menCount: 1, days: 10 },
  { id: 'helper', name: 'Unskilled Helpers / Beldar', dailyWage: 650, menCount: 6, days: 30 }
];

export default function LabourCostCalculator() {
  const [trades, setTrades] = useState(initialTrades);
  const [contractorMargin, setContractorMargin] = useState(10); // 10% supervisor/contractor fee
  const [overtimeAllowance, setOvertimeAllowance] = useState(5);
  const [currency] = useState('₹');

  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleFieldChange = (id, field, value) => {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, [field]: Math.max(0, parseFloat(value) || 0) } : t));
  };

  const handlePrint = () => window.print();

  // --- Three.js Setup ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
    sceneRef.current = scene;

    const container = mountRef.current;
    if (!container) return;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(12, 10, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
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
    controls.maxDistance = 250;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(15, 20, 15);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(30, 30, 0x0ea5e9, 0x334155);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
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

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      disposeObject(scene);
      renderer.dispose();
    };
  }, []);

  // --- Calculation & 3D Workforce Rendering ---

  function calculateAndRender() {
    const scene = sceneRef.current;
    if (!scene) return;

    let totalManDays = 0;
    let baseWages = 0;
    let totalHeadcount = 0;

    const tradeBreakdown = trades.map(t => {
      const manDays = t.menCount * t.days;
      const totalWage = manDays * t.dailyWage;
      totalManDays += manDays;
      baseWages += totalWage;
      totalHeadcount += t.menCount;
      return { ...t, manDays, totalWage };
    });

    const marginAmount = baseWages * (contractorMargin / 100);
    const overtimeAmount = baseWages * (overtimeAllowance / 100);
    const grandTotal = baseWages + marginAmount + overtimeAmount;

    setResults({
      totalHeadcount,
      totalManDays,
      baseWages,
      marginAmount,
      overtimeAmount,
      grandTotal,
      tradeBreakdown
    });

    // 3D Site Workforce Representation
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicLabor') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicLabor';

    const isBlueprint = visualTheme === 'blueprint';
    const helmetMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0xf59e0b, roughness: 0.3 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0x0284c7, roughness: 0.8 });

    // Render 3D Workforce Avatars
    let avatarIndex = 0;
    trades.forEach(t => {
      for (let i = 0; i < Math.min(4, t.menCount); i++) {
        const angle = (avatarIndex / 16) * Math.PI * 2;
        const radius = 3.5 + (avatarIndex % 2) * 1.5;
        const posX = Math.cos(angle) * radius;
        const posZ = Math.sin(angle) * radius;

        // Body
        const bodyGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.2, 12);
        bodyGeom.translate(posX, 0.6, posZ);
        mainGroup.add(new THREE.Mesh(bodyGeom, bodyMat));

        // Helmet/Head
        const headGeom = new THREE.SphereGeometry(0.2, 12, 12);
        headGeom.translate(posX, 1.3, posZ);
        mainGroup.add(new THREE.Mesh(headGeom, helmetMat));

        avatarIndex++;
      }
    });

    scene.add(mainGroup);
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(handler);
  }, [trades, contractorMargin, overtimeAllowance, visualTheme]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-surface rounded-lg border border-line dark:border-line">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink dark:text-ink tracking-tight">Labour Cost Estimator</h2>
            <p className="text-xs text-muted dark:text-muted">Trade-wise man-days, daily wages, crew sizing & contractor markup</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setVisualTheme(v => v === 'realistic' ? 'blueprint' : 'realistic')} className="px-3 py-1.5 bg-sunken dark:bg-sunken hover:bg-sunken dark:hover:bg-line text-ink-2 dark:text-ink-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${visualTheme === 'realistic' ? 'bg-primary' : 'bg-primary'}`}></span>
            {visualTheme === 'realistic' ? 'Realistic 3D' : 'Blueprint Wire'}
          </button>

          <button onClick={handlePrint} className="p-2 bg-sunken dark:bg-sunken hover:bg-sunken dark:hover:bg-line text-ink-2 dark:text-ink-2 rounded-lg text-xs transition-all" title="Print BOQ Report">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </div>

      {/* Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-6 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line flex flex-col gap-4">
            <h3 className="text-sm font-bold text-muted dark:text-muted">Trade Crew & Wage Schedule</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg dark:bg-bg text-muted dark:text-muted uppercase font-semibold text-xs">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Trade Role</th>
                    <th scope="col" className="py-2.5 px-3">Daily Rate ({currency})</th>
                    <th scope="col" className="py-2.5 px-3">Headcount</th>
                    <th scope="col" className="py-2.5 px-3">Days</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-line">
                  {trades.map(t => (
                    <tr key={t.id}>
                      <td className="py-2.5 px-3 font-semibold text-ink dark:text-ink">{t.name}</td>
                      <td className="py-2.5 px-3">
                        <input type="number" aria-label={`Daily rate for ${t.name}`} value={t.dailyWage} onChange={e => handleFieldChange(t.id, 'dailyWage', e.target.value)} className="w-16 bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-2 py-1 text-xs" />
                      </td>
                      <td className="py-2.5 px-3">
                        <input type="number" aria-label={`Headcount of ${t.name}`} value={t.menCount} onChange={e => handleFieldChange(t.id, 'menCount', e.target.value)} className="w-12 bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-2 py-1 text-xs" />
                      </td>
                      <td className="py-2.5 px-3">
                        <input type="number" aria-label={`Days for ${t.name}`} value={t.days} onChange={e => handleFieldChange(t.id, 'days', e.target.value)} className="w-12 bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-2 py-1 text-xs" />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-ink dark:text-ink">
                        {currency}{(t.menCount * t.days * t.dailyWage).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line dark:border-line">
              <div>
                <label htmlFor="labourcost-field-0" className="text-xs font-medium text-muted">Contractor / Supervisor Fee (%)</label>
                <input id="labourcost-field-0" type="number" value={contractorMargin} onChange={e => setContractorMargin(parseFloat(e.target.value) || 0)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-1.5 text-xs font-semibold" />
              </div>
              <div>
                <label htmlFor="labourcost-field-1" className="text-xs font-medium text-muted">Overtime & Holidays (%)</label>
                <input id="labourcost-field-1" type="number" value={overtimeAllowance} onChange={e => setOvertimeAllowance(parseFloat(e.target.value) || 0)} className="w-full bg-bg dark:bg-bg border border-line dark:border-line rounded-lg px-3 py-1.5 text-xs font-semibold" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="h-[280px] bg-surface rounded-lg overflow-hidden relative border border-line">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 text-ink text-xs">
              <span className="text-primary font-bold">3D Site Workforce Representation</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 px-3 py-2 rounded-lg border border-white/10 text-ink text-right">
              <p className="text-xs text-muted">Total Labour Budget</p>
              <p className="text-lg font-bold text-primary">{currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted">Total Man-Days</p>
              <p className="text-base font-bold text-ink dark:text-ink mt-1">{results?.totalManDays} Days</p>
            </div>
            <div className="p-4 bg-surface dark:bg-surface rounded-lg border border-line dark:border-line">
              <p className="text-xs text-muted">Active Crew Size</p>
              <p className="text-base font-bold text-accent mt-1">{results?.totalHeadcount} Workers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
