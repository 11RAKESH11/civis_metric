import React, { useState, useEffect, useRef, useEffectEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import disposeObject from '../lib/disposeObject';
import ToolIcon from './ToolIcon';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254 };

const sandTypes = [
  { id: 'river_coarse', label: 'River Sand (Coarse)', density: 1600, color: '#d97706' },
  { id: 'river_fine', label: 'River Sand (Fine Plaster)', density: 1450, color: '#f59e0b' },
  { id: 'm_sand', label: 'Manufactured M-Sand', density: 1550, color: '#78716c' },
  { id: 'p_sand', label: 'Plastering P-Sand', density: 1400, color: '#a8a29e' }
];

export default function SandCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    length: 25,
    width: 20,
    thickness: 4,
    moistureBulking: 12,
    wastage: 5,
    truckCapacityTons: 16,
    pricePerTon: 1400,
    pricePerBrass: 4500,
    currency: '₹'
  });

  const [sandType, setSandType] = useState('river_coarse');
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
    scene.background = new THREE.Color(0x14171B);
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
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const grid = new THREE.GridHelper(30, 30, 0x0ea5e9, 0x1e293b);
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
    const { length, width, thickness, moistureBulking, wastage, truckCapacityTons, pricePerTon, pricePerBrass } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedSand = sandTypes.find(s => s.id === sandType) || sandTypes[0];

    const lenM = length * unitToMeter[unitSystem];
    const widM = width * unitToMeter[unitSystem];
    const thickM = thickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];

    const netVolumeM3 = Math.max(0.1, lenM * widM * thickM);
    const bulkedVolumeM3 = netVolumeM3 * (1 + (moistureBulking / 100));
    const totalOrderVolumeM3 = bulkedVolumeM3 * (1 + (wastage / 100));

    const totalCuFt = totalOrderVolumeM3 * 35.3147;
    const totalBrass = totalCuFt / 100;

    const dryWeightKg = totalOrderVolumeM3 * selectedSand.density;
    const totalWeightTons = dryWeightKg / 1000;
    const truckloads = Math.ceil(totalWeightTons / (truckCapacityTons || 16));

    const costByWeight = totalWeightTons * pricePerTon;
    const costByVolume = totalBrass * pricePerBrass;
    const grandTotal = costByWeight;

    setResults({
      lenM, widM, thickM,
      netVolumeM3,
      bulkedVolumeM3,
      totalOrderVolumeM3,
      totalCuFt,
      totalBrass,
      totalWeightTons,
      dryWeightKg,
      truckloads,
      costByWeight,
      costByVolume,
      grandTotal,
      selectedSand
    });

    // 3D Model
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicSand') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      disposeObject(c);
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicSand';

    const isBlueprint = visualTheme === 'blueprint';
    const sandColor = isBlueprint ? 0x0ea5e9 : parseInt(selectedSand.color.replace('#', '0x'));
    const material = new THREE.MeshStandardMaterial({
      color: sandColor,
      roughness: 0.95,
      wireframe: isBlueprint
    });

    const coneRadius = Math.max(1.5, Math.min(6, Math.sqrt(totalOrderVolumeM3 * 3 / Math.PI / 2)));
    const coneHeight = Math.max(1, coneRadius * 0.7);

    const sandGeom = new THREE.ConeGeometry(coneRadius, coneHeight, 32);
    sandGeom.translate(0, coneHeight / 2, 0);
    const sandMesh = new THREE.Mesh(sandGeom, material);
    sandMesh.castShadow = true;
    mainGroup.add(sandMesh);

    scene.add(mainGroup);
  }

  // Recalculate 300ms after the last input change.
  const recalculate = useEffectEvent(() => calculateAndRender());
  useEffect(() => {
    const handler = setTimeout(() => recalculate(), 150);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, sandType, visualTheme]);

  return (
    <div className="flex flex-col wide:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full wide:w-[380px] shrink-0 bg-surface rounded-lg p-5 sm:p-6 border border-line flex flex-col h-auto wide:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sunken border border-line-control flex items-center justify-center text-accent font-semibold">
              <ToolIcon id="sand" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">Sand Calculator</h2>
              <p className="text-xs text-muted font-mono">Bulking & Tonnage Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Presets */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 flex items-center gap-2 transition-colors">
              Sand Variety
            </h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {sandTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSandType(t.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-bold   transition-all text-left ${
                    sandType === t.id
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface border border-line text-muted hover:text-ink hover:border-line-control'
                  }`}
                >
                  {t.label}
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
                <label htmlFor="sand-length" className="block text-xs text-muted mb-1">Length ({unitSystem})</label>
                <input id="sand-length" type="number" step="0.5" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
              </div>
              <div>
                <label htmlFor="sand-width" className="block text-xs text-muted mb-1">Width ({unitSystem})</label>
                <input id="sand-width" type="number" step="0.5" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
              </div>
            </div>
            <div>
              <label htmlFor="sand-thickness" className="block text-xs text-muted mb-1">Thickness ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
              <input id="sand-thickness" type="number" step="0.5" name="thickness" value={inputs.thickness} onChange={handleInputChange} className="w-full bg-surface border border-line-control rounded p-2 text-xs focus:ring-1 focus:ring-focus outline-none text-ink" />
            </div>
          </div>

          {/* Bulking & Wastage */}
          <div className="p-4 rounded-lg border border-line">
            <h3 className="text-xs font-bold text-ink-2 mb-3 flex items-center gap-2 transition-colors">
              Bulking & Wastage
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sand-moistureBulking" className="block text-xs text-muted mb-1">Moisture Bulking</label>
                <div className="flex items-center bg-surface border border-line rounded-lg pr-2">
                  <input id="sand-moistureBulking" type="number" name="moistureBulking" value={inputs.moistureBulking} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-ink" />
                  <span className="text-muted text-xs">%</span>
                </div>
              </div>
              <div>
                <label htmlFor="sand-wastage" className="block text-xs text-muted mb-1">Site Handling Loss</label>
                <div className="flex items-center bg-surface border border-line rounded-lg pr-2">
                  <input id="sand-wastage" type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-ink" />
                  <span className="text-muted text-xs">%</span>
                </div>
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
                <span className="text-xs text-muted font-medium ml-1">Price per Brass (100 ft³)</span>
                <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                  <span className="text-ink">{inputs.currency}</span>
                  <input aria-label="Price per Brass (100 ft³)" type="number" name="pricePerBrass" value={inputs.pricePerBrass} onChange={handleInputChange} className="w-16 bg-transparent p-1 text-right outline-none text-ink font-mono" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-surface p-2 rounded-lg border border-line">
                <span className="text-xs text-muted font-medium ml-1">Dumper Capacity (Tons)</span>
                <div className="flex items-center bg-sunken rounded text-xs px-2 border border-line-control">
                  <input aria-label="Dumper Capacity (Tons)" type="number" name="truckCapacityTons" value={inputs.truckCapacityTons} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-ink font-mono" />
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
                  <span className="text-xs text-muted font-bold">Total Weight</span>
                  <span className="text-lg font-semibold text-ink leading-none">
                    {results.totalWeightTons?.toFixed(2)} MT ({results.totalOrderVolumeM3?.toFixed(2)} m³)
                  </span>
                </div>
                <div className="w-px h-8 bg-line"></div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted font-bold">Estimated Cost</span>
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
              <h2 className="text-2xl font-semibold text-ink tracking-tight">Sand Mathematical Proof</h2>
              <p className="text-xs text-muted mt-1 font-mono">Bulking Factor & Mass Calculations</p>
            </div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-surface border border-line rounded-lg p-6">
                <h3 className="text-base font-bold text-ink mb-3">Step 1: Net & Bulked Volume</h3>
                <div className="font-mono text-xs space-y-2 text-ink-2 bg-bg p-4 rounded-lg">
                  <p>Net Volume = L × W × Thick = {results.lenM.toFixed(2)}m × {results.widM.toFixed(2)}m × {results.thickM.toFixed(3)}m = <span className="font-bold">{results.netVolumeM3.toFixed(3)} m³</span></p>
                  <p>Bulking Increase = Net Vol × (1 + {inputs.moistureBulking}%) = <span className="font-bold text-ink">{results.bulkedVolumeM3.toFixed(3)} m³</span></p>
                  <p>Total Order Volume (+{inputs.wastage}% Waste) = <span className="font-bold text-ink">{results.totalOrderVolumeM3.toFixed(3)} m³</span> ({results.totalCuFt.toFixed(1)} cu.ft / {results.totalBrass.toFixed(2)} Brass)</p>
                </div>
              </div>
              <div className="bg-surface border border-line rounded-lg p-6">
                <h3 className="text-base font-bold text-ink mb-3">Step 2: Total Tonnage & Dumper Trips</h3>
                <div className="font-mono text-xs space-y-2 text-ink-2 bg-bg p-4 rounded-lg">
                  <p>Sand Bulk Density = {results.selectedSand.density} kg/m³</p>
                  <p>Total Mass = {results.totalOrderVolumeM3.toFixed(3)} m³ × {results.selectedSand.density} kg/m³ = <span className="font-bold">{results.dryWeightKg.toFixed(1)} kg</span></p>
                  <p className="text-ink font-bold text-sm">Total Tonnage = {results.totalWeightTons.toFixed(2)} MT ({results.truckloads} Dumper Trips @ {inputs.truckCapacityTons}T)</p>
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
                <p className="text-xs text-muted font-mono">Sand Material Procurement Schedule</p>
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
                    <td className="py-3 px-4 font-semibold">{results.selectedSand.label}</td>
                    <td className="py-3 px-4 font-bold">{results.totalWeightTons.toFixed(2)}</td>
                    <td className="py-3 px-4">Metric Tonnes (MT)</td>
                    <td className="py-3 px-4">{inputs.currency}{inputs.pricePerTon} / ton</td>
                    <td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.costByWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Moisture Bulking Allowance</td>
                    <td className="py-3 px-4">+{inputs.moistureBulking}%</td>
                    <td className="py-3 px-4">Vol. Swell</td>
                    <td className="py-3 px-4">Compensated</td>
                    <td className="py-3 px-4 text-right font-medium text-ink">Included</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Haulage Fleet</td>
                    <td className="py-3 px-4">{results.truckloads}</td>
                    <td className="py-3 px-4">Trips ({inputs.truckCapacityTons}T Dumper)</td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4 text-right text-muted">Standard Delivery</td>
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
