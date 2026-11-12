const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { validateProduct } = require('../utils/validation');

const router = express.Router();
router.use(authMiddleware);

async function getRecipe(productId) {
  const [rows] = await pool.query(
    `SELECT ri.id, ri.ingredient_id, ri.quantity_per_unit, i.name AS ingredient_name, i.unit AS ingredient_unit
     FROM recipe_items ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.product_id = ?`,
    [productId]
  );
  return rows;
}

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
    const recipe = await getRecipe(req.params.id);
    res.json({ ...rows[0], recipe });
  } catch (err) {
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

router.post('/', async (req, res, next) => {
  // valida antes de abrir a transação: dado inválido nem chega no banco
  const erro = validateProduct(req.body);
  if (erro) return res.status(400).json({ message: erro });

  const connection = await pool.getConnection();
  try {
    const { name, unit, price, production_lead_days, recipe } = req.body;

    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO products (name, unit, price, production_lead_days) VALUES (?, ?, ?, ?)',
      [name, unit || 'unidade', price || 0, production_lead_days || 1]
    );
    const productId = result.insertId;

    if (Array.isArray(recipe)) {
      for (const item of recipe) {
        await connection.query(
          'INSERT INTO recipe_items (product_id, ingredient_id, quantity_per_unit) VALUES (?, ?, ?)',
          [productId, item.ingredient_id, item.quantity_per_unit]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ id: productId, name, unit, price, production_lead_days });
  } catch (err) {
    await connection.rollback();
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res, next) => {
  const erro = validateProduct(req.body);
  if (erro) return res.status(400).json({ message: erro });

  const connection = await pool.getConnection();
  try {
    const { name, unit, price, production_lead_days, recipe } = req.body;
    const productId = req.params.id;

    await connection.beginTransaction();
    await connection.query(
      'UPDATE products SET name = ?, unit = ?, price = ?, production_lead_days = ? WHERE id = ?',
      [name, unit, price, production_lead_days || 1, productId]
    );

    if (Array.isArray(recipe)) {
      await connection.query('DELETE FROM recipe_items WHERE product_id = ?', [productId]);
      for (const item of recipe) {
        await connection.query(
          'INSERT INTO recipe_items (product_id, ingredient_id, quantity_per_unit) VALUES (?, ?, ?)',
          [productId, item.ingredient_id, item.quantity_per_unit]
        );
      }
    }

    await connection.commit();
    res.json({ id: Number(productId), name, unit, price, production_lead_days });
  } catch (err) {
    await connection.rollback();
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err); // o tratador de erros central (middleware/errorHandler.js) responde
  }
});

module.exports = router;
