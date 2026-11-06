const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

async function getOrderItems(orderId) {
  const [rows] = await pool.query(
    `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, p.name AS product_name, p.unit AS product_unit
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  return rows;
}

router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    let sql = `SELECT o.*, c.name AS client_name, c.phone AS client_phone,
                 (SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) FROM order_items oi WHERE oi.order_id = o.id) AS total_value
               FROM orders o
               JOIN clients c ON c.id = o.client_id
               WHERE 1 = 1`;
    const params = [];
    if (start_date) {
      sql += ' AND o.delivery_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND o.delivery_date <= ?';
      params.push(end_date);
    }
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY o.delivery_date ASC, o.id ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar pedidos.', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, c.name AS client_name, c.phone AS client_phone
       FROM orders o JOIN clients c ON c.id = o.client_id
       WHERE o.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Pedido não encontrado.' });
    const items = await getOrderItems(req.params.id);
    res.json({ ...rows[0], items });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar pedido.', error: err.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { client_id, delivery_date, status, notes, items } = req.body;
    if (!client_id || !delivery_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cliente, data de entrega e ao menos um item são obrigatórios.' });
    }

    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO orders (client_id, delivery_date, status, notes) VALUES (?, ?, ?, ?)',
      [client_id, delivery_date, status || 'pendente', notes || null]
    );
    const orderId = result.insertId;

    for (const item of items) {
      if (!item.product_id || !item.quantity) continue;
      const [[product]] = await connection.query('SELECT price FROM products WHERE id = ?', [item.product_id]);
      const unitPrice = item.unit_price != null ? item.unit_price : (product ? product.price : 0);
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, unitPrice]
      );
    }

    await connection.commit();
    const orderItems = await getOrderItems(orderId);
    res.status(201).json({ id: orderId, client_id, delivery_date, status: status || 'pendente', notes, items: orderItems });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Erro ao criar pedido.', error: err.message });
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const orderId = req.params.id;
    const { client_id, delivery_date, status, notes, items } = req.body;

    await connection.beginTransaction();
    await connection.query(
      'UPDATE orders SET client_id = ?, delivery_date = ?, status = ?, notes = ? WHERE id = ?',
      [client_id, delivery_date, status, notes || null, orderId]
    );

    if (Array.isArray(items)) {
      await connection.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        if (!item.product_id || !item.quantity) continue;
        const [[product]] = await connection.query('SELECT price FROM products WHERE id = ?', [item.product_id]);
        const unitPrice = item.unit_price != null ? item.unit_price : (product ? product.price : 0);
        await connection.query(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, unitPrice]
        );
      }
    }

    await connection.commit();
    const orderItems = await getOrderItems(orderId);
    res.json({ id: Number(orderId), client_id, delivery_date, status, notes, items: orderItems });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Erro ao atualizar pedido.', error: err.message });
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Erro ao remover pedido.', error: err.message });
  }
});

module.exports = router;
