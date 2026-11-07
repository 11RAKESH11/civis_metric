const express = require('express');
const router = express.Router();

// Foundation
router.post('/foundation', (req, res) => {
  const { length, width, depth, costPerCubicMeter = 4500 } = req.body;
  const volume = length * width * depth;
  res.json({ success: true, volume: volume.toFixed(2), cost: (volume * costPerCubicMeter).toFixed(2) });
});

// Excavation
router.post('/excavation', (req, res) => {
  const { length, width, depth, rate = 150 } = req.body;
  const volume = length * width * depth;
  res.json({ success: true, volume: volume.toFixed(2), cost: (volume * rate).toFixed(2) });
});

// Column
router.post('/column', (req, res) => {
  const { radius, length, width, height, isCircular = false, count = 1, costPerCubicMeter = 4800 } = req.body;
  let singleVol = isCircular ? (Math.PI * Math.pow(radius, 2) * height) : (length * width * height);
  const totalVol = singleVol * count;
  res.json({ success: true, volume: totalVol.toFixed(2), cost: (totalVol * costPerCubicMeter).toFixed(2) });
});

// Slab
router.post('/slab', (req, res) => {
  const { length, width, thickness, costPerCubicMeter = 4500 } = req.body;
  const volume = length * width * thickness;
  res.json({ success: true, volume: volume.toFixed(2), cost: (volume * costPerCubicMeter).toFixed(2) });
});

// Beam
router.post('/beam', (req, res) => {
  const { span, width, depth, count = 1, costPerCubicMeter = 4600 } = req.body;
  const volume = span * width * depth * count;
  res.json({ success: true, volume: volume.toFixed(2), cost: (volume * costPerCubicMeter).toFixed(2) });
});

// Staircase
router.post('/staircase', (req, res) => {
  const { rise, tread, width, steps, waistThick = 0.15, costPerCubicMeter = 4700 } = req.body;
  const stepsVol = 0.5 * rise * tread * width * steps;
  const waistVol = Math.sqrt(Math.pow(rise * steps, 2) + Math.pow(tread * steps, 2)) * width * waistThick;
  const totalVol = stepsVol + waistVol;
  res.json({ success: true, volume: totalVol.toFixed(2), cost: (totalVol * costPerCubicMeter).toFixed(2) });
});

module.exports = router;
