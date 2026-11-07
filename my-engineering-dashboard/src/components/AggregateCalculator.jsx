import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254 };

const aggregateGrades = [
  { id: '20mm', label: '20mm (3/4") Standard Aggregate', density: 1600, color: '#475569' },
  { id: '10mm', label: '10mm (3/8") Blue Metal', density: 1550, color: '#64748b' },
  { id: '40mm', label: '40mm (1.5") Heavy Ballast', density: 1650, color: '#334155' },
  { id: 'pea_gravel', label: 'Pea Gravel / River Pebbles', density: 1500, color: '#78716c' }
];

export default function AggregateCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    length: 30,
    width: 20,
    thickness: 6,
    compactionFactor: 1.20,
    wastage: 5,
    truckCapacityTons: 16,
    pricePerTon: 1100,
    pricePerBrass: 3800,
    currency: '₹'
  });

  const [gradeId, setGradeId] = useState('20mm');
  const [mode, setMode] = useState('normal'); // 'normal' | 'math' | 'civil'
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsed = ['currency'].includes(name) ? value : parseFloat(value) || 0;
    if (typeof parsed === 'number') parsed = Math.max(0, parsed);
    setInputs(prev => ({ ...prev, [name]: parsed }));
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
    camera.position.set(14, 10, 16);
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
    dirLight.position.set(15, 25, 15);
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

  // --- Calculation & 3D Render ---

  function calculateAndRender() {
    const { length, width, thickness, compactionFactor, wastage, truckCapacityTons, pricePerTon } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedGrade = aggregateGrades.find(g => g.id === gradeId) || aggregateGrades[0];

    const lenM = length * unitToMeter[unitSystem];
    const widM = width * unitToMeter[unitSystem];
    const thickM = thickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];

    const netVolumeM3 = Math.max(0.1, lenM * widM * thickM);
    const compactedVolM3 = netVolumeM3 * (compactionFactor || 1.20);
    const totalOrderVolM3 = compactedVolM3 * (1 + (wastage / 100));

    const totalCuFt = totalOrderVolM3 * 35.3147;
    const totalBrass = totalCuFt / 100;
    const totalWeightKg = totalOrderVolM3 * selectedGrade.density;
    const totalWeightTons = totalWeightKg / 1000;
    const truckloads = Math.ceil(totalWeightTons / (truckCapacityTons || 16));

    const costByWeight = totalWeightTons * pricePerTon;
    const grandTotal = costByWeight;

    setResults({
      lenM, widM, thickM,
      netVolumeM3,
      compactedVolM3,
      totalOrderVolM3,
      totalCuFt,
      totalBrass,
      totalWeightTons,
      totalWeightKg,
      truckloads,
      costByWeight,
      grandTotal,
      selectedGrade
    });

    // 3D Model
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicAgg') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicAgg';

    const isBlueprint = visualTheme === 'blueprint';
    const aggColor = isBlueprint ? 0x0ea5e9 : parseInt(selectedGrade.color.replace('#', '0x'));
    const material = new THREE.MeshStandardMaterial({
      color: aggColor,
      roughness: 0.9,
      wireframe: isBlueprint
    });

    const coneR = Math.max(1.8, Math.min(6, Math.sqrt(totalOrderVolM3 * 3 / Math.PI / 2.2)));
    const coneH = Math.max(1.2, coneR * 0.75);

    const aggGeom = new THREE.ConeGeometry(coneR, coneH, 24);
    aggGeom.translate(0, coneH / 2, 0);
    const aggMesh = new THREE.Mesh(aggGeom, material);
    aggMesh.castShadow = true;
    mainGroup.add(aggMesh);

    scene.add(mainGroup);
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, gradeId, visualTheme]);

  return (
    <div className="flex flex-col wide:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full wide:w-[380px] shrink-0 bg-surface rounded-lg p-5 sm:p-6 border border-line flex flex-col h-auto wide:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Aggregate Calculator</h2>
              <p className="text-xs text-muted font-mono">Coarse Ballast & Tonnage Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Sizing Presets */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">
              Aggregate Grade
            </h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {aggregateGrades.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGradeId(g.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-bold   transition-all text-left ${
                    gradeId === g.id
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface border border-line text-muted hover:text-ink hover:border-line-control'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="p-4 rounded-lg border border-line">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">
                Base Dimensions
              </h3>
              <select aria-label="Unit system" value={unitSystem} onChange={e => setUnitSystem(e.target.value)} className="bg-surface border border-line-control text-xs rounded px-1.5 py-1 outline-none text-ink cursor-pointer focus:ring-1 focus:ring-focus">
                <option value="ft">Imperial (ft/in)</option>
                <option value="m">Metric (m/cm)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="aggregate-length" className="block text-xs text-muted mb-1">Length ({unitSystem})</label>
                <input id="aggregate-length" type="number" step="0.5" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
              </div>
              <div>
                <label htmlFor="aggregate-width" className="block text-xs text-muted mb-1">Width ({unitSystem})</label>
                <input id="aggregate-width" type="number" step="0.5" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
              </div>
            </div>
            <div>
              <label htmlFor="aggregate-thickness" className="block text-xs text-muted mb-1">Thickness ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
              <input id="aggregate-thickness" type="number" step="0.5" name="thickness" value={inputs.thickness} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
            </div>
          </div>

          {/* Compaction & Loss */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2 transition-colors">
              Compaction & Loss
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="aggregate-compactionFactor" className="block text-xs text-muted mb-1">Base Compaction</label>
                <input id="aggregate-compactionFactor" type="number" step="0.05" name="compactionFactor" value={inputs.compactionFactor} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs outline-none text-ink" />
              </div>
              <div>
                <label htmlFor="aggregate-wastage" className="block text-xs text-muted mb-1">Wastage (%)</label>
                <input id="aggregate-wastage" type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs outline-none text-ink" />
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2 transition-colors">
              Rates & Logistics
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                <span className="text-xs text-muted font-medium ml-1">Price per Ton</span>
                <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                  <span className="text-ink">{inputs.currency}</span>
                  <input aria-label="Price per Ton" type="number" name="pricePerTon" value={inputs.pricePerTon} onChange={handleInputChange} className="w-16 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                <span className="text-xs text-muted font-medium ml-1">Dumper Cap. (Tons)</span>
                <input aria-label="Dumper Cap. (Tons)" type="number" name="truckCapacityTons" value={inputs.truckCapacityTons} onChange={handleInputChange} className="w-14 bg-sunken p-1 text-right outline-none text-ink font-mono rounded text-xs" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Display Panel */}
      <div className="w-full wide:w-[calc(100%-404px)] bg-surface rounded-lg border border-line flex flex-col overflow-hidden relative z-10 wide:h-[calc(100vh-140px)] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        {/* Top Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-line bg-surface z-30 shrink-0 print:hidden">
          <div className="flex-1 min-h-10 flex items-center">
            {results && mode === 'normal' ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 animate-fade-in">
                <div className="flex flex-col">
                  <span className="text-xs text-muted font-bold">Total Tonnage</span>
                  <span className="text-lg font-semibold text-ink leading-none">
                    {results.totalWeightTons?.toFixed(2)} MT ({results.totalOrderVolM3?.toFixed(2)} m³)
                  </span>
                </div>
                <div className="w-px h-8 bg-line"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted font-bold">Estimated Total</span>
                  <span className="text-lg font-semibold text-ink leading-none">{inputs.currency}{results.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-ink">{mode === 'civil' ? 'Financial BOQ Report' : 'Engineering Calculations'}</h2>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {(mode === 'civil' || mode === 'math') && (
              <button onClick={handlePrint} className="bg-sunken hover:bg-primary border border-line-control hover:border-primary text-ink hover:text-on-primary px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print
              </button>
            )}

            <div className="bg-sunken p-1 rounded-lg border border-line flex gap-1">
              <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all ${mode === 'normal' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>3D Vis</button>
              <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all ${mode === 'math' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>Math</button>
              <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-xs font-bold   transition-all ${mode === 'civil' ? 'bg-primary text-on-primary' : 'text-muted hover:text-ink'}`}>Report</button>
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-[#14171B] print:hidden`}>
          <div ref={mountRef} className="absolute inset-0 cursor-move" role="img" aria-label="3D model of the current inputs. All quantities are listed in the Math and Report views."></div>
          <div className="absolute bottom-6 right-6 z-30 bg-sunken p-1 rounded-lg border border-line flex gap-1">
            <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-xs font-bold  transition-all ${visualTheme === 'realistic' ? 'bg-sunken text-primary border border-line-control' : 'text-muted hover:text-ink-2'}`}>Realistic</button>
            <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-xs font-bold  transition-all ${visualTheme === 'blueprint' ? 'bg-sunken text-primary border border-line-control' : 'text-muted hover:text-ink-2'}`}>Blueprint</button>
          </div>
        </div>

        {/* Engineering Math */}
        {results && mode === 'math' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink print:bg-white print:text-black">
            <div className="border-b-2 border-line pb-6 mb-8">
              <h2 className="text-2xl font-semibold text-ink tracking-tight">Aggregate Engineering Proof</h2>
              <p className="text-xs text-muted mt-1 font-mono">Compaction Factor & Material Density</p>
            </div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-surface border border-line rounded-lg p-6">
                <h3 className="text-base font-bold text-ink mb-3">Step 1: Loose vs Compacted Volume</h3>
                <div className="font-mono text-xs space-y-2 text-ink-2 bg-bg p-4 rounded-lg">
                  <p>Net Geometry = {results.lenM.toFixed(2)}m × {results.widM.toFixed(2)}m × {results.thickM.toFixed(3)}m = <span className="font-bold">{results.netVolumeM3.toFixed(3)} m³</span></p>
                  <p>Compaction Adjustment (×{inputs.compactionFactor}) = <span className="font-bold text-ink">{results.compactedVolM3.toFixed(3)} m³</span></p>
                  <p>Total Order Volume (+{inputs.wastage}% Waste) = <span className="font-bold text-ink">{results.totalOrderVolM3.toFixed(3)} m³</span></p>
                </div>
              </div>
              <div className="bg-surface border border-line rounded-lg p-6">
                <h3 className="text-base font-bold text-ink mb-3">Step 2: Total Tonnage & Fleet Trips</h3>
                <div className="font-mono text-xs space-y-2 text-ink-2 bg-bg p-4 rounded-lg">
                  <p>Aggregate Density ({results.selectedGrade.label}) = {results.selectedGrade.density} kg/m³</p>
                  <p>Total Weight = {results.totalOrderVolM3.toFixed(3)} m³ × {results.selectedGrade.density} = <span className="font-bold">{results.totalWeightKg.toFixed(1)} kg</span></p>
                  <p className="text-ink font-bold text-sm">Total Tonnage = {results.totalWeightTons.toFixed(2)} MT ({results.truckloads} Dumper Trips)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Civil Report / BOQ */}
        {results && mode === 'civil' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-bg text-ink print:bg-white print:text-black">
            <div className="border-b-2 border-line pb-6 mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-semibold text-ink tracking-tight">Bill of Quantities (BOQ)</h2>
                <p className="text-xs text-muted font-mono">Coarse Aggregate Schedule</p>
              </div>
              <span className="text-xs font-bold text-ink bg-sunken px-3 py-1 rounded-full border border-primary">Verified</span>
            </div>
            <div className="overflow-x-auto bg-surface rounded-lg border border-line p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-muted uppercase font-semibold text-xs">
                  <tr>
                    <th scope="col" className="py-3 px-4">Item</th>
                    <th scope="col" className="py-3 px-4">Quantity</th>
                    <th scope="col" className="py-3 px-4">Unit</th>
                    <th scope="col" className="py-3 px-4">Unit Rate</th>
                    <th scope="col" className="py-3 px-4 text-right">Total ({inputs.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="py-3 px-4 font-semibold">{results.selectedGrade.label}</td>
                    <td className="py-3 px-4 font-bold">{results.totalWeightTons.toFixed(2)}</td>
                    <td className="py-3 px-4">Metric Tonnes (MT)</td>
                    <td className="py-3 px-4">{inputs.currency}{inputs.pricePerTon} / ton</td>
                    <td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.costByWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Base Compaction Settlement</td>
                    <td className="py-3 px-4">+{((inputs.compactionFactor - 1)*100).toFixed(0)}%</td>
                    <td className="py-3 px-4">Sub-base Compaction</td>
                    <td className="py-3 px-4">Included</td>
                    <td className="py-3 px-4 text-right font-medium text-ink">Compensated</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Dumper Logistics</td>
                    <td className="py-3 px-4">{results.truckloads}</td>
                    <td className="py-3 px-4">Trips ({inputs.truckCapacityTons}T Dumper)</td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4 text-right text-muted">Ex-Quarry Delivery</td>
                  </tr>
                </tbody>
                <tfoot className="border-t-2 border-line font-bold bg-bg">
                  <tr>
                    <td colSpan="4" className="py-3 px-4 text-right">Grand Total</td>
                    <td className="py-3 px-4 text-right text-sm text-ink">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
