import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const defaultAppliances = [
  { id: 'light', name: 'LED Light Points (18W)', watts: 18, count: 24, wireGauge: '1.0 sq mm' },
  { id: 'fan', name: 'Ceiling Fans (75W)', watts: 75, count: 6, wireGauge: '1.5 sq mm' },
  { id: 'plug6a', name: '6A Convenience Sockets', watts: 100, count: 18, wireGauge: '1.5 sq mm' },
  { id: 'plug16a', name: '16A Power Plugs (Heater/AC)', watts: 1500, count: 6, wireGauge: '4.0 sq mm' },
  { id: 'ac', name: 'Split AC (1.5 Ton)', watts: 2000, count: 3, wireGauge: '4.0 sq mm' },
  { id: 'geyser', name: 'Water Geyser (2kW)', watts: 2000, count: 2, wireGauge: '4.0 sq mm' },
  { id: 'pump', name: 'Water Pump (1 HP)', watts: 750, count: 1, wireGauge: '2.5 sq mm' }
];

export default function ElectricalWiringCalculator() {
  const [appliances, setAppliances] = useState(defaultAppliances);
  const [conduitPricePerMeter, setConduitPricePerMeter] = useState(25);
  const [avgWireRollPrice, setAvgWireRollPrice] = useState(1850);
  const [mcbPrice, setMcbPrice] = useState(220);
  const [laborPerPoint, setLaborPerPoint] = useState(150);
  const [currency] = useState('₹');

  const [mode, setMode] = useState('normal');
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleCountChange = (id, val) => {
    setAppliances(prev => prev.map(a => a.id === id ? { ...a, count: Math.max(0, parseInt(val) || 0) } : a));
  };
  const handlePrint = () => window.print();

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth || 800, h = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(12, 10, 14);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.setSize(w, h);
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
    controlsRef.current = controls;
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffedd5, 1.5);
    dl.position.set(15, 20, 15);
    scene.add(dl);
    const grid = new THREE.GridHelper(30, 30, 0x0ea5e9, 0x334155);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);
    let animId;
    const animate = () => { animId = requestAnimationFrame(animate); controls.update(); if (document.hidden || container.clientWidth === 0) return;
 renderer.render(scene, camera); };
    animate();
    const handleResize = () => {
      if (!container) return;
      const cw = container.clientWidth, ch = container.clientHeight;
      if (cw > 0 && ch > 0) { camera.aspect = cw / ch; camera.updateProjectionMatrix(); renderer.setSize(cw, ch); }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    window.addEventListener('resize', handleResize);
    return () => { ro.disconnect(); window.removeEventListener('resize', handleResize); cancelAnimationFrame(animId); if (container && renderer.domElement) container.removeChild(renderer.domElement); disposeObject(scene);
 renderer.dispose(); };
  }, []);


  function calculateAndRender() {
    const scene = sceneRef.current;
    if (!scene) return;

    let totalWatts = 0, totalPoints = 0;
    appliances.forEach(a => { totalWatts += a.watts * a.count; totalPoints += a.count; });

    const totalLoadKw = totalWatts / 1000;
    const totalLoadKva = totalLoadKw / 0.85;
    const totalWireMeters = totalPoints * 14;
    const totalWireRolls = Math.ceil(totalWireMeters / 90);
    const totalConduitMeters = totalPoints * 4.5;
    const conduitPipes10ft = Math.ceil(totalConduitMeters / 3);
    const mcbWays = Math.ceil(totalPoints / 6) + 2;
    const costWire = totalWireRolls * avgWireRollPrice;
    const costConduit = totalConduitMeters * conduitPricePerMeter;
    const costMcbs = mcbWays * mcbPrice;
    const costLabor = totalPoints * laborPerPoint;
    const grandTotal = costWire + costConduit + costMcbs + costLabor;

    setResults({ totalPoints, totalLoadKw, totalLoadKva, totalWireMeters, totalWireRolls, totalConduitMeters, conduitPipes10ft, mcbWays, costWire, costConduit, costMcbs, costLabor, grandTotal });

    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicElectric') toRemove.push(c); });
    toRemove.forEach(c => { scene.remove(c); disposeObject(c); if (c.material) c.material.dispose(); });

    const group = new THREE.Group();
    group.name = 'dynamicElectric';
    const isBlueprint = visualTheme === 'blueprint';
    const conduitMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0xf59e0b, roughness: 0.4, wireframe: isBlueprint });
    const dbMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0x334155, metalness: 0.6 });
    const switchMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0284c7 : 0xffffff });

    // DB box
    const dbG = new THREE.BoxGeometry(0.8, 1.2, 0.3);
    dbG.translate(0, 1.5, -4.2);
    group.add(new THREE.Mesh(dbG, dbMat));

    // Conduit pipes
    const addPipe = (len, pos, rotZ = 0) => {
      const g = new THREE.CylinderGeometry(0.04, 0.04, len, 12);
      const m = new THREE.Mesh(g, conduitMat);
      m.position.set(...pos);
      m.rotation.z = rotZ;
      group.add(m);
    };
    addPipe(4, [0, 1.5, -4.2], Math.PI / 2);
    addPipe(3.5, [-3.5, 1.5, -4.2]);
    addPipe(3.5, [3.5, 1.5, -4.2]);

    // Switchboards
    [-3.5, 3.5].forEach(x => {
      const g = new THREE.BoxGeometry(0.3, 0.3, 0.1);
      const m = new THREE.Mesh(g, switchMat);
      m.position.set(x, 1.2, -4.15);
      group.add(m);
    });

    scene.add(group);
  }

  // Recalculate 150ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const t = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(t);
  }, [appliances, conduitPricePerMeter, avgWireRollPrice, mcbPrice, laborPerPoint, visualTheme]);

  return (
    <div className="flex flex-col wide:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full wide:w-[380px] shrink-0 bg-surface rounded-lg p-5 sm:p-6 border border-line flex flex-col h-auto wide:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sunken border border-line-control flex items-center justify-center text-accent">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Electrical Wiring</h2>
              <p className="text-xs text-muted font-mono">Load kW · Wire Coils · MCB Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Point Schedule */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2">
              Electrical Point Schedule
            </h3>
            <div className="space-y-2">
              {appliances.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-semibold text-ink-2 truncate">{a.name}</p>
                    <p className="text-xs text-muted font-mono">{a.watts}W · {a.wireGauge}</p>
                  </div>
                  <input
                    type="number"
                    aria-label={`Number of ${a.name} points`}
                    value={a.count}
                    onChange={e => handleCountChange(a.id, e.target.value)}
                    className="w-14 bg-sunken border border-line-control rounded-lg p-1.5 text-xs font-bold text-ink text-right outline-none focus:ring-1 focus:ring-focus"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rates */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2">
              Material Rates
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Wire Coil (90m)', val: avgWireRollPrice, setter: setAvgWireRollPrice },
                { label: 'Conduit / m', val: conduitPricePerMeter, setter: setConduitPricePerMeter },
                { label: 'MCB / CB', val: mcbPrice, setter: setMcbPrice },
                { label: 'Labour / Point', val: laborPerPoint, setter: setLaborPerPoint },
              ].map(({ label, val, setter }) => (
                <div key={label} className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                  <span className="text-xs text-muted ml-1">{label}</span>
                  <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                    <span className="text-ink">{currency}</span>
                    <input type="number" aria-label={label} value={val} onChange={e => setter(parseFloat(e.target.value) || 0)} className="w-16 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full wide:w-[calc(100%-404px)] bg-surface rounded-lg border border-line flex flex-col overflow-hidden relative z-10 wide:h-[calc(100vh-140px)] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-line bg-surface z-30 shrink-0 print:hidden">
          <div className="flex-1 min-h-10 flex items-center">
            {results && mode === 'normal' ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 animate-fade-in">
                <div className="flex flex-col">
                  <span className="text-xs text-muted font-bold">Total Load</span>
                  <span className="text-lg font-semibold text-ink leading-none">{results.totalLoadKw?.toFixed(2)} kW ({results.totalLoadKva?.toFixed(2)} kVA)</span>
                </div>
                <div className="w-px h-8 bg-line"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted font-bold">Total Cost</span>
                  <span className="text-lg font-semibold text-ink leading-none">{currency}{results.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-ink">{mode === 'civil' ? 'Electrical BOQ' : 'Load Calculations'}</h2>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {(mode === 'civil' || mode === 'math') && (
              <button onClick={handlePrint} className="bg-sunken hover:bg-primary border border-line-control hover:border-primary text-ink hover:text-on-primary px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
              </button>
            )}
            <div className="bg-sunken p-1 rounded-lg border border-line flex gap-1">
              <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all ${mode === 'normal' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>3D Vis</button>
              <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all ${mode === 'math' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>Math</button>
              <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all ${mode === 'civil' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>Report</button>
            </div>
          </div>
        </div>

        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-[#14171B] print:hidden`}>
          <div ref={mountRef} className="absolute inset-0 cursor-move" role="img" aria-label="3D model of the current inputs. All quantities are listed in the Math and Report views."></div>
          <div className="absolute bottom-6 right-6 z-30 bg-sunken p-1 rounded-lg border border-line flex gap-1">
            <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-xs font-bold  transition-all ${visualTheme === 'realistic' ? 'bg-sunken text-primary border border-line-control' : 'text-muted hover:text-ink-2'}`}>Realistic</button>
            <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-xs font-bold  transition-all ${visualTheme === 'blueprint' ? 'bg-sunken text-primary border border-line-control' : 'text-muted hover:text-ink-2'}`}>Blueprint</button>
          </div>
        </div>

        {results && mode === 'math' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink">
            <div className="border-b-2 border-line pb-6 mb-8"><h2 className="text-2xl font-semibold text-ink">Electrical Load Calculations</h2><p className="text-xs text-muted font-mono mt-1">IS:732 Code for Wiring & IS:8884 DB Installation</p></div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-surface border border-line rounded-lg p-6">
                <h3 className="text-base font-bold text-ink mb-3">Step 1: Connected Load</h3>
                <div className="font-mono text-xs space-y-1 bg-bg p-4 rounded-lg">
                  {appliances.filter(a => a.count > 0).map(a => <p key={a.id}>{a.name}: {a.count} × {a.watts}W = <span className="font-bold">{(a.count * a.watts)} W</span></p>)}
                  <div className="border-t border-line pt-2 mt-2">
                    <p className="font-bold text-ink">Total = {results.totalLoadKw.toFixed(2)} kW = {results.totalLoadKva.toFixed(2)} kVA (PF: 0.85)</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface border border-line rounded-lg p-6">
                <h3 className="text-base font-bold text-ink mb-3">Step 2: Wire & Conduit Takeoff</h3>
                <div className="font-mono text-xs space-y-2 bg-bg p-4 rounded-lg">
                  <p>Total Points = {results.totalPoints} nos</p>
                  <p>Wire Length = {results.totalPoints} pts × 14m avg run = {results.totalWireMeters} m</p>
                  <p>Wire Coils (90m/coil) = ⌈{results.totalWireMeters} ÷ 90⌉ = <span className="font-bold text-ink">{results.totalWireRolls} coils</span></p>
                  <p>Conduit = {results.totalPoints} pts × 4.5m = {results.totalConduitMeters.toFixed(0)} m ({results.conduitPipes10ft} pipes)</p>
                  <p>MCB Ways = {results.mcbWays} (≈ 6 pts/circuit + main + spare)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {results && mode === 'civil' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink print:bg-white print:text-black">
            <div className="border-b-2 border-line pb-6 mb-8 flex justify-between items-end">
              <div><h2 className="text-2xl font-semibold text-ink">Electrical Bill of Quantities</h2><p className="text-xs text-muted font-mono">Wiring, Conduit & Distribution Board Schedule</p></div>
              <span className="text-xs font-bold text-ink bg-sunken px-3 py-1 rounded-full border border-primary">IS 732</span>
            </div>
            <div className="overflow-x-auto bg-surface rounded-lg border border-line p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-muted uppercase font-semibold text-xs">
                  <tr><th scope="col" className="py-3 px-4">Item</th><th scope="col" className="py-3 px-4">Qty</th><th scope="col" className="py-3 px-4">Unit</th><th scope="col" className="py-3 px-4">Rate</th><th scope="col" className="py-3 px-4 text-right">Total ({currency})</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr><td className="py-3 px-4 font-semibold">Electrical Wire (90m coils)</td><td className="py-3 px-4 font-bold">{results.totalWireRolls}</td><td className="py-3 px-4">Coils</td><td className="py-3 px-4">{currency}{avgWireRollPrice}/coil</td><td className="py-3 px-4 text-right font-bold">{currency}{results.costWire.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">PVC Conduit Pipes</td><td className="py-3 px-4 font-bold">{results.totalConduitMeters.toFixed(0)}</td><td className="py-3 px-4">Meters</td><td className="py-3 px-4">{currency}{conduitPricePerMeter}/m</td><td className="py-3 px-4 text-right font-bold">{currency}{results.costConduit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">MCBs & Distribution Board</td><td className="py-3 px-4 font-bold">{results.mcbWays}</td><td className="py-3 px-4">Ways / Breakers</td><td className="py-3 px-4">{currency}{mcbPrice}/MCB</td><td className="py-3 px-4 text-right font-bold">{currency}{results.costMcbs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">Installation Labour</td><td className="py-3 px-4 font-bold">{results.totalPoints}</td><td className="py-3 px-4">Points</td><td className="py-3 px-4">{currency}{laborPerPoint}/point</td><td className="py-3 px-4 text-right font-bold">{currency}{results.costLabor.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                </tbody>
                <tfoot className="border-t-2 border-line font-bold bg-bg">
                  <tr><td colSpan="4" className="py-3 px-4 text-right">Grand Total</td><td className="py-3 px-4 text-right text-ink text-sm">{currency}{results.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
