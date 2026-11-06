const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ingredients ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar ingredientes.', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, unit, cost_per_unit, stock_quantity } = req.body;
    if (!name || !unit) return res.status(400).json({ message: 'Nome e unidade são obrigatórios.' });

    const [result] = await pool.query(
      'INSERT INTO ingredients (name, unit, cost_per_unit, stock_quantity) VALUES (?, ?, ?, ?)',
      [name, unit, cost_per_unit || 0, stock_quantity || 0]
    );
    res.status(201).json({ id: result.insertId, name, unit, cost_per_unit, stock_quantity });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar ingrediente.', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, unit, cost_per_unit, stock_quantity } = req.body;
    await pool.query(
      'UPDATE ingredients SET name = ?, unit = ?, cost_per_unit = ?, stock_quantity = ? WHERE id = ?',
      [name, unit, cost_per_unit || 0, stock_quantity || 0, req.params.id]
    );
    res.json({ id: Number(req.params.id), name, unit, cost_per_unit, stock_quantity });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar ingrediente.', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ingredients WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover ingrediente.', error: err.message });
  }
});

module.exports = router;
