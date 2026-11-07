const express = require('express');
const router = express.Router();

router.post('/material-total', (req, res) => {
  const { items = [], taxPct = 18, freightPct = 5 } = req.body;
  const subTotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const tax = subTotal * (taxPct / 100);
  const freight = subTotal * (freightPct / 100);
  const grandTotal = subTotal + tax + freight;
  res.json({ success: true, subTotal: subTotal.toFixed(2), tax: tax.toFixed(2), freight: freight.toFixed(2), grandTotal: grandTotal.toFixed(2) });
});

router.post('/project-estimate', (req, res) => {
  const { builtUpSqft, ratePerSqft = 1850 } = req.body;
  const total = builtUpSqft * ratePerSqft;
  res.json({ success: true, builtUpSqft, total: total.toFixed(2) });
});

module.exports = router;
