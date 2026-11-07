const express = require('express');
const router = express.Router();

router.post('/paint', (req, res) => {
  const { wallAreaSqft, coats = 2, pricePerLiter = 380, coveragePerLiter = 130 } = req.body;
  const liters = (wallAreaSqft * coats) / coveragePerLiter;
  res.json({ success: true, liters: liters.toFixed(2), cost: (liters * pricePerLiter).toFixed(2) });
});

router.post('/plaster', (req, res) => {
  const { areaSqft, thicknessMm = 12, ratio = [1, 4] } = req.body;
  const areaSqm = areaSqft / 10.7639;
  const dryVolM3 = areaSqm * (thicknessMm / 1000) * 1.33;
  const totalParts = ratio[0] + ratio[1];
  const cementBags = Math.ceil(((ratio[0] / totalParts) * dryVolM3 * 1440) / 50);
  const sandTons = (((ratio[1] / totalParts) * dryVolM3 * 1600) / 1000).toFixed(2);
  res.json({ success: true, dryVolM3: dryVolM3.toFixed(2), cementBags, sandTons });
});

router.post('/tile', (req, res) => {
  const { floorAreaSqft, tileBoxSqft = 15.5, pricePerBox = 850 } = req.body;
  const totalBoxes = Math.ceil((floorAreaSqft * 1.08) / tileBoxSqft);
  res.json({ success: true, totalBoxes, cost: (totalBoxes * pricePerBox).toFixed(2) });
});

module.exports = router;
