import React, { useEffect, useState } from 'react';
import api from '../api/client';

const emptyForm = { client_id: '', delivery_date: '', status: 'pendente', notes: '' };

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function loadOrders() {
    const { data } = await api.get('/orders');
    setOrders(data);
  }

  async function loadClients() {
    const { data } = await api.get('/clients');
    setClients(data);
  }

  async function loadProducts() {
    const { data } = await api.get('/products');
    setProducts(data);
  }

  useEffect(() => {
    loadOrders();
    loadClients();
    loadProducts();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function addItemRow() {
    setItems([...items, { product_id: '', quantity: '', unit_price: '' }]);
  }

  function updateItemRow(index, field, value) {
    const next = [...items];
    next[index][field] = value;
    if (field === 'product_id') {
      const product = products.find((p) => p.id === Number(value));
      if (product) next[index].unit_price = product.price;
    }
    setItems(next);
  }

  function removeItemRow(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      client_id: Number(form.client_id),
      delivery_date: form.delivery_date,
      status: form.status,
      notes: form.notes,
      items: items
        .filter((i) => i.product_id && i.quantity)
        .map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price)
        }))
    };

    if (payload.items.length === 0) {
      setError('Adicione ao menos um item ao pedido.');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/orders/${editingId}`, payload);
      } else {
        await api.post('/orders', payload);
      }
      setForm(emptyForm);
      setItems([]);
      setEditingId(null);
      loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar pedido.');
    }
  }

  async function handleEdit(order) {
    const { data } = await api.get(`/orders/${order.id}`);
    setEditingId(order.id);
    setForm({
      client_id: data.client_id,
      delivery_date: data.delivery_date,
      status: data.status,
      notes: data.notes || ''
    });
    setItems(data.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })));
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este pedido?')) return;
    await api.delete(`/orders/${id}`);
    loadOrders();
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setItems([]);
  }

  return (
    <div>
      <h2>Pedidos</h2>

      <section className="panel">
        <h3>{editingId ? 'Editar pedido' : 'Novo pedido'}</h3>
        {error && <div className="alert-error">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Cliente
            <select name="client_id" value={form.client_id} onChange={handleChange} required>
              <option value="">Selecione o cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label>
            Data de entrega
            <input type="date" name="delivery_date" value={form.delivery_date} onChange={handleChange} required />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="pendente">Pendente</option>
              <option value="em_producao">Em produção</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
          <label className="full-width">
            Observações
            <textarea name="notes" value={form.notes} onChange={handleChange} />
          </label>

          <div className="full-width">
            <h4>Itens do pedido</h4>
            {items.map((row, index) => (
              <div className="recipe-row" key={index}>
                <select
                  value={row.product_id}
                  onChange={(e) => updateItemRow(index, 'product_id', e.target.value)}
                >
                  <option value="">Selecione o produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Quantidade"
                  value={row.quantity}
                  onChange={(e) => updateItemRow(index, 'quantity', e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Preço unitário"
                  value={row.unit_price}
                  onChange={(e) => updateItemRow(index, 'unit_price', e.target.value)}
                />
                <button type="button" onClick={() => removeItemRow(index)}>Remover</button>
              </div>
            ))}
            <button type="button" onClick={addItemRow}>+ Adicionar item</button>
          </div>

          <div className="form-actions">
            <button type="submit">{editingId ? 'Salvar alterações' : 'Cadastrar pedido'}</button>
            {editingId && <button type="button" onClick={handleCancelEdit}>Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Pedidos cadastrados</h3>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Entrega</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.client_name}</td>
                <td>{formatDate(order.delivery_date)}</td>
                <td>{order.status}</td>
                <td>{formatCurrency(order.total_value)}</td>
                <td>
                  <button onClick={() => handleEdit(order)}>Editar</button>
                  <button onClick={() => handleDelete(order.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
