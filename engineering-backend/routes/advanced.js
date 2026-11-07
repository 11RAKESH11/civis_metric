const express = require('express');
const router = express.Router();

router.post('/rebar-bbs', (req, res) => {
  const { diaMm, cuttingLenM, numBars = 1, ratePerKg = 70 } = req.body;
  const unitWt = (diaMm * diaMm) / 162;
  const totalWeightKg = cuttingLenM * numBars * unitWt;
  res.json({ success: true, unitWt: unitWt.toFixed(3), totalWeightKg: totalWeightKg.toFixed(2), cost: (totalWeightKg * ratePerKg).toFixed(2) });
});

router.post('/insulation', (req, res) => {
  const { areaSqft, thicknessIn, rValuePerInch = 4.0, costPerSqft = 45 } = req.body;
  const achievedR = thicknessIn * rValuePerInch;
  const cost = areaSqft * costPerSqft;
  res.json({ success: true, achievedR: achievedR.toFixed(1), achievedU: (1 / achievedR).toFixed(3), cost: cost.toFixed(2) });
});

router.post('/electrical-load', (req, res) => {
  const { appliances = [] } = req.body;
  const totalWatts = appliances.reduce((sum, a) => sum + (a.watts * a.count), 0);
  const totalKw = totalWatts / 1000;
  res.json({ success: true, totalWatts, totalKw: totalKw.toFixed(2), totalKva: (totalKw / 0.85).toFixed(2) });
});

module.exports = router;
