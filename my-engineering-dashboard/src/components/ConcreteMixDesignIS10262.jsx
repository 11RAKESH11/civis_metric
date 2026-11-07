import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext.jsx';

// Standard deviation 's' as per IS 10262:2019 Table 1
const gradeData = {
  'M20': { fck: 20, s: 4.0, maxWc: 0.50, minCement: 300 },
  'M25': { fck: 25, s: 4.0, maxWc: 0.45, minCement: 320 },
  'M30': { fck: 30, s: 5.0, maxWc: 0.45, minCement: 320 },
  'M35': { fck: 35, s: 5.0, maxWc: 0.45, minCement: 340 },
  'M40': { fck: 40, s: 5.0, maxWc: 0.40, minCement: 360 },
  'M45': { fck: 45, s: 5.0, maxWc: 0.40, minCement: 360 },
  'M50': { fck: 50, s: 5.0, maxWc: 0.38, minCement: 380 },
  'M55': { fck: 55, s: 5.0, maxWc: 0.35, minCement: 400 }
};

export default function ConcreteMixDesignIS10262() {
  const { addItemToProject } = useProject();

  // Inputs
  const [grade, setGrade] = useState('M25');
  const [exposure, setExposure] = useState('Moderate'); // Mild, Moderate, Severe, Very Severe, Extreme
  const [slumpReq, setSlumpReq] = useState(100); // 75mm - 125mm
  const [maxAggSize, setMaxAggSize] = useState(20); // 10mm, 20mm, 40mm
  const [cementType] = useState('OPC 53 Grade (IS 12269)');
  const [sandZone, setSandZone] = useState('Zone II (IS 383)');
  
  // Specific Gravities
  const [spgCement] = useState(3.15);
  const [spgSand] = useState(2.65);
  const [spgCoarse] = useState(2.70);
  const [spgWater] = useState(1.0);
  const [spgAdmixture] = useState(1.15);

  // Moisture & Absorption Correction
  const [sandMoisture, setSandMoisture] = useState(2.0); // %
  const [sandAbsorption] = useState(1.0); // %
  const [aggAbsorption] = useState(0.5); // %
  const [admixtureDose, setAdmixtureDose] = useState(1.0); // % by weight of cement
  const [waterReduction] = useState(20); // % reduction via superplasticizer

  // Batch Volume
  const [batchVolume, setBatchVolume] = useState(1.0); // m³
  const [concreteRate, setConcreteRate] = useState(5800); // per m³
  const [currency] = useState('₹');
  const [toastMessage, setToastMessage] = useState('');

  // IS 10262:2019 Calculations
  const mixResults = useMemo(() => {
    const spec = gradeData[grade] || gradeData['M25'];
    
    // Step 1: Target Mean Strength (Cl. 4.2)
    // f'ck = fck + 1.65 * s
    const targetMeanStrength = spec.fck + (1.65 * spec.s);

    // Step 2: Water-Cement Ratio
    const wcRatio = spec.maxWc;

    // Step 3: Base Water Content per m³ (Table 4 for 20mm agg = 186 kg/m³ for 50mm slump)
    const baseWater = maxAggSize === 10 ? 208 : maxAggSize === 20 ? 186 : 165;
    // Slump correction: +3% water for every 25mm increase over 50mm
    const slumpExtraPct = ((slumpReq - 50) / 25) * 3;
    const waterWithSlump = baseWater * (1 + slumpExtraPct / 100);
    // Superplasticizer reduction
    const finalWaterKg = waterWithSlump * (1 - waterReduction / 100);

    // Step 4: Cementitious Content Calculation
    let cementContentKg = finalWaterKg / wcRatio;
    if (cementContentKg < spec.minCement) cementContentKg = spec.minCement;
    cementContentKg = Math.round(cementContentKg);

    // Step 5: Admixture Dosage
    const admixtureKg = (cementContentKg * admixtureDose) / 100;

    // Step 6: Volume of Components (Absolute Volume Method per 1 m³)
    const volCement = cementContentKg / (spgCement * 1000);
    const volWater = finalWaterKg / (spgWater * 1000);
    const volAdmixture = admixtureKg / (spgAdmixture * 1000);
    const volAir = maxAggSize === 20 ? 0.01 : 0.015; // 1.0% entrapped air for 20mm
    const volAllAggregates = 1.0 - (volCement + volWater + volAdmixture + volAir);

    // Proportion of Coarse Aggregate in total aggregate (IS 10262 Table 5: 0.62 for 20mm agg & Zone II sand with w/c 0.5)
    // Adjusted by -0.01 for every 0.05 decrease in w/c ratio
    const baseCoarseRatio = 0.62;
    const wcDiff = (0.50 - wcRatio) / 0.05;
    const coarseRatio = baseCoarseRatio + (wcDiff * 0.01);
    const fineRatio = 1.0 - coarseRatio;

    const massCoarseKg = Math.round(volAllAggregates * coarseRatio * spgCoarse * 1000);
    const massFineKg = Math.round(volAllAggregates * fineRatio * spgSand * 1000);

    // Step 7: Moisture Corrections
    // Sand moisture adjustment
    const freeSandMoisturePct = sandMoisture - sandAbsorption;
    const sandMoistureAdjustmentKg = (massFineKg * freeSandMoisturePct) / 100;
    const correctedSandKg = Math.round(massFineKg + sandMoistureAdjustmentKg);

    // Coarse aggregate absorption adjustment
    const aggAbsorptionKg = (massCoarseKg * aggAbsorption) / 100;
    const correctedCoarseKg = Math.round(massCoarseKg - aggAbsorptionKg);

    // Corrected mixing water
    const correctedWaterKg = Math.round(finalWaterKg - sandMoistureAdjustmentKg + aggAbsorptionKg);

    // Mix Proportions (By Weight normalized to 1 part cement)
    const ratioCement = 1.0;
    const ratioSand = (correctedSandKg / cementContentKg).toFixed(2);
    const ratioCoarse = (correctedCoarseKg / cementContentKg).toFixed(2);

    // Single 50kg Bag Batch Quantities
    const bagFactor = 50 / cementContentKg;
    const bagWater = (correctedWaterKg * bagFactor).toFixed(1);
    const bagSand = (correctedSandKg * bagFactor).toFixed(1);
    const bagCoarse = (correctedCoarseKg * bagFactor).toFixed(1);
    const bagAdmixture = (admixtureKg * bagFactor).toFixed(2);

    // Total Project Volume Sizing
    const totalVolumeCost = batchVolume * concreteRate;

    return {
      targetMeanStrength,
      wcRatio,
      cementContentKg,
      finalWaterKg: correctedWaterKg,
      sandKg: correctedSandKg,
      coarseKg: correctedCoarseKg,
      admixtureKg: admixtureKg.toFixed(2),
      ratioCement,
      ratioSand,
      ratioCoarse,
      bagWater,
      bagSand,
      bagCoarse,
      bagAdmixture,
      totalVolumeCost,
      spec
    };
  }, [grade, slumpReq, maxAggSize, spgCement, spgSand, spgCoarse, spgAdmixture, spgWater, sandMoisture, sandAbsorption, aggAbsorption, admixtureDose, waterReduction, batchVolume, concreteRate]);

  const handlePushToMasterBOQ = () => {
    const item = addItemToProject({
      category: 'Concrete & RCC',
      module: 'IS 10262 Mix Design Engine',
      description: `${grade} Grade Design Mix Concrete (Target Strength: ${mixResults.targetMeanStrength.toFixed(1)} MPa, Ratio 1:${mixResults.ratioSand}:${mixResults.ratioCoarse}, w/c: ${mixResults.wcRatio})`,
      quantity: Number(batchVolume),
      unit: 'm³',
      rate: concreteRate,
      cost: mixResults.totalVolumeCost
    });

    setToastMessage(`✓ Successfully added ${item.quantity} m³ of ${grade} Mix to Master Project BOQ!`);
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
                IS 10262:2019 & IS 456:2000 Standard
              </span>
              <span className="text-xs font-mono text-muted">Absolute Volume Concrete Mix Design</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              IS 10262:2019 <span className="gradient-text">Concrete Mix Design Engine</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-2xl leading-relaxed">
              Certified structural design mix batching with target mean strength $f'_{'{ck}'}$, aggregate moisture absorption corrections, superplasticizers, and 1-bag mixer proportions.
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
              className="px-4 py-2.5 bg-primary text-on-primary font-semibold rounded-lg text-xs transition-all flex items-center gap-2"
            >
              <span>+</span> Push {grade} Mix to Master BOQ
            </button>
          </div>
        </div>

        {/* Live Mix Design KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-line">
          <div className="stat-card">
            <span className="text-xs font-mono font-bold text-muted">Target Mean Strength</span>
            <p className="text-xl font-semibold text-primary mt-1 font-mono">
              {mixResults.targetMeanStrength.toFixed(2)} <span className="text-xs text-muted">MPa</span>
            </p>
            <span className="text-xs text-muted">f'ck = {gradeData[grade]?.fck} + 1.65×{gradeData[grade]?.s}</span>
          </div>

          <div className="stat-card">
            <span className="text-xs font-mono font-bold text-muted">Design Mix Ratio</span>
            <p className="text-xl font-semibold text-primary mt-1 font-mono">
              1 : {mixResults.ratioSand} : {mixResults.ratioCoarse}
            </p>
            <span className="text-xs text-muted">Cement : Sand : Aggregate</span>
          </div>

          <div className="stat-card bg-sunken border-line-control">
            <span className="text-xs font-mono font-bold text-ink">Water-Cement Ratio</span>
            <p className="text-xl font-semibold text-ink mt-1 font-mono">
              {mixResults.wcRatio.toFixed(2)}
            </p>
            <span className="text-xs text-ink">IS 456 Table 5 Max Limit</span>
          </div>

          <div className="stat-card">
            <span className="text-xs font-mono font-bold text-muted">Cement per m³</span>
            <p className="text-xl font-semibold text-accent mt-1 font-mono">
              {mixResults.cementContentKg} <span className="text-xs text-muted">kg ({(mixResults.cementContentKg / 50).toFixed(1)} bags)</span>
            </p>
            <span className="text-xs text-muted">Min Req: {gradeData[grade]?.minCement} kg</span>
          </div>
        </div>
      </div>

      {/* ── WORKSPACE: INPUT PARAMETERS + BATCH WEIGHT REPORT ── */}
      <div className="grid grid-cols-1 wide:grid-cols-12 gap-6">
        
        {/* Left Inputs (5 cols) */}
        <div className="wide:col-span-5 space-y-5">
          
          <div className="bg-surface border border-line rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
Mix Specifications & Materials
            </h2>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="concretemixdesignis10262-field-0" className="block text-xs font-bold text-muted font-mono mb-1">Concrete Grade</label>
                  <select id="concretemixdesignis10262-field-0"
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary font-mono font-bold text-primary"
                  >
                    {Object.keys(gradeData).map(g => (
                      <option key={g} value={g}>{g} Grade</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="concretemixdesignis10262-field-1" className="block text-xs font-bold text-muted font-mono mb-1">Exposure Condition</label>
                  <select id="concretemixdesignis10262-field-1"
                    value={exposure}
                    onChange={e => setExposure(e.target.value)}
                    className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary"
                  >
                    <option value="Mild">Mild (Sheltered RCC)</option>
                    <option value="Moderate">Moderate (Normal Rain)</option>
                    <option value="Severe">Severe (Coastal / Wet)</option>
                    <option value="Very Severe">Very Severe (Sea Water)</option>
                    <option value="Extreme">Extreme (Tidal Zone)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="concretemixdesignis10262-field-2" className="block text-xs font-bold text-muted font-mono mb-1">Max Coarse Agg Size</label>
                  <select id="concretemixdesignis10262-field-2"
                    value={maxAggSize}
                    onChange={e => setMaxAggSize(Number(e.target.value))}
                    className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary font-mono"
                  >
                    <option value={10}>10 mm Gravel</option>
                    <option value={20}>20 mm Standard</option>
                    <option value={40}>40 mm Mass Concrete</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="concretemixdesignis10262-field-3" className="block text-xs font-bold text-muted font-mono mb-1">Slump Workability (mm)</label>
                  <select id="concretemixdesignis10262-field-3"
                    value={slumpReq}
                    onChange={e => setSlumpReq(Number(e.target.value))}
                    className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary font-mono"
                  >
                    <option value={50}>50 mm (Pavements)</option>
                    <option value={75}>75 mm (Normal Slabs)</option>
                    <option value={100}>100 mm (Beams/Columns)</option>
                    <option value={150}>150 mm (Pumped RCC)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="concretemixdesignis10262-field-4" className="block text-xs font-bold text-muted font-mono mb-1">Fine Aggregate Sand Zone</label>
                <select id="concretemixdesignis10262-field-4"
                  value={sandZone}
                  onChange={e => setSandZone(e.target.value)}
                  className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary"
                >
                  <option value="Zone I">Zone I (Coarse Sand)</option>
                  <option value="Zone II (IS 383)">Zone II (Standard Medium Sand)</option>
                  <option value="Zone III">Zone III (Fine Sand)</option>
                  <option value="Zone IV">Zone IV (Very Fine Sand)</option>
                </select>
              </div>

              {/* Moisture & Chemical Admixture Adjustments */}
              <div className="pt-3 border-t border-line space-y-3">
                <span className="text-xs font-bold text-muted font-mono block">Moisture Corrections & Admixture</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="concretemixdesignis10262-field-5" className="block text-xs text-muted font-mono mb-1">Sand Free Moisture (%)</label>
                    <input id="concretemixdesignis10262-field-5"
                      type="number"
                      step="0.1"
                      value={sandMoisture}
                      onChange={e => setSandMoisture(Number(e.target.value))}
                      className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="concretemixdesignis10262-field-6" className="block text-xs text-muted font-mono mb-1">Superplasticizer Dose (%)</label>
                    <input id="concretemixdesignis10262-field-6"
                      type="number"
                      step="0.1"
                      value={admixtureDose}
                      onChange={e => setAdmixtureDose(Number(e.target.value))}
                      className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary font-mono text-primary font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Project Volume Sizing */}
              <div className="pt-3 border-t border-line grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="concretemixdesignis10262-field-7" className="block text-xs font-bold text-muted font-mono mb-1">Total Pour Volume (m³)</label>
                  <input id="concretemixdesignis10262-field-7"
                    type="number"
                    step="0.5"
                    value={batchVolume}
                    onChange={e => setBatchVolume(Number(e.target.value))}
                    className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary font-mono font-bold text-ink"
                  />
                </div>

                <div>
                  <label htmlFor="concretemixdesignis10262-field-8" className="block text-xs font-bold text-muted font-mono mb-1">RMC / Pour Rate ({currency}/m³)</label>
                  <input id="concretemixdesignis10262-field-8"
                    type="number"
                    value={concreteRate}
                    onChange={e => setConcreteRate(Number(e.target.value))}
                    className="w-full bg-sunken border border-line rounded-lg px-3 py-2 text-ink outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Batching Outputs (7 cols) */}
        <div className="wide:col-span-7 space-y-5">
          
          {/* Batch Proportions per 1 m³ Table */}
          <div className="bg-surface border border-line rounded-lg p-5 sm:p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Material Batch Quantities (Per 1.0 m³ Concrete)
                </h3>
                <span className="text-xs text-muted font-mono">IS 10262 Absolute Volume Schedule</span>
              </div>
              <span className="px-3 py-1 bg-sunken border border-line-control text-primary rounded-full font-mono text-xs font-bold">
                {grade} Mix Design
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line text-xs font-mono text-muted bg-sunken">
                    <th scope="col" className="py-2.5 px-3">Ingredient</th>
                    <th scope="col" className="py-2.5 px-3">Material Spec</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Mass per 1 m³</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Specific Gravity</th>
                    <th scope="col" className="py-2.5 px-3 text-right font-bold text-primary">Total Pour ({batchVolume} m³)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono">
                  <tr>
                    <td className="py-3 px-3 font-bold text-ink flex items-center gap-1.5">
Cement
                    </td>
                    <td className="py-3 px-3 text-muted font-sans text-xs">{cementType}</td>
                    <td className="py-3 px-3 text-right font-bold text-ink">{mixResults.cementContentKg} kg</td>
                    <td className="py-3 px-3 text-right text-muted">{spgCement}</td>
                    <td className="py-3 px-3 text-right font-semibold text-primary">
                      {(mixResults.cementContentKg * batchVolume).toFixed(0)} kg ({(mixResults.cementContentKg * batchVolume / 50).toFixed(0)} bags)
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-ink flex items-center gap-1.5">
Fine Aggregate
                    </td>
                    <td className="py-3 px-3 text-muted font-sans text-xs">{sandZone}</td>
                    <td className="py-3 px-3 text-right font-bold text-ink">{mixResults.sandKg} kg</td>
                    <td className="py-3 px-3 text-right text-muted">{spgSand}</td>
                    <td className="py-3 px-3 text-right font-semibold text-primary">
                      {(mixResults.sandKg * batchVolume).toFixed(0)} kg
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-ink flex items-center gap-1.5">
Coarse Aggregate
                    </td>
                    <td className="py-3 px-3 text-muted font-sans text-xs">{maxAggSize}mm Crushed Granite</td>
                    <td className="py-3 px-3 text-right font-bold text-ink">{mixResults.coarseKg} kg</td>
                    <td className="py-3 px-3 text-right text-muted">{spgCoarse}</td>
                    <td className="py-3 px-3 text-right font-semibold text-primary">
                      {(mixResults.coarseKg * batchVolume).toFixed(0)} kg
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-ink flex items-center gap-1.5">
Mixing Water
                    </td>
                    <td className="py-3 px-3 text-muted font-sans text-xs">Potable Water (w/c: {mixResults.wcRatio})</td>
                    <td className="py-3 px-3 text-right font-bold text-ink">{mixResults.finalWaterKg} L</td>
                    <td className="py-3 px-3 text-right text-muted">{spgWater}</td>
                    <td className="py-3 px-3 text-right font-semibold text-primary">
                      {(mixResults.finalWaterKg * batchVolume).toFixed(0)} Litres
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-ink flex items-center gap-1.5">
Superplasticizer
                    </td>
                    <td className="py-3 px-3 text-muted font-sans text-xs">{admixtureDose}% PCE Polymer</td>
                    <td className="py-3 px-3 text-right font-bold text-ink">{mixResults.admixtureKg} kg</td>
                    <td className="py-3 px-3 text-right text-muted">{spgAdmixture}</td>
                    <td className="py-3 px-3 text-right font-semibold text-primary">
                      {(mixResults.admixtureKg * batchVolume).toFixed(1)} kg
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 1-Bag Site Mixer Batch Card */}
          <div className="bg-surface border border-line rounded-lg p-5 sm:p-6 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <h3 className="text-xs font-semibold text-ink font-mono flex items-center gap-2">
Site Concrete Mixer Batching (Per 50 kg Bag of Cement)
              </h3>
              <span className="text-xs text-ink font-mono font-bold">1-BAG MIXER RECIPE</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-sunken p-3 rounded-lg border border-line text-center">
                <span className="text-xs text-muted font-mono">Cement</span>
                <p className="text-lg font-semibold text-ink font-mono mt-0.5">1 Bag</p>
                <span className="text-xs text-muted font-mono">(50 kg)</span>
              </div>

              <div className="bg-sunken p-3 rounded-lg border border-line text-center">
                <span className="text-xs text-muted font-mono">Sand</span>
                <p className="text-lg font-semibold text-primary font-mono mt-0.5">{mixResults.bagSand} kg</p>
                <span className="text-xs text-muted font-mono">~{(mixResults.bagSand / 1.6).toFixed(0)} L</span>
              </div>

              <div className="bg-sunken p-3 rounded-lg border border-line text-center">
                <span className="text-xs text-muted font-mono">Coarse Agg</span>
                <p className="text-lg font-semibold text-primary font-mono mt-0.5">{mixResults.bagCoarse} kg</p>
                <span className="text-xs text-muted font-mono">~{(mixResults.bagCoarse / 1.5).toFixed(0)} L</span>
              </div>

              <div className="bg-sunken p-3 rounded-lg border border-line text-center">
                <span className="text-xs text-muted font-mono">Water</span>
                <p className="text-lg font-semibold text-ink font-mono mt-0.5">{mixResults.bagWater} L</p>
                <span className="text-xs text-muted font-mono">+{mixResults.bagAdmixture} kg Admix</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
