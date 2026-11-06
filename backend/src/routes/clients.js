const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM clients';
    const params = [];
    if (search) {
      sql += ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY name ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar clientes.', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar cliente.', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

    const [result] = await pool.query(
      'INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [name, phone || null, email || null, address || null, notes || null]
    );
    res.status(201).json({ id: result.insertId, name, phone, email, address, notes });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar cliente.', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    await pool.query(
      'UPDATE clients SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?',
      [name, phone || null, email || null, address || null, notes || null, req.params.id]
    );
    res.json({ id: Number(req.params.id), name, phone, email, address, notes });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar cliente.', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover cliente.', error: err.message });
  }
});

module.exports = router;
