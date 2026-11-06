// Dados genéricos de TESTE para explorar o sistema.
//
//   npm run test-data            -> apaga os dados de teste anteriores e cria de novo
//   npm run test-data -- --limpar -> só apaga os dados de teste
//
// As datas dos pedidos são calculadas a partir de HOJE, então sempre há
// produção para o dia atual e para os próximos dias, não importa quando rodar.
// Clientes e pedidos de teste são marcados com "[TESTE]" nas observações,
// para poderem ser removidos sem tocar em dados reais.

const db = require('../config/db');
const { today, addDays } = require('./production');

const MARK = '[TESTE]';

const ingredients = [
  // nome, unidade, custo, estoque
  ['Morango', 'kg', 18.0, 3],
  ['Creme de leite', 'caixa', 4.5, 12],
  ['Cenoura', 'kg', 4.0, 5],
  ['Fermento em pó', 'kg', 30.0, 1],
  ['Granulado de chocolate', 'kg', 25.0, 2]
];

const products = [
  {
    name: 'Bolo de Cenoura com Chocolate (1kg)', unit: 'kg', price: 85, lead: 1,
    recipe: [['Farinha de trigo', 0.35], ['Açúcar', 0.3], ['Ovos', 3], ['Cenoura', 0.3],
      ['Fermento em pó', 0.015], ['Chocolate 70%', 0.1]]
  },
  {
    // 2 dias de antecedência: testa produtos com prazos diferentes
    name: 'Bolo de Morango com Chantilly (1kg)', unit: 'kg', price: 120, lead: 2,
    recipe: [['Farinha de trigo', 0.35], ['Açúcar', 0.3], ['Ovos', 4], ['Manteiga', 0.15],
      ['Morango', 0.4], ['Creme de leite', 1]]
  },
  {
    name: 'Brigadeiro Gourmet (cento)', unit: 'cento', price: 150, lead: 1,
    recipe: [['Leite condensado', 4], ['Chocolate 70%', 0.2], ['Manteiga', 0.05],
      ['Granulado de chocolate', 0.3]]
  }
];

const clients = [
  ['Carla Mendes', '(11) 91234-0001', 'carla.mendes@exemplo.com', 'Rua das Flores, 120'],
  ['Diego Ferreira', '(11) 91234-0002', 'diego.ferreira@exemplo.com', 'Av. Brasil, 455'],
  ['Elaine Souza', '(11) 91234-0003', 'elaine.souza@exemplo.com', 'Rua Ipê, 78'],
  ['Fábio Lima', '(11) 91234-0004', 'fabio.lima@exemplo.com', 'Rua do Comércio, 9'],
  ['Gabriela Rocha', '(11) 91234-0005', 'gabriela.rocha@exemplo.com', 'Al. Santos, 300'],
  ['Henrique Alves', '(11) 91234-0006', 'henrique.alves@exemplo.com', 'Rua Verde, 51'],
  ['Isabela Martins', '(11) 91234-0007', 'isabela.martins@exemplo.com', 'Rua Azul, 812'],
  ['Buffet Doce Festa', '(11) 3456-0008', 'contato@docefesta.exemplo.com', 'Av. Central, 1000']
];

const P = {
  choc: 'Bolo de Chocolate (1kg)',
  red: 'Bolo Red Velvet (1kg)',
  macT: 'Macaron Tradicional (cento)',
  macR: 'Macaron Recheado Especial (cento)',
  cen: 'Bolo de Cenoura com Chocolate (1kg)',
  mor: 'Bolo de Morango com Chantilly (1kg)',
  bri: 'Brigadeiro Gourmet (cento)'
};

// [dias a partir de hoje, cliente, status, itens, observação]
const orders = [
  [-10, 0, 'concluido', [[P.choc, 2]], 'Aniversário'],
  [-6, 1, 'concluido', [[P.macT, 1], [P.bri, 1]], ''],
  [-3, 2, 'concluido', [[P.red, 3]], ''],
  [-1, 3, 'concluido', [[P.cen, 2], [P.bri, 2]], 'Festa infantil'],
  [0, 4, 'em_producao', [[P.choc, 1.5], [P.macR, 1]], 'Retirar às 16h'],
  // entrega amanhã -> aparece na produção de HOJE (e deve gerar faltas de estoque)
  [1, 5, 'pendente', [[P.choc, 3], [P.macT, 4]], 'Festa de 15 anos'],
  [1, 6, 'pendente', [[P.red, 2], [P.macR, 5]], ''],
  [1, 7, 'pendente', [[P.bri, 3], [P.macT, 2]], 'Evento corporativo'],
  [1, 0, 'cancelado', [[P.choc, 50]], 'Cancelado: NÃO deve entrar na produção'],
  // morango tem 2 dias de antecedência -> também aparece na produção de HOJE
  [2, 1, 'pendente', [[P.mor, 2]], ''],
  [2, 2, 'pendente', [[P.cen, 1], [P.choc, 1]], ''],
  [3, 3, 'pendente', [[P.macT, 2]], ''],
  [5, 4, 'pendente', [[P.red, 4], [P.bri, 2]], 'Casamento civil'],
  [7, 7, 'pendente', [[P.mor, 3], [P.macR, 2]], ''],
  [10, 5, 'pendente', [[P.choc, 5], [P.bri, 5]], ''],
  [14, 6, 'pendente', [[P.macT, 3], [P.macR, 3]], 'Chá de bebê']
];

async function clearTestData(conn) {
  const like = `${MARK}%`;
  await conn.query('DELETE FROM orders WHERE notes LIKE ?', [like]);
  // pedidos de teste de clientes de teste, mesmo que alguém tenha editado a observação
  await conn.query(
    'DELETE o FROM orders o JOIN clients c ON c.id = o.client_id WHERE c.notes LIKE ?', [like]
  );
  await conn.query('DELETE FROM clients WHERE notes LIKE ?', [like]);
}

async function ensureCatalog(conn) {
  for (const [name, unit, cost, stock] of ingredients) {
    await conn.query(
      `INSERT INTO ingredients (name, unit, cost_per_unit, stock_quantity) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = name`,
      [name, unit, cost, stock]
    );
  }
  const [ingRows] = await conn.query('SELECT id, name FROM ingredients');
  const ingId = Object.fromEntries(ingRows.map((r) => [r.name, r.id]));

  for (const p of products) {
    // products não tem chave única no nome, então checa antes para não duplicar
    const [found] = await conn.query('SELECT id FROM products WHERE name = ? LIMIT 1', [p.name]);
    let id = found[0]?.id;
    if (!id) {
      const [res] = await conn.query(
        'INSERT INTO products (name, unit, price, production_lead_days) VALUES (?, ?, ?, ?)',
        [p.name, p.unit, p.price, p.lead]
      );
      id = res.insertId;
    }
    for (const [ing, qty] of p.recipe) {
      await conn.query(
        `INSERT INTO recipe_items (product_id, ingredient_id, quantity_per_unit) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity_per_unit = VALUES(quantity_per_unit)`,
        [id, ingId[ing], qty]
      );
    }
  }
}

async function createTestData(conn) {
  const clientIds = [];
  for (const [name, phone, email, address] of clients) {
    const [res] = await conn.query(
      'INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
      [name, phone, email, address, `${MARK} cliente fictício`]
    );
    clientIds.push(res.insertId);
  }

  const [prodRows] = await conn.query('SELECT id, name, price FROM products');
  const prod = {};
  for (const r of prodRows) if (!prod[r.name]) prod[r.name] = r;

  const base = today();
  for (const [offset, clientIdx, status, items, note] of orders) {
    const [res] = await conn.query(
      'INSERT INTO orders (client_id, delivery_date, status, notes) VALUES (?, ?, ?, ?)',
      [clientIds[clientIdx], addDays(base, offset), status, `${MARK} ${note}`.trim()]
    );
    for (const [name, qty] of items) {
      const p = prod[name];
      if (!p) throw new Error(`Produto não encontrado: ${name}`);
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [res.insertId, p.id, qty, p.price]
      );
    }
  }
}

async function run() {
  const onlyClear = process.argv.includes('--limpar');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await clearTestData(conn);
    if (!onlyClear) {
      await ensureCatalog(conn);
      await createTestData(conn);
    }
    await conn.commit();
    console.log(onlyClear
      ? 'Dados de teste removidos.'
      : `Dados de teste criados: ${clients.length} clientes e ${orders.length} pedidos (datas a partir de ${today()}).`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await db.end();
  }
}

run().catch((err) => {
  console.error('Falha ao gerar dados de teste:', err.message);
  process.exit(1);
});
