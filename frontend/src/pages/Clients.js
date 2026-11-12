import React, { useEffect, useState } from 'react';
import api from '../api/client';

const emptyForm = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function loadClients(query) {
    const { data } = await api.get('/clients', { params: query ? { search: query } : {} });
    setClients(data);
  }

  useEffect(() => {
    loadClients();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/clients/${editingId}`, form);
      } else {
        await api.post('/clients', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      loadClients(search);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar cliente.');
    }
  }

  function handleEdit(client) {
    setEditingId(client.id);
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    });
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este cliente?')) return;
    setError('');
    try {
      await api.delete(`/clients/${id}`);
      loadClients(search);
    } catch (err) {
      // ex.: cliente com pedidos não pode ser removido (a API responde 409)
      setError(err.response?.data?.message || 'Erro ao remover cliente.');
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSearch(e) {
    e.preventDefault();
    loadClients(search);
  }

  return (
    <div>
      <h2>Clientes</h2>

      <form className="inline-form" onSubmit={handleSearch}>
        <input
          placeholder="Buscar por nome, telefone ou email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      <section className="panel">
        <h3>{editingId ? 'Editar cliente' : 'Novo cliente'}</h3>
        {error && <div className="alert-error">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nome
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Telefone
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </label>
          <label>
            Endereço
            <input name="address" value={form.address} onChange={handleChange} />
          </label>
          <label className="full-width">
            Observações
            <textarea name="notes" value={form.notes} onChange={handleChange} />
          </label>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
            {editingId && <button type="button" onClick={handleCancelEdit}>Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Clientes cadastrados</h3>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.name}</td>
                <td>{client.phone}</td>
                <td>{client.email}</td>
                <td>
                  <button onClick={() => handleEdit(client)}>Editar</button>
                  <button onClick={() => handleDelete(client.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
