// Testes das regras de validação (src/utils/validation.js).
// São funções puras: recebem os dados e devolvem null (ok) ou a mensagem de erro.
// Não precisam de banco nem de servidor.

const {
  isValidDate,
  isValidEmail,
  validateClient,
  validateIngredient,
  validateProduct,
  validateOrder
} = require('../src/utils/validation');

describe('isValidDate', () => {
  test('aceita uma data normal', () => {
    expect(isValidDate('2026-11-20')).toBe(true);
  });
  test('aceita 29/02 em ano bissexto', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
  });
  test('recusa 29/02 em ano que não é bissexto', () => {
    expect(isValidDate('2026-02-29')).toBe(false);
  });
  test('recusa formato brasileiro e texto', () => {
    expect(isValidDate('20/11/2026')).toBe(false);
    expect(isValidDate('amanhã')).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});

describe('isValidEmail', () => {
  test('aceita email normal', () => {
    expect(isValidEmail('ana@teste.com')).toBe(true);
  });
  test('recusa email sem @ ou sem domínio', () => {
    expect(isValidEmail('ana.teste.com')).toBe(false);
    expect(isValidEmail('ana@teste')).toBe(false);
  });
});

describe('validateClient', () => {
  test('cliente só com nome está ok', () => {
    expect(validateClient({ name: 'Ana' })).toBeNull();
  });
  test('nome em branco não pode', () => {
    expect(validateClient({ name: '   ' })).toBe('Nome é obrigatório.');
  });
  test('email preenchido precisa ser válido', () => {
    expect(validateClient({ name: 'Ana', email: 'ana' })).toBe('Email inválido.');
  });
  test('email vazio pode (é opcional)', () => {
    expect(validateClient({ name: 'Ana', email: '' })).toBeNull();
  });
});

describe('validateIngredient', () => {
  test('ingrediente completo está ok', () => {
    expect(validateIngredient({ name: 'Farinha', unit: 'kg', cost_per_unit: '5.5', stock_quantity: 10 })).toBeNull();
  });
  test('sem unidade não pode', () => {
    expect(validateIngredient({ name: 'Farinha' })).toBe('Nome e unidade são obrigatórios.');
  });
  test('estoque negativo não pode', () => {
    expect(validateIngredient({ name: 'Farinha', unit: 'kg', stock_quantity: -1 })).toBe('O estoque não pode ser negativo.');
  });
});

describe('validateProduct', () => {
  const receitaOk = [{ ingredient_id: 1, quantity_per_unit: 0.5 }];

  test('produto completo está ok', () => {
    expect(validateProduct({ name: 'Bolo', price: 60, production_lead_days: 2, recipe: receitaOk })).toBeNull();
  });
  test('preço negativo não pode', () => {
    expect(validateProduct({ name: 'Bolo', price: -10 })).toBe('O preço não pode ser negativo.');
  });
  test('antecedência fora de 0 a 30 dias, ou quebrada, não pode', () => {
    expect(validateProduct({ name: 'Bolo', production_lead_days: 31 })).not.toBeNull();
    expect(validateProduct({ name: 'Bolo', production_lead_days: 1.5 })).not.toBeNull();
  });
  test('quantidade zero na receita não pode', () => {
    expect(validateProduct({ name: 'Bolo', recipe: [{ ingredient_id: 1, quantity_per_unit: 0 }] }))
      .toBe('A quantidade de cada ingrediente da receita deve ser maior que zero.');
  });
  test('o mesmo ingrediente duas vezes na receita não pode', () => {
    const receita = [
      { ingredient_id: 1, quantity_per_unit: 0.5 },
      { ingredient_id: 1, quantity_per_unit: 0.2 }
    ];
    expect(validateProduct({ name: 'Bolo', recipe: receita })).toBe('O mesmo ingrediente aparece duas vezes na receita.');
  });
});

describe('validateOrder', () => {
  const pedidoOk = { client_id: 1, delivery_date: '2026-11-20', items: [{ product_id: 1, quantity: 2 }] };

  test('pedido completo está ok', () => {
    expect(validateOrder(pedidoOk)).toBeNull();
  });
  test('sem cliente não pode', () => {
    expect(validateOrder({ ...pedidoOk, client_id: undefined })).toBe('Cliente é obrigatório.');
  });
  test('status que não existe não pode', () => {
    expect(validateOrder({ ...pedidoOk, status: 'entregue' })).toContain('Status inválido');
  });
  test('quantidade zero ou negativa não pode', () => {
    expect(validateOrder({ ...pedidoOk, items: [{ product_id: 1, quantity: 0 }] })).not.toBeNull();
    expect(validateOrder({ ...pedidoOk, items: [{ product_id: 1, quantity: -3 }] })).not.toBeNull();
  });
  test('preço negativo no item não pode', () => {
    expect(validateOrder({ ...pedidoOk, items: [{ product_id: 1, quantity: 1, unit_price: -5 }] }))
      .toBe('O preço de um item não pode ser negativo.');
  });
  test('na edição, o pedido pode vir sem itens', () => {
    const { items, ...semItens } = pedidoOk;
    expect(validateOrder(semItens, { itemsRequired: false })).toBeNull();
    expect(validateOrder(semItens)).toBe('O pedido precisa ter ao menos um item.');
  });
});
