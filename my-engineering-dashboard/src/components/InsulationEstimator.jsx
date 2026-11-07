import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const insulationMaterials = [
  { id: 'fiberglass', name: 'Fiberglass Glass Wool', rValuePerInch: 3.2, packSqft: 100, costPerSqft: 28, color: 0xfef08a },
  { id: 'rockwool', name: 'Rockwool / Stone Wool', rValuePerInch: 4.0, packSqft: 64, costPerSqft: 45, color: 0x78716c },
  { id: 'xps', name: 'XPS Extruded Polystyrene', rValuePerInch: 5.0, packSqft: 32, costPerSqft: 55, color: 0x38bdf8 },
  { id: 'eps', name: 'EPS Thermocol Board', rValuePerInch: 3.8, packSqft: 32, costPerSqft: 22, color: 0xfafafa },
  { id: 'sprayfoam', name: 'Closed-Cell Spray Foam', rValuePerInch: 6.5, packSqft: 1, costPerSqft: 75, color: 0xfde047 }
];

export default function InsulationEstimator() {
  const [inputs, setInputs] = useState({
    materialId: 'rockwool',
    areaSqft: 1500,
    thicknessIn: 3,
    wastage: 5,
    installationRatePerSqft: 8,
    currency: '₹'
  });

  const [mode, setMode] = useState('normal');
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsed = ['currency', 'materialId'].includes(name) ? value : parseFloat(value) || 0;
    if (typeof parsed === 'number') parsed = Math.max(0, parsed);
    setInputs(prev => ({ ...prev, [name]: parsed }));
  };

  const handlePrint = () => window.print();

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14171B);
    sceneRef.current = scene;
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth || 800, h = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(10, 8, 12);
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
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);
    const grid = new THREE.GridHelper(20, 20, 0x0ea5e9, 0x1e293b);
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
    const { materialId, areaSqft, thicknessIn, wastage, installationRatePerSqft } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedMat = insulationMaterials.find(m => m.id === materialId) || insulationMaterials[1];
    const netSqft = areaSqft || 1000;
    const totalOrderSqft = netSqft * (1 + (wastage / 100));
    const achievedRValue = (thicknessIn || 2) * selectedMat.rValuePerInch;
    const achievedUValue = achievedRValue > 0 ? (1 / achievedRValue) : 0;
    const totalPacks = Math.ceil(totalOrderSqft / (selectedMat.packSqft || 1));
    const estimatedHvacSavingsPct = Math.min(45, Math.round(achievedRValue * 2.2));
    const materialCost = totalOrderSqft * selectedMat.costPerSqft;
    const installCost = totalOrderSqft * installationRatePerSqft;
    const grandTotal = materialCost + installCost;

    setResults({ netSqft, totalOrderSqft, achievedRValue, achievedUValue, totalPacks, estimatedHvacSavingsPct, materialCost, installCost, grandTotal, selectedMat });

    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicInsulation') toRemove.push(c); });
    toRemove.forEach(c => { scene.remove(c); disposeObject(c); if (c.material) c.material.dispose(); });

    const group = new THREE.Group();
    group.name = 'dynamicInsulation';
    const isBlueprint = visualTheme === 'blueprint';

    // 3 layers: exterior | insulation | interior
    const extMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0x64748b, wireframe: isBlueprint, roughness: 0.7 });
    const extG = new THREE.BoxGeometry(6, 4, 0.2);
    extG.translate(0, 2, -0.35);
    group.add(new THREE.Mesh(extG, extMat));

    const insulMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : selectedMat.color, roughness: 0.95, wireframe: isBlueprint });
    const insulG = new THREE.BoxGeometry(6, 4, 0.4);
    insulG.translate(0, 2, 0);
    group.add(new THREE.Mesh(insulG, insulMat));

    const intMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0284c7 : 0xe2e8f0, wireframe: isBlueprint });
    const intG = new THREE.BoxGeometry(6, 4, 0.2);
    intG.translate(0, 2, 0.35);
    group.add(new THREE.Mesh(intG, intMat));

    scene.add(group);
  }

  // Recalculate 150ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const t = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(t);
  }, [inputs, visualTheme]);

  return (
    <div className="flex flex-col wide:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full wide:w-[380px] shrink-0 bg-surface rounded-lg p-5 sm:p-6 border border-line flex flex-col h-auto wide:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sunken border border-line-control flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Insulation Estimator</h2>
              <p className="text-xs text-muted font-mono">Thermal R-Value & Pack Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Material */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors mb-3">
              Insulation Material
            </h3>
            <div className="flex flex-col gap-2">
              {insulationMaterials.map(m => (
                <button key={m.id} onClick={() => setInputs(p => ({ ...p, materialId: m.id }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold   transition-all text-left ${inputs.materialId === m.id ? 'bg-primary text-on-primary' : 'bg-surface border border-line text-muted hover:text-ink hover:border-line-control'}`}>
                  {m.name} — R-{m.rValuePerInch}/inch
                </button>
              ))}
            </div>
          </div>

          {/* Area & Thickness */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2">
              Area & Thickness
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="insulationestimator-areaSqft" className="block text-xs text-muted mb-1">Area (sq.ft)</label>
                <input id="insulationestimator-areaSqft" type="number" name="areaSqft" value={inputs.areaSqft} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
              </div>
              <div>
                <label htmlFor="insulationestimator-thicknessIn" className="block text-xs text-muted mb-1">Thickness (in)</label>
                <input id="insulationestimator-thicknessIn" type="number" step="0.5" name="thicknessIn" value={inputs.thicknessIn} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
              </div>
            </div>
          </div>

          {/* Performance Preview */}
          <div className="bg-sunken p-4 rounded-lg border border-line-control">
            <h3 className="text-xs font-bold text-primary mb-3 flex items-center gap-2">
              Thermal Performance
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted">R-Value Achieved:</span><span className="font-bold text-primary">R-{results?.achievedRValue?.toFixed(1) || '—'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted">U-Factor:</span><span className="font-bold text-primary">{results?.achievedUValue?.toFixed(3) || '—'} BTU/hr·ft²·°F</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted">HVAC Savings Est.:</span><span className="font-bold text-ink">~{results?.estimatedHvacSavingsPct || 0}% reduction</span></div>
            </div>
          </div>

          {/* Wastage & Labor */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2">
              Wastage & Installation
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                <span className="text-xs text-muted ml-1">Cutting Wastage</span>
                <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control"><input aria-label="Wastage (%)" type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-12 bg-transparent p-1 text-right outline-none text-ink font-mono" /><span className="text-muted ml-1">%</span></div>
              </div>
              <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                <span className="text-xs text-muted ml-1">Labor per sq.ft</span>
                <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control"><span className="text-ink">{inputs.currency}</span><input aria-label="Labor per sq.ft" type="number" name="installationRatePerSqft" value={inputs.installationRatePerSqft} onChange={handleInputChange} className="w-12 bg-transparent p-1 text-right outline-none text-ink font-mono" /></div>
              </div>
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
                  <span className="text-xs text-muted font-bold">Packs Required</span>
                  <span className="text-lg font-semibold text-ink leading-none">{results.totalPacks} Packs ({results.totalOrderSqft?.toFixed(0)} sq.ft)</span>
                </div>
                <div className="w-px h-8 bg-line"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted font-bold">Total Cost</span>
                  <span className="text-lg font-semibold text-ink leading-none">{inputs.currency}{results.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-ink">{mode === 'civil' ? 'Insulation BOQ Report' : 'Thermal Engineering'}</h2>
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
            <div className="border-b-2 border-line pb-6 mb-8"><h2 className="text-2xl font-semibold text-ink">Thermal Engineering Calculations</h2><p className="text-xs text-muted font-mono mt-1">ASHRAE 90.1 Thermal Performance Standards</p></div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-surface border border-line rounded-lg p-6">
                <h3 className="text-base font-bold text-ink mb-3">Step 1: Thermal Resistance (R-Value)</h3>
                <div className="font-mono text-xs space-y-2 bg-bg p-4 rounded-lg">
                  <p>Material: {results.selectedMat.name}</p>
                  <p>R-Value Contribution = Thickness × R-per-inch = {inputs.thicknessIn}" × {results.selectedMat.rValuePerInch} = <span className="font-bold text-ink">R-{results.achievedRValue.toFixed(1)}</span></p>
                  <p>U-Factor = 1 / R-value = 1 / {results.achievedRValue.toFixed(1)} = <span className="font-bold text-ink">{results.achievedUValue.toFixed(4)} BTU/hr·ft²·°F</span></p>
                </div>
              </div>
              <div className="bg-surface border border-line rounded-lg p-6">
                <h3 className="text-base font-bold text-ink mb-3">Step 2: Pack Takeoff</h3>
                <div className="font-mono text-xs space-y-2 bg-bg p-4 rounded-lg">
                  <p>Net Area = {results.netSqft} sq.ft</p>
                  <p>Total Order (+{inputs.wastage}% cutting waste) = {results.totalOrderSqft.toFixed(0)} sq.ft</p>
                  <p>Pack Coverage = {results.selectedMat.packSqft} sq.ft / pack</p>
                  <p className="font-bold text-ink">Packs Required = ⌈{results.totalOrderSqft.toFixed(0)} ÷ {results.selectedMat.packSqft}⌉ = {results.totalPacks} packs</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {results && mode === 'civil' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink print:bg-white print:text-black">
            <div className="border-b-2 border-line pb-6 mb-8 flex justify-between items-end">
              <div><h2 className="text-2xl font-semibold text-ink">Insulation Bill of Quantities</h2><p className="text-xs text-muted font-mono">{results.selectedMat.name} — R-{results.achievedRValue.toFixed(1)} Specification</p></div>
              <span className="text-xs font-bold text-ink bg-sunken px-3 py-1 rounded-full border border-primary">ASHRAE</span>
            </div>
            <div className="overflow-x-auto bg-surface rounded-lg border border-line p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-muted uppercase font-semibold text-xs">
                  <tr><th scope="col" className="py-3 px-4">Item</th><th scope="col" className="py-3 px-4">Qty</th><th scope="col" className="py-3 px-4">Unit</th><th scope="col" className="py-3 px-4">Rate</th><th scope="col" className="py-3 px-4 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr><td className="py-3 px-4 font-semibold">{results.selectedMat.name} ({inputs.thicknessIn}" thick)</td><td className="py-3 px-4 font-bold">{results.totalOrderSqft.toFixed(0)}</td><td className="py-3 px-4">sq.ft ({results.totalPacks} packs)</td><td className="py-3 px-4">{inputs.currency}{results.selectedMat.costPerSqft}/sq.ft</td><td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.materialCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">Installation Labor</td><td className="py-3 px-4 font-bold">{results.totalOrderSqft.toFixed(0)}</td><td className="py-3 px-4">sq.ft</td><td className="py-3 px-4">{inputs.currency}{inputs.installationRatePerSqft}/sq.ft</td><td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.installCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                </tbody>
                <tfoot className="border-t-2 border-line font-bold bg-bg">
                  <tr><td colSpan="4" className="py-3 px-4 text-right">Grand Total</td><td className="py-3 px-4 text-right text-ink text-sm">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
