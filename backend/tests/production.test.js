// Testes do cálculo de produção (computeProductionForDate).
// Essa função consulta o banco de dados. Para o teste não depender do MySQL,
// trocamos o banco de verdade por um "banco de mentira" (mock).

// 1) Avisa o Jest: quando alguém pedir '../src/config/db', entregue isto no lugar.
//    jest.fn() é uma função falsa, e nós decidimos o que ela responde.
jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const pool = require('../src/config/db'); // agora é o banco de mentira
const { computeProductionForDate } = require('../src/utils/production');

// 2) Monta o banco de mentira a partir de listas simples.
//    Olhamos o texto do SQL para saber qual consulta está sendo feita.
function prepararBanco({ produtos, pedidos, receitas }) {
  pool.query.mockImplementation(async (sql, params) => {
    if (sql.includes('FROM products')) {
      return [produtos];
    }
    if (sql.includes('FROM order_items')) {
      const [productId, dataEntrega] = params;
      const total = pedidos
        .filter((p) => p.product_id === productId && p.delivery_date === dataEntrega)
        .reduce((soma, p) => soma + p.quantity, 0);
      return [[{ total_quantity: total }]];
    }
    if (sql.includes('FROM recipe_items')) {
      const [productId] = params;
      return [receitas.filter((r) => r.product_id === productId)];
    }
    throw new Error('Consulta inesperada: ' + sql);
  });
}

// Antes de cada teste, apaga o que o banco de mentira aprendeu no teste anterior.
beforeEach(() => {
  pool.query.mockReset();
});

describe('computeProductionForDate', () => {
  test('calcula a produção e o que falta no estoque', async () => {
    // Cenário: bolo de morango precisa de 2 dias de antecedência.
    // Entrega em 07/11 -> tem que ser produzido em 05/11.
    prepararBanco({
      produtos: [
        { id: 1, name: 'Bolo de Morango', unit: 'unidade', production_lead_days: 2 }
      ],
      pedidos: [
        { product_id: 1, delivery_date: '2026-11-07', quantity: 3 }
      ],
      receitas: [
        // cada bolo usa 0,5 kg de morango; tem 1 kg no estoque
        { product_id: 1, ingredient_id: 10, name: 'Morango', unit: 'kg', quantity_per_unit: 0.5, stock_quantity: 1 },
        // cada bolo usa 0,3 L de creme; tem 2 L no estoque
        { product_id: 1, ingredient_id: 11, name: 'Creme de leite', unit: 'L', quantity_per_unit: 0.3, stock_quantity: 2 }
      ]
    });

    const resultado = await computeProductionForDate('2026-11-05');

    // O que produzir: 3 bolos, para entregar em 07/11
    expect(resultado.items).toEqual([
      { product_id: 1, product_name: 'Bolo de Morango', unit: 'unidade', delivery_date: '2026-11-07', total_quantity: 3 }
    ]);

    // Morango: precisa 3 x 0,5 = 1,5 kg, tem 1 kg -> faltam 0,5 kg
    const morango = resultado.ingredients.find((i) => i.name === 'Morango');
    expect(morango.quantity_needed).toBe(1.5);
    expect(morango.shortage).toBe(0.5);

    // Creme: precisa 3 x 0,3 = 0,9 L, tem 2 L -> não falta nada
    const creme = resultado.ingredients.find((i) => i.name === 'Creme de leite');
    expect(creme.quantity_needed).toBe(0.9);
    expect(creme.shortage).toBe(0);
  });
  
  test('soma o mesmo ingrediente quando dois produtos usam ele', async () => {
    prepararBanco({
      produtos: [
        { id: 1, name: 'Bolo de Chocolate', unit: 'unidade', production_lead_days: 1 },
        { id: 2, name: 'Brigadeiro', unit: 'cento', production_lead_days: 1 }
      ],
      pedidos: [
        { product_id: 1, delivery_date: '2026-11-06', quantity: 2 },
        { product_id: 2, delivery_date: '2026-11-06', quantity: 1 }
      ],
      receitas: [
        { product_id: 1, ingredient_id: 20, name: 'Chocolate', unit: 'kg', quantity_per_unit: 0.4, stock_quantity: 1 },
        { product_id: 2, ingredient_id: 20, name: 'Chocolate', unit: 'kg', quantity_per_unit: 1, stock_quantity: 1 }
      ]
    });

    const resultado = await computeProductionForDate('2026-11-05');

    const chocolate = resultado.ingredients.find((i) => i.name === 'Chocolate');
    expect(chocolate.quantity_needed).toBe(1.8);
    expect(chocolate.shortage).toBe(0.8);
  });
});
