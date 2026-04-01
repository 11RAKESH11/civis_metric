const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. CORE MATERIALS & STRUCTURAL
// ==========================================

app.post('/api/calculate/cement', (req, res) => {
    const { volume, gradeRatio } = req.body;
    const totalCost = (volume * (gradeRatio * 0.4) * 320) + (volume * (gradeRatio * 0.8) * 1500) + (volume * (gradeRatio * 1.2) * 1200);
    res.json({ success: true, estimatedCost: totalCost.toFixed(2) });
});

app.post('/api/calculate/foundation', (req, res) => {
    const { length, width, depth } = req.body;
    // Foundation is a simple volume calculation: L * W * D
    const volume = length * width * depth;
    const costPerCubicMeter = 4500; // Average concrete cost
    res.json({ success: true, volume: volume.toFixed(2), cost: (volume * costPerCubicMeter).toFixed(2) });
});

app.post('/api/calculate/column', (req, res) => {
    const { radius, height } = req.body; // Assuming circular column
    // Volume of cylinder = π * r^2 * h
    const volume = Math.PI * Math.pow(radius, 2) * height;
    const costPerCubicMeter = 4800;
    res.json({ success: true, volume: volume.toFixed(2), cost: (volume * costPerCubicMeter).toFixed(2) });
});

app.post('/api/calculate/slab', (req, res) => {
    const { area, thickness } = req.body; // Area in sq m, thickness in meters
    const volume = area * thickness;
    const costPerCubicMeter = 4200;
    res.json({ success: true, volume: volume.toFixed(2), cost: (volume * costPerCubicMeter).toFixed(2) });
});

// ==========================================
// 2. FINISHING (Paint, Tiles, Plaster)
// ==========================================

app.post('/api/calculate/paint', (req, res) => {
    const { wallArea, coats } = req.body;
    // 1 Liter of paint covers approx 10 sq meters for 1 coat
    const litersNeeded = (wallArea * coats) / 10;
    const pricePerLiter = 250;
    res.json({ success: true, liters: litersNeeded.toFixed(2), cost: (litersNeeded * pricePerLiter).toFixed(2) });
});

app.post('/api/calculate/tile', (req, res) => {
    const { floorArea, tileLength, tileWidth } = req.body;
    const singleTileArea = tileLength * tileWidth;
    // Calculate basic tiles, add 10% for cutting/wastage
    const totalTiles = Math.ceil((floorArea / singleTileArea) * 1.10);
    const pricePerTile = 45;
    res.json({ success: true, tilesRequired: totalTiles, cost: (totalTiles * pricePerTile).toFixed(2) });
});

// ==========================================
// 3. MEASUREMENTS
// ==========================================

app.post('/api/calculate/area-converter', (req, res) => {
    const { value, fromUnit, toUnit } = req.body;
    // Simple conversion logic (e.g., Sq Ft to Sq Meters)
    let convertedValue = value;
    if (fromUnit === 'sqft' && toUnit === 'sqm') convertedValue = value * 0.092903;
    if (fromUnit === 'sqm' && toUnit === 'sqft') convertedValue = value * 10.7639;
    res.json({ success: true, result: convertedValue.toFixed(2) });
});

app.listen(PORT, () => {
    console.log(`🚀 Unified Engineering Backend running on http://localhost:${PORT}`);
});