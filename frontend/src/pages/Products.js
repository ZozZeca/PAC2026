import React, { useEffect, useState } from 'react';
import api from '../api/client';

const emptyForm = { name: '', unit: 'unidade', price: '', production_lead_days: 1 };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [recipe, setRecipe] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function loadProducts() {
    const { data } = await api.get('/products');
    setProducts(data);
  }

  async function loadIngredients() {
    const { data } = await api.get('/ingredients');
    setIngredients(data);
  }

  useEffect(() => {
    loadProducts();
    loadIngredients();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function addRecipeRow() {
    setRecipe([...recipe, { ingredient_id: '', quantity_per_unit: '' }]);
  }

  function updateRecipeRow(index, field, value) {
    const next = [...recipe];
    next[index][field] = value;
    setRecipe(next);
  }

  function removeRecipeRow(index) {
    setRecipe(recipe.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      production_lead_days: Number(form.production_lead_days) || 1,
      recipe: recipe
        .filter((r) => r.ingredient_id && r.quantity_per_unit)
        .map((r) => ({ ingredient_id: Number(r.ingredient_id), quantity_per_unit: Number(r.quantity_per_unit) }))
    };
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setForm(emptyForm);
      setRecipe([]);
      setEditingId(null);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar produto.');
    }
  }

  async function handleEdit(product) {
    const { data } = await api.get(`/products/${product.id}`);
    setEditingId(product.id);
    setForm({
      name: data.name,
      unit: data.unit,
      price: data.price,
      production_lead_days: data.production_lead_days
    });
    setRecipe(data.recipe.map((r) => ({ ingredient_id: r.ingredient_id, quantity_per_unit: r.quantity_per_unit })));
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este produto?')) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setRecipe([]);
  }

  return (
    <div>
      <h2>Produtos & Receitas</h2>

      <section className="panel">
        <h3>{editingId ? 'Editar produto' : 'Novo produto'}</h3>
        {error && <div className="alert-error">{error}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nome
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Unidade (kg, cento, unidade...)
            <input name="unit" value={form.unit} onChange={handleChange} required />
          </label>
          <label>
            Preço de venda (R$)
            <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required />
          </label>
          <label>
            Dias de antecedência para produção
            <input
              name="production_lead_days"
              type="number"
              min="1"
              value={form.production_lead_days}
              onChange={handleChange}
              required
            />
          </label>

          <div className="full-width">
            <h4>Receita (quantidade de cada ingrediente para 1 {form.unit || 'unidade'})</h4>
            {recipe.map((row, index) => (
              <div className="recipe-row" key={index}>
                <select
                  value={row.ingredient_id}
                  onChange={(e) => updateRecipeRow(index, 'ingredient_id', e.target.value)}
                >
                  <option value="">Selecione o ingrediente</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Quantidade por unidade"
                  value={row.quantity_per_unit}
                  onChange={(e) => updateRecipeRow(index, 'quantity_per_unit', e.target.value)}
                />
                <button type="button" onClick={() => removeRecipeRow(index)}>Remover</button>
              </div>
            ))}
            <button type="button" onClick={addRecipeRow}>+ Adicionar ingrediente</button>
          </div>

          <div className="form-actions">
            <button type="submit">{editingId ? 'Salvar alterações' : 'Cadastrar produto'}</button>
            {editingId && <button type="button" onClick={handleCancelEdit}>Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Produtos cadastrados</h3>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Unidade</th>
              <th>Preço</th>
              <th>Antecedência</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.unit}</td>
                <td>{Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>{product.production_lead_days} dia(s)</td>
                <td>
                  <button onClick={() => handleEdit(product)}>Editar</button>
                  <button onClick={() => handleDelete(product.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
