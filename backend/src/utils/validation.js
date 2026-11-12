// Validação dos dados que chegam do frontend, ANTES de gravar no banco.
// Cada função validaX recebe o corpo da requisição e devolve:
//   - null, se está tudo certo;
//   - uma mensagem de erro (texto), se algo está errado.
// A rota usa assim:
//   const erro = validateClient(req.body);
//   if (erro) return res.status(400).json({ message: erro });

const ORDER_STATUSES = ['pendente', 'em_producao', 'concluido', 'cancelado'];

// ---------- verificações pequenas, reaproveitadas abaixo ----------

function isFilled(value) {
  return typeof value === 'string' ? value.trim() !== '' : value !== undefined && value !== null;
}

// Aceita número ou texto com número ("2", "1.5"), como chega dos formulários.
function isNumber(value) {
  return value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Data no formato do banco (AAAA-MM-DD) e que existe de verdade (31/02 não passa).
function isValidDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// Campo opcional: se veio preenchido, tem que ser um número >= 0.
function isOptionalNonNegative(value) {
  return value === undefined || value === null || value === '' || (isNumber(value) && Number(value) >= 0);
}

// ---------- validações de cada cadastro ----------

function validateClient(body) {
  const { name, email } = body;
  if (!isFilled(name)) return 'Nome é obrigatório.';
  if (name.length > 150) return 'Nome pode ter no máximo 150 caracteres.';
  if (isFilled(email) && !isValidEmail(email)) return 'Email inválido.';
  return null;
}

function validateIngredient(body) {
  const { name, unit, cost_per_unit, stock_quantity } = body;
  if (!isFilled(name) || !isFilled(unit)) return 'Nome e unidade são obrigatórios.';
  if (!isOptionalNonNegative(cost_per_unit)) return 'O custo não pode ser negativo.';
  if (!isOptionalNonNegative(stock_quantity)) return 'O estoque não pode ser negativo.';
  return null;
}

function validateProduct(body) {
  const { name, price, production_lead_days, recipe } = body;
  if (!isFilled(name)) return 'Nome é obrigatório.';
  if (!isOptionalNonNegative(price)) return 'O preço não pode ser negativo.';

  if (production_lead_days !== undefined && production_lead_days !== null && production_lead_days !== '') {
    const days = Number(production_lead_days);
    if (!Number.isInteger(days) || days < 0 || days > 30) {
      return 'A antecedência de produção deve ser um número inteiro de 0 a 30 dias.';
    }
  }

  if (recipe !== undefined) {
    if (!Array.isArray(recipe)) return 'A receita deve ser uma lista de ingredientes.';
    const seen = new Set();
    for (const item of recipe) {
      if (!item.ingredient_id) return 'Cada item da receita precisa de um ingrediente.';
      if (!isNumber(item.quantity_per_unit) || Number(item.quantity_per_unit) <= 0) {
        return 'A quantidade de cada ingrediente da receita deve ser maior que zero.';
      }
      if (seen.has(Number(item.ingredient_id))) return 'O mesmo ingrediente aparece duas vezes na receita.';
      seen.add(Number(item.ingredient_id));
    }
  }
  return null;
}

// itemsRequired: no cadastro o pedido precisa de itens; na edição os itens podem não vir.
function validateOrder(body, { itemsRequired = true } = {}) {
  const { client_id, delivery_date, status, items } = body;
  if (!client_id) return 'Cliente é obrigatório.';
  if (!isValidDate(delivery_date)) return 'Data de entrega inválida (use o formato AAAA-MM-DD).';
  if (status !== undefined && !ORDER_STATUSES.includes(status)) {
    return `Status inválido. Use: ${ORDER_STATUSES.join(', ')}.`;
  }

  if (items === undefined && !itemsRequired) return null;
  if (!Array.isArray(items) || items.length === 0) return 'O pedido precisa ter ao menos um item.';
  for (const item of items) {
    if (!item.product_id) return 'Cada item do pedido precisa de um produto.';
    if (!isNumber(item.quantity) || Number(item.quantity) <= 0) {
      return 'A quantidade de cada item deve ser maior que zero.';
    }
    if (!isOptionalNonNegative(item.unit_price)) return 'O preço de um item não pode ser negativo.';
  }
  return null;
}

module.exports = {
  ORDER_STATUSES,
  isValidDate,
  isValidEmail,
  validateClient,
  validateIngredient,
  validateProduct,
  validateOrder
};
