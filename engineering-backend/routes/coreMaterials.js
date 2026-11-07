const express = require('express');
const router = express.Router();

// Cement calculation
router.post('/cement', (req, res) => {
  const { volume, gradeRatio } = req.body;
  const totalCost = (volume * (gradeRatio * 0.4) * 320) + (volume * (gradeRatio * 0.8) * 1500) + (volume * (gradeRatio * 1.2) * 1200);
  res.json({ success: true, estimatedCost: totalCost.toFixed(2) });
});

// Sand calculation
router.post('/sand', (req, res) => {
  const { volumeM3, bulkingPct = 12, density = 1550, pricePerTon = 1400 } = req.body;
  const bulkedVol = volumeM3 * (1 + bulkingPct / 100);
  const tons = (bulkedVol * density) / 1000;
  const cost = tons * pricePerTon;
  res.json({ success: true, volumeM3: bulkedVol.toFixed(2), tons: tons.toFixed(2), cost: cost.toFixed(2) });
});

// Aggregate calculation
router.post('/aggregate', (req, res) => {
  const { volumeM3, compactionFactor = 1.2, density = 1600, pricePerTon = 1100 } = req.body;
  const orderVol = volumeM3 * compactionFactor;
  const tons = (orderVol * density) / 1000;
  const cost = tons * pricePerTon;
  res.json({ success: true, volumeM3: orderVol.toFixed(2), tons: tons.toFixed(2), cost: cost.toFixed(2) });
});

// Concrete calculation
router.post('/concrete', (req, res) => {
  const { wetVolumeM3, mixRatio = [1, 1.5, 3], pricePerM3 = 4200 } = req.body;
  const dryVol = wetVolumeM3 * 1.54;
  const totalParts = mixRatio.reduce((a, b) => a + b, 0);
  const cementBags = Math.ceil(((mixRatio[0] / totalParts) * dryVol * 1440) / 50);
  const sandTons = (((mixRatio[1] / totalParts) * dryVol * 1600) / 1000).toFixed(2);
  const aggTons = (((mixRatio[2] / totalParts) * dryVol * 1600) / 1000).toFixed(2);
  const cost = (wetVolumeM3 * pricePerM3).toFixed(2);
  res.json({ success: true, wetVolumeM3, dryVol: dryVol.toFixed(2), cementBags, sandTons, aggTons, cost });
});

// Steel calculation
router.post('/steel', (req, res) => {
  const { diaMm, totalLengthM, ratePerKg = 70 } = req.body;
  const unitWt = (diaMm * diaMm) / 162;
  const weightKg = totalLengthM * unitWt;
  const cost = weightKg * ratePerKg;
  res.json({ success: true, unitWt: unitWt.toFixed(3), weightKg: weightKg.toFixed(2), weightMT: (weightKg / 1000).toFixed(3), cost: cost.toFixed(2) });
});

module.exports = router;
