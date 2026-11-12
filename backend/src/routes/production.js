const express = require('express');
const authMiddleware = require('../middleware/auth');
const { computeProductionForDate, today, toDateString } = require('../utils/production');
const { isValidDate } = require('../utils/validation');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const productionDate = req.query.date || today();
    if (!isValidDate(productionDate)) {
      return res.status(400).json({ message: 'Data inválida (use o formato AAAA-MM-DD).' });
    }
    const result = await computeProductionForDate(productionDate);
    res.json(result);
  } catch (err) {
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

router.get('/range', async (req, res, next) => {
  try {
    const start = req.query.start_date || today();
    if (!isValidDate(start)) {
      return res.status(400).json({ message: 'Data inicial inválida (use o formato AAAA-MM-DD).' });
    }
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
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

module.exports = router;
