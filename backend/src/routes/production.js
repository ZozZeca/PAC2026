const express = require('express');
const authMiddleware = require('../middleware/auth');
const { computeProductionForDate, today, toDateString } = require('../utils/production');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const productionDate = req.query.date || today();
    const result = await computeProductionForDate(productionDate);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao calcular produção.', error: err.message });
  }
});

router.get('/range', async (req, res) => {
  try {
    const start = req.query.start_date || today();
    const days = Math.min(Number(req.query.days) || 7, 30);

    const results = [];
    const startDate = new Date(`${start}T00:00:00`);
    for (let i = 0; i < days; i += 1) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = toDateString(date);
      const result = await computeProductionForDate(dateStr);
      results.push(result);
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao calcular produção do período.', error: err.message });
  }
});

module.exports = router;
