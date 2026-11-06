USE marcia_confeitaria;

INSERT INTO ingredients (name, unit, cost_per_unit, stock_quantity) VALUES
('Farinha de trigo', 'kg', 5.50, 20),
('Açúcar', 'kg', 4.20, 15),
('Ovos', 'unidade', 0.60, 60),
('Manteiga', 'kg', 32.00, 8),
('Farinha de amêndoas', 'kg', 65.00, 5),
('Chocolate 70%', 'kg', 48.00, 6),
('Leite condensado', 'lata', 6.50, 10),
('Corante alimentício', 'ml', 0.30, 200)
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO products (name, unit, price, production_lead_days) VALUES
('Bolo de Chocolate (1kg)', 'kg', 90.00, 1),
('Bolo Red Velvet (1kg)', 'kg', 110.00, 1),
('Macaron Tradicional (cento)', 'cento', 180.00, 1),
('Macaron Recheado Especial (cento)', 'cento', 220.00, 1)
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO recipe_items (product_id, ingredient_id, quantity_per_unit)
SELECT p.id, i.id, v.qty FROM (
  SELECT 'Bolo de Chocolate (1kg)' AS product, 'Farinha de trigo' AS ingredient, 0.4 AS qty
  UNION ALL SELECT 'Bolo de Chocolate (1kg)', 'Açúcar', 0.35
  UNION ALL SELECT 'Bolo de Chocolate (1kg)', 'Ovos', 4
  UNION ALL SELECT 'Bolo de Chocolate (1kg)', 'Manteiga', 0.2
  UNION ALL SELECT 'Bolo de Chocolate (1kg)', 'Chocolate 70%', 0.25
  UNION ALL SELECT 'Bolo Red Velvet (1kg)', 'Farinha de trigo', 0.4
  UNION ALL SELECT 'Bolo Red Velvet (1kg)', 'Açúcar', 0.35
  UNION ALL SELECT 'Bolo Red Velvet (1kg)', 'Ovos', 4
  UNION ALL SELECT 'Bolo Red Velvet (1kg)', 'Manteiga', 0.2
  UNION ALL SELECT 'Bolo Red Velvet (1kg)', 'Corante alimentício', 15
  UNION ALL SELECT 'Macaron Tradicional (cento)', 'Farinha de amêndoas', 0.6
  UNION ALL SELECT 'Macaron Tradicional (cento)', 'Açúcar', 0.7
  UNION ALL SELECT 'Macaron Tradicional (cento)', 'Ovos', 12
  UNION ALL SELECT 'Macaron Recheado Especial (cento)', 'Farinha de amêndoas', 0.6
  UNION ALL SELECT 'Macaron Recheado Especial (cento)', 'Açúcar', 0.7
  UNION ALL SELECT 'Macaron Recheado Especial (cento)', 'Ovos', 12
  UNION ALL SELECT 'Macaron Recheado Especial (cento)', 'Leite condensado', 2
  UNION ALL SELECT 'Macaron Recheado Especial (cento)', 'Chocolate 70%', 0.3
) v
JOIN products p ON p.name = v.product
JOIN ingredients i ON i.name = v.ingredient
ON DUPLICATE KEY UPDATE quantity_per_unit = VALUES(quantity_per_unit);
