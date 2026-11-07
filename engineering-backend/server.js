const express = require('express');
const cors = require('cors');

const coreMaterialsRoutes = require('./routes/coreMaterials');
const structuralRoutes = require('./routes/structural');
const measurementsRoutes = require('./routes/measurements');
const finishingRoutes = require('./routes/finishing');
const costingRoutes = require('./routes/costing');
const advancedRoutes = require('./routes/advanced');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Category Route Mounts
app.use('/api/core-materials', coreMaterialsRoutes);
app.use('/api/structural', structuralRoutes);
app.use('/api/measurements', measurementsRoutes);
app.use('/api/finishing', finishingRoutes);
app.use('/api/costing', costingRoutes);
app.use('/api/advanced', advancedRoutes);

// Direct Legacy Route Support
app.use('/api/calculate', coreMaterialsRoutes);
app.use('/api/calculate', structuralRoutes);
app.use('/api/calculate', finishingRoutes);
app.use('/api/calculate', measurementsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Unified Engineering Backend running on http://localhost:${PORT}`);
});