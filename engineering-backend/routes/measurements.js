const express = require('express');
const router = express.Router();

router.post('/area-converter', (req, res) => {
  const { value, fromUnit, toUnit } = req.body;
  const toSqft = { sqft: 1, sqm: 10.7639, sqyd: 9, acre: 43560, hectare: 107639.1, guntha: 1089, cent: 435.6 };
  const sqftVal = value * (toSqft[fromUnit] || 1);
  const result = sqftVal / (toSqft[toUnit] || 1);
  res.json({ success: true, result: result.toFixed(3) });
});

router.post('/volume', (req, res) => {
  const { shape, dimA, dimB, dimC } = req.body;
  let vol = 0;
  if (shape === 'cylinder') vol = Math.PI * Math.pow(dimA / 2, 2) * dimB;
  else if (shape === 'sphere') vol = (4/3) * Math.PI * Math.pow(dimA / 2, 3);
  else vol = dimA * dimB * dimC;
  res.json({ success: true, volumeM3: vol.toFixed(2), volumeCuFt: (vol * 35.3147).toFixed(2), liters: (vol * 1000).toFixed(0) });
});

module.exports = router;
