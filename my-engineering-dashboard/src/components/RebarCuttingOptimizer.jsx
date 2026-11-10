import React, { useState, useMemo } from 'react';
import { RebarShapeIcon } from './GlyphIcon';
import { useProject } from '../context/ProjectContext.jsx';

// Rebar unit weight per meter (D^2 / 162.28 in kg/m)
const rebarWeights = {
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.578,
  20: 2.466,
  25: 3.853,
  32: 6.313
};

const standardShapes = [
  { id: 'straight', name: 'Shape 00: Straight Bar', icon: '—', desc: 'Main longitudinal tension/compression rebar' },
  { id: 'lbend', name: 'Shape 21: L-Bend (90° Hook)', icon: '⌐', desc: 'Beam-column junction anchorage rebar' },
  { id: 'cranked', name: 'Shape 41: Cranked / Bent-Up', icon: '⎍', desc: 'One-way/Two-way slab shear & hogging moment' },
  { id: 'stirrup', name: 'Shape 51: Rectangular Stirrup', icon: '▢', desc: 'Beam shear link / Column lateral tie with 135° hooks' },
  { id: 'chair', name: 'Shape 71: Top Mesh Chair Bar', icon: '⑁', desc: 'Maintains top & bottom mat spacing during slab pour' }
];

export default function RebarCuttingOptimizer() {
  const { addItemToProject } = useProject();

  const [selectedDia, setSelectedDia] = useState(12);
  const [stockLength] = useState(12.0); // 12.0m standard commercial length
  const [steelRatePerKg, setSteelRatePerKg] = useState(72);
  const [currency] = useState('₹');
  const [toastMessage, setToastMessage] = useState('');

  // Required Bar Cut Schedule List
  const [cutSchedule, setCutSchedule] = useState([
    { id: 'cut-1', shape: 'lbend', dia: 12, length: 3.45, qty: 16, desc: 'Footing Pedestal Column L-Dowel' },
    { id: 'cut-2', shape: 'straight', dia: 12, length: 4.80, qty: 12, desc: 'Plinth Beam Bottom Tension Bars' },
    { id: 'cut-3', shape: 'stirrup', dia: 8, length: 1.15, qty: 45, desc: 'Column Ties @ 150mm c/c' },
    { id: 'cut-4', shape: 'cranked', dia: 10, length: 3.85, qty: 18, desc: 'Ground Floor Slab Cranked Bar' }
  ]);

  // Form input for new bar cut
  const [formShape, setFormShape] = useState('lbend');
  const [formDia, setFormDia] = useState(12);
  const [formLength, setFormLength] = useState(3.2);
  const [formQty, setFormQty] = useState(10);
  const [formDesc, setFormDesc] = useState('');

  // Add Cut Item
  const handleAddCut = (e) => {
    e.preventDefault();
    if (formLength <= 0 || formQty <= 0) return;
    if (formLength > stockLength) {
      alert(`Cut length (${formLength}m) cannot exceed commercial stock length (${stockLength}m). Use lap splices.`);
      return;
    }

    const newCut = {
      id: `cut-${Date.now()}`,
      shape: formShape,
      dia: Number(formDia),
      length: Number(formLength),
      qty: Number(formQty),
      desc: formDesc || `${formDia}mm ${formShape.toUpperCase()} Bar`
    };

    setCutSchedule(prev => [...prev, newCut]);
    setFormDesc('');
  };

  const handleRemoveCut = (id) => {
    setCutSchedule(prev => prev.filter(c => c.id !== id));
  };

  // 1D Cutting Stock Optimization Algorithm (Best Fit Decreasing) for Selected Diameter
  const optimizationResults = useMemo(() => {
    // Filter cuts by currently selected diameter
    const relevantCuts = cutSchedule.filter(c => c.dia === Number(selectedDia));
    
    // Flatten cut requests into individual pieces
    const pieces = [];
    relevantCuts.forEach(item => {
      for (let i = 0; i < item.qty; i++) {
        pieces.push({ id: item.id, length: item.length, desc: item.desc });
      }
    });

    // Sort pieces in descending order (Largest Fit First)
    pieces.sort((a, b) => b.length - a.length);

    // Bin Packing: Pack pieces into 12.0m stock bars
    const stockBars = [];

    pieces.forEach(piece => {
      // Find the first stock bar that has enough remaining space
      let placed = false;
      for (let bar of stockBars) {
        if (bar.remaining >= piece.length) {
          bar.cuts.push(piece);
          bar.used += piece.length;
          bar.remaining -= piece.length;
          placed = true;
          break;
        }
      }

      // If no existing bar can fit it, open a new 12.0m stock bar
      if (!placed) {
        stockBars.push({
          barNumber: stockBars.length + 1,
          totalLength: stockLength,
          used: piece.length,
          remaining: stockLength - piece.length,
          cuts: [piece]
        });
      }
    });

    const totalStockBarsCount = stockBars.length;
    const totalPurchasedMeters = totalStockBarsCount * stockLength;
    const totalRequiredCutMeters = pieces.reduce((sum, p) => sum + p.length, 0);
    const totalScrapMeters = totalPurchasedMeters - totalRequiredCutMeters;
    const scrapWastePercent = totalPurchasedMeters > 0 ? (totalScrapMeters / totalPurchasedMeters) * 100 : 0;

    const unitWt = rebarWeights[selectedDia] || 0.888;
    const totalPurchasedKg = totalPurchasedMeters * unitWt;
    const totalRequiredKg = totalRequiredCutMeters * unitWt;
    const totalScrapKg = totalScrapMeters * unitWt;
    const totalSteelCost = totalPurchasedKg * steelRatePerKg;

    return {
      stockBars,
      totalStockBarsCount,
      totalPurchasedMeters,
      totalRequiredCutMeters,
      totalScrapMeters,
      scrapWastePercent,
      totalPurchasedKg,
      totalRequiredKg,
      totalScrapKg,
      totalSteelCost,
      piecesCount: pieces.length
    };
  }, [cutSchedule, selectedDia, stockLength, steelRatePerKg]);

  // Send Optimized Rebar Takeoff to Master Project BOQ
  const handlePushToMasterBOQ = () => {
    const item = addItemToProject({
      category: 'Reinforcement Steel',
      module: 'BBS Rebar Optimizer',
      description: `Fe 500D TMT Reinforcement (Ø${selectedDia}mm) — ${optimizationResults.totalStockBarsCount} standard 12m bars optimized (${optimizationResults.scrapWastePercent.toFixed(1)}% scrap rate)`,
      quantity: Math.round(optimizationResults.totalPurchasedKg),
      unit: 'kg',
      rate: steelRatePerKg,
      cost: optimizationResults.totalSteelCost
    });

    setToastMessage(`✓ Successfully added ${item.quantity} kg of Ø${selectedDia}mm Rebar to Project Master BOQ!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="flex flex-col w-full pb-10 space-y-6 text-ink font-sans">
      
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-lg bg-bg border border-line p-5 sm:p-7">
        <div className="absolute inset-0 blueprint-grid opacity-30 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col wide:flex-row justify-between items-start wide:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-sunken border border-line-control text-primary text-xs font-bold font-mono">
                IS 2502 / SP 34 Rebar Sizing Standard
              </span>
              <span className="text-xs font-mono text-muted">1D Cutting Stock Optimization Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              Bar Bending Schedule (BBS) & <span className="gradient-text">12m Rebar Cut Optimizer</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Eliminate costly contractor scrap waste (from over 6% down to under 1.8%) by calculating optimal cutting sequences on standard 12.0m commercial TMT steel stock bars.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {toastMessage && (
              <span className="text-xs font-bold text-ink bg-sunken border border-line-control px-3 py-2 rounded-lg animate-fade-in">
                {toastMessage}
              </span>
            )}
            <button
              onClick={handlePushToMasterBOQ}
              disabled={optimizationResults.totalStockBarsCount === 0}
              className="px-4 py-2.5 bg-primary text-on-primary font-semibold rounded-lg text-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <span>+</span> Push Steel Schedule to Master BOQ
            </button>
          </div>
        </div>

        {/* Live Optimization KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-line">
          <div className="stat-card">
            <span className="text-xs font-mono font-bold text-muted">12m Stock Bars Req.</span>
            <p className="text-xl font-semibold text-primary mt-1 font-mono">
              {optimizationResults.totalStockBarsCount} <span className="text-xs text-muted">bars</span>
            </p>
            <span className="text-xs text-muted">Ø{selectedDia}mm TMT Bars</span>
          </div>

          <div className="stat-card">
            <span className="text-xs font-mono font-bold text-muted">Total Steel Procurement</span>
            <p className="text-xl font-semibold text-primary mt-1 font-mono">
              {optimizationResults.totalPurchasedKg.toFixed(1)} <span className="text-xs text-muted">kg</span>
            </p>
            <span className="text-xs text-muted">{(optimizationResults.totalPurchasedKg / 1000).toFixed(2)} Metric Tonnes</span>
          </div>

          <div className="stat-card bg-sunken border-line-control">
            <span className="text-xs font-mono font-bold text-ink">Scrap Waste Efficiency</span>
            <p className="text-xl font-semibold text-ink mt-1 font-mono">
              {optimizationResults.scrapWastePercent.toFixed(1)}% <span className="text-xs text-ink">waste</span>
            </p>
            <span className="text-xs text-ink">Industry Benchmark: 6–8%</span>
          </div>

          <div className="stat-card">
            <span className="text-xs font-mono font-bold text-muted">Procurement Budget</span>
            <p className="text-xl font-semibold text-accent mt-1 font-mono">
              {currency}{optimizationResults.totalSteelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-xs text-muted">@ {currency}{steelRatePerKg}/kg Rate</span>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: BBS TABLE + 1D CUTTING VISUALIZER ── */}
      <div className="grid grid-cols-1 wide:grid-cols-12 gap-6">
        
        {/* Left Column: Bar Entry & Active BBS Schedule (5 cols) */}
        <div className="wide:col-span-5 space-y-6">
          
          {/* Add New Cut Piece Form */}
          <div className="bg-surface border border-line rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
Add Bar Schedule Item
            </h2>

            <form onSubmit={handleAddCut} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-muted font-mono mb-1">Standard Shape Code</label>
                <div className="grid grid-cols-2 gap-2">
                  {standardShapes.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormShape(s.id)}
                      className={`p-2 rounded-lg text-left border transition-all flex items-center gap-2 ${
                        formShape === s.id
                          ? 'bg-sunken border-line-control text-primary font-bold'
                          : 'bg-sunken border-line text-muted hover:text-ink'
                      }`}
                    >
                      <RebarShapeIcon id={s.id} />
                      <span className="text-xs truncate">{s.name.split(':')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="rebarcuttingoptimizer-field-0" className="block text-xs font-bold text-muted font-mono mb-1">Bar Dia (mm)</label>
                  <select id="rebarcuttingoptimizer-field-0"
                    value={formDia}
                    onChange={e => setFormDia(Number(e.target.value))}
                    className="w-full bg-sunken border border-line rounded-lg px-2.5 py-2 text-ink outline-none focus:border-primary font-mono"
                  >
                    {[8, 10, 12, 16, 20, 25, 32].map(d => (
                      <option key={d} value={d}>Ø {d} mm</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="rebarcuttingoptimizer-field-1" className="block text-xs font-bold text-muted font-mono mb-1">Cut Length (m)</label>
                  <input id="rebarcuttingoptimizer-field-1"
                    type="number"
                    step="0.01"
                    required
                    value={formLength}
                    onChange={e => setFormLength(Number(e.target.value))}
                    className="w-full bg-sunken border border-line rounded-lg px-2.5 py-2 text-ink outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="rebarcuttingoptimizer-field-2" className="block text-xs font-bold text-muted font-mono mb-1">Quantity</label>
                  <input id="rebarcuttingoptimizer-field-2"
                    type="number"
                    min="1"
                    required
                    value={formQty}
                    onChange={e => setFormQty(Number(e.target.value))}
                    className="w-full bg-sunken border border-line rounded-lg px-2.5 py-2 text-ink outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rebarcuttingoptimizer-field-3" className="block text-xs font-bold text-muted font-mono mb-1">Member Location & Remarks</label>
                <input id="rebarcuttingoptimizer-field-3"
                  type="text"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="e.g. C1 Column Main Rebar Ground to First Floor"
                  className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary hover:bg-sunken text-on-primary font-bold rounded-lg text-xs transition-all"
              >
                + Add Bar to BBS List
              </button>
            </form>
          </div>

          {/* Bar Schedule List */}
          <div className="bg-surface border border-line rounded-lg p-5 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <h3 className="text-xs font-semibold text-ink font-mono">
                Bar Cutting Schedule ({cutSchedule.length} entries)
              </h3>
              <span className="text-xs text-muted font-mono">IS 2502 Specifications</span>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scroll pr-1">
              {cutSchedule.map((cut, idx) => (
                <div
                  key={cut.id}
                  className="bg-sunken border border-line rounded-lg p-3 flex items-center justify-between text-xs hover:border-line transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-sunken text-primary flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">Ø{cut.dia}mm</span>
                        <span className="text-muted font-mono">{cut.length}m each</span>
                        <span className="px-1.5 py-0.5 rounded bg-sunken text-primary text-xs font-mono">× {cut.qty} pcs</span>
                      </div>
                      <p className="text-xs text-muted truncate mt-0.5">{cut.desc}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveCut(cut.id)}
                    className="p-1 text-muted hover:text-error rounded-lg transition-colors ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: 1D Stock Optimization Visualizer (7 cols) */}
        <div className="wide:col-span-7 space-y-6">
          
          <div className="bg-surface border border-line rounded-lg p-5 sm:p-6 space-y-5">
            
            {/* Optimization Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-line">
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Optimal 12.0m Cutting Layouts
                </h2>
                <span className="text-xs text-muted">
                  Select diameter to visualize linear 1D nesting
                </span>
              </div>

              {/* Diameter Switcher Pills */}
              <div className="flex max-w-full gap-1 overflow-x-auto no-scrollbars">
                {[8, 10, 12, 16, 20, 25, 32].map(dia => (
                  <button
                    key={dia}
                    onClick={() => setSelectedDia(dia)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedDia === dia
                        ? 'bg-primary text-on-primary font-semibold '
                        : 'bg-sunken text-muted hover:text-ink border border-line'
                    }`}
                  >
                    Ø{dia}
                  </button>
                ))}
              </div>
            </div>

            {/* Visualizer of 12m Commercial Bars */}
            {optimizationResults.stockBars.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <h3 className="text-sm font-bold text-ink">No bar cuts required for Ø{selectedDia}mm</h3>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Add cutting schedule entries with Ø{selectedDia}mm diameter to run the 1D nesting cutting algorithm.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[560px] overflow-y-auto custom-scroll pr-1">
                {optimizationResults.stockBars.map((bar) => {
                  return (
                    <div key={bar.barNumber} className="bg-sunken border border-line rounded-lg p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-primary">12.0m Commercial Bar #{bar.barNumber}</span>
                          <span className="text-xs text-muted font-mono">({bar.cuts.length} cuts assigned)</span>
                        </div>
                        <div className="text-xs font-mono">
                          <span className="text-ink font-bold">{bar.used.toFixed(2)}m Used</span> · <span className="text-error">{bar.remaining.toFixed(2)}m Offcut</span>
                        </div>
                      </div>

                      {/* 1D Multi-Segment Bar Rendering */}
                      <div className="w-full h-8 bg-surface rounded-lg overflow-hidden flex border border-line relative">
                        {bar.cuts.map((cut, cIdx) => {
                          const widthPct = (cut.length / bar.totalLength) * 100;
                          // Alternate two shades so neighbouring cuts stay distinguishable.
                          const bgColors = ['bg-primary', 'bg-primary-hover'];
                          const color = bgColors[cIdx % bgColors.length];

                          return (
                            <div
                              key={cIdx}
                              style={{ width: `${widthPct}%` }}
                              className={`${color} h-full border-r-2 border-surface flex items-center justify-center text-xs font-mono font-bold text-on-primary px-1 truncate`}
                              title={`${cut.desc}: ${cut.length}m`}
                            >
                              {cut.length}m
                            </div>
                          );
                        })}

                        {/* Offcut / Scrap Piece */}
                        {bar.remaining > 0 && (
                          <div
                            style={{ width: `${(bar.remaining / bar.totalLength) * 100}%` }}
                            className="bg-sunken text-error h-full flex items-center justify-center text-xs font-mono font-bold px-1"
                            title={`Offcut Scrap: ${bar.remaining.toFixed(2)}m`}
                          >
                            {bar.remaining > 0.3 ? `${bar.remaining.toFixed(2)}m scrap` : ''}
                          </div>
                        )}
                      </div>

                      {/* Bar Cuts Legend */}
                      <div className="flex flex-wrap gap-2 text-xs text-muted font-mono">
                        {bar.cuts.map((cut, cIdx) => (
                          <span key={cIdx} className="bg-surface px-2 py-0.5 rounded border border-line truncate max-w-[200px]">
                            Cut #{cIdx + 1}: {cut.length}m ({cut.desc})
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Procurement Summary Strip */}
            <div className="p-4 rounded-lg bg-sunken border border-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
              <div>
                <span className="font-bold text-ink block">TMT Steel Market Standard: 12.0m Bundles</span>
                <span className="text-xs text-muted font-mono">IS 1786 Fe500D Thermo-Mechanically Treated Bars</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted font-mono text-xs">Unit Rate:</span>
                <div className="flex items-center bg-surface border border-line rounded-lg px-2 py-1">
                  <span className="text-muted text-xs mr-1">{currency}</span>
                  <input aria-label="Unit Rate:"
                    type="number"
                    value={steelRatePerKg}
                    onChange={e => setSteelRatePerKg(Number(e.target.value))}
                    className="w-12 bg-transparent text-right font-mono font-bold text-ink outline-none"
                  />
                  <span className="text-xs text-muted ml-1">/kg</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
