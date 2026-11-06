const pool = require('../config/db');

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function today() {
  return toDateString(new Date());
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

async function computeProductionForDate(productionDate) {
  const [products] = await pool.query('SELECT * FROM products');

  const productionItems = [];
  for (const product of products) {
    const targetDeliveryDate = addDays(productionDate, product.production_lead_days);

    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(oi.quantity), 0) AS total_quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = ? AND o.delivery_date = ? AND o.status != 'cancelado'`,
      [product.id, targetDeliveryDate]
    );

    const totalQuantity = Number(rows[0].total_quantity);
    if (totalQuantity > 0) {
      productionItems.push({
        product_id: product.id,
        product_name: product.name,
        unit: product.unit,
        delivery_date: targetDeliveryDate,
        total_quantity: totalQuantity
      });
    }
  }

  const ingredientTotals = new Map();
  for (const item of productionItems) {
    const [recipeRows] = await pool.query(
      `SELECT ri.ingredient_id, ri.quantity_per_unit, i.name, i.unit, i.stock_quantity
       FROM recipe_items ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.product_id = ?`,
      [item.product_id]
    );

    for (const recipeRow of recipeRows) {
      const needed = item.total_quantity * Number(recipeRow.quantity_per_unit);
      const existing = ingredientTotals.get(recipeRow.ingredient_id);
      if (existing) {
        existing.quantity_needed += needed;
      } else {
        ingredientTotals.set(recipeRow.ingredient_id, {
          ingredient_id: recipeRow.ingredient_id,
          name: recipeRow.name,
          unit: recipeRow.unit,
          quantity_needed: needed,
          stock_quantity: Number(recipeRow.stock_quantity)
        });
      }
    }
  }

  const ingredients = Array.from(ingredientTotals.values()).map((ing) => ({
    ...ing,
    quantity_needed: Number(ing.quantity_needed.toFixed(3)),
    shortage: Number(Math.max(0, ing.quantity_needed - ing.stock_quantity).toFixed(3))
  }));

  return {
    production_date: productionDate,
    items: productionItems,
    ingredients
  };
}

module.exports = { computeProductionForDate, addDays, today, toDateString };
