import React, { useEffect, useState } from 'react';
import api from '../api/client';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Erro ao carregar dashboard.'));
  }, []);

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <p>Carregando...</p>;

  return (
    <div>
      <h2>Dashboard</h2>
      <p className="page-subtitle">Hoje: {formatDate(data.today)}</p>

      <div className="cards-grid">
        <div className="card">
          <h3>Pedidos futuros</h3>
          <p className="card-number">{data.future_orders_count}</p>
        </div>
        <div className="card">
          <h3>Faturamento estimado (pedidos futuros)</h3>
          <p className="card-number">{formatCurrency(data.estimated_revenue_pipeline)}</p>
        </div>
        <div className="card">
          <h3>Faturamento estimado (mês atual)</h3>
          <p className="card-number">{formatCurrency(data.estimated_revenue_month)}</p>
        </div>
      </div>

      <section className="panel">
        <h3>Produção de hoje</h3>
        {data.todays_production.items.length === 0 ? (
          <p>Nenhuma produção necessária hoje.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {data.todays_production.items.map((item) => (
                <tr key={item.product_id}>
                  <td>{item.product_name}</td>
                  <td>{item.total_quantity} {item.unit}</td>
                  <td>{formatDate(item.delivery_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data.todays_production.ingredients.length > 0 && (
          <>
            <h4>Ingredientes necessários hoje</h4>
            <table>
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Necessário</th>
                  <th>Em estoque</th>
                  <th>Falta</th>
                </tr>
              </thead>
              <tbody>
                {data.todays_production.ingredients.map((ing) => (
                  <tr key={ing.ingredient_id} className={ing.shortage > 0 ? 'row-warning' : ''}>
                    <td>{ing.name}</td>
                    <td>{ing.quantity_needed} {ing.unit}</td>
                    <td>{ing.stock_quantity} {ing.unit}</td>
                    <td>{ing.shortage > 0 ? `${ing.shortage} ${ing.unit}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="panel">
        <h3>Próximos pedidos</h3>
        {data.future_orders.length === 0 ? (
          <p>Nenhum pedido futuro.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.future_orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.client_name}</td>
                  <td>{formatDate(order.delivery_date)}</td>
                  <td>{order.status}</td>
                  <td>{formatCurrency(order.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
