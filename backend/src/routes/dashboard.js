const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { computeProductionForDate, today } = require('../utils/production');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const currentDate = today();

    const todaysProduction = await computeProductionForDate(currentDate);

    const [futureOrders] = await pool.query(
      `SELECT o.id, o.delivery_date, o.status, c.name AS client_name,
              (SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) FROM order_items oi WHERE oi.order_id = o.id) AS total_value
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       WHERE o.delivery_date >= ? AND o.status != 'cancelado'
       ORDER BY o.delivery_date ASC
       LIMIT 10`,
      [currentDate]
    );

    const [[futureCount]] = await pool.query(
      `SELECT COUNT(*) AS total FROM orders WHERE delivery_date >= ? AND status != 'cancelado'`,
      [currentDate]
    );

    const [[revenue]] = await pool.query(
      `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS estimated_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.delivery_date >= ? AND o.status != 'cancelado'`,
      [currentDate]
    );

    const [[monthRevenue]] = await pool.query(
      `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS month_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'cancelado'
         AND YEAR(o.delivery_date) = YEAR(CURDATE()) AND MONTH(o.delivery_date) = MONTH(CURDATE())`
    );

    res.json({
      today: currentDate,
      todays_production: todaysProduction,
      future_orders: futureOrders,
      future_orders_count: futureCount.total,
      estimated_revenue_pipeline: Number(revenue.estimated_revenue),
      estimated_revenue_month: Number(monthRevenue.month_revenue)
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao carregar dashboard.', error: err.message });
  }
});

module.exports = router;
