const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { validateIngredient } = require('../utils/validation');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ingredients ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, unit, cost_per_unit, stock_quantity } = req.body;
    const erro = validateIngredient(req.body);
    if (erro) return res.status(400).json({ message: erro });

    const [result] = await pool.query(
      'INSERT INTO ingredients (name, unit, cost_per_unit, stock_quantity) VALUES (?, ?, ?, ?)',
      [name, unit, cost_per_unit || 0, stock_quantity || 0]
    );
    res.status(201).json({ id: result.insertId, name, unit, cost_per_unit, stock_quantity });
  } catch (err) {
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, unit, cost_per_unit, stock_quantity } = req.body;
    const erro = validateIngredient(req.body);
    if (erro) return res.status(400).json({ message: erro });

    await pool.query(
      'UPDATE ingredients SET name = ?, unit = ?, cost_per_unit = ?, stock_quantity = ? WHERE id = ?',
      [name, unit, cost_per_unit || 0, stock_quantity || 0, req.params.id]
    );
    res.json({ id: Number(req.params.id), name, unit, cost_per_unit, stock_quantity });
  } catch (err) {
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM ingredients WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

module.exports = router;
