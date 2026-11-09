require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const productsRoutes = require('./routes/products');
const ingredientsRoutes = require('./routes/ingredients');
const ordersRoutes = require('./routes/orders');
const productionRoutes = require('./routes/production');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/ingredients', ingredientsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

// Exporta o app sem ligar o servidor. Quem liga é o server.js.
// Assim os testes conseguem usar o app sem abrir a porta 3001.
module.exports = app;
