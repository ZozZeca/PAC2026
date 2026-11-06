import React, { useEffect, useState } from 'react';
import api from '../api/client';

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function Production() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function loadProduction(selectedDate) {
    setError('');
    try {
      const { data } = await api.get('/production', { params: { date: selectedDate } });
      setData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao calcular produção.');
    }
  }

  useEffect(() => {
    loadProduction(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDateChange(e) {
    setDate(e.target.value);
    loadProduction(e.target.value);
  }

  return (
    <div>
      <h2>Produção Diária</h2>
      <p className="page-subtitle">
        Selecione o dia de produção. O sistema agrupa os pedidos pela data de entrega
        e calcula o que precisa ser produzido considerando a antecedência de cada produto.
      </p>

      <label className="date-picker">
        Data de produção
        <input type="date" value={date} onChange={handleDateChange} />
      </label>

      {error && <div className="alert-error">{error}</div>}

      {data && (
        <>
          <section className="panel">
            <h3>Itens a produzir em {formatDate(data.production_date)}</h3>
            {data.items.length === 0 ? (
              <p>Nenhuma produção necessária nesta data.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade total</th>
                    <th>Data de entrega associada</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.product_id}>
                      <td>{item.product_name}</td>
                      <td>{item.total_quantity} {item.unit}</td>
                      <td>{formatDate(item.delivery_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel">
            <h3>Ingredientes necessários</h3>
            {data.ingredients.length === 0 ? (
              <p>Nenhum ingrediente necessário nesta data.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Quantidade necessária</th>
                    <th>Em estoque</th>
                    <th>Falta comprar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ingredients.map((ing) => (
                    <tr key={ing.ingredient_id} className={ing.shortage > 0 ? 'row-warning' : ''}>
                      <td>{ing.name}</td>
                      <td>{ing.quantity_needed} {ing.unit}</td>
                      <td>{ing.stock_quantity} {ing.unit}</td>
                      <td>{ing.shortage > 0 ? `${ing.shortage} ${ing.unit}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
