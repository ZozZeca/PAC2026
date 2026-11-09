// Testes das rotas de pedidos (/api/orders).
// Criar e editar pedido usam TRANSAÇÃO: ou grava o pedido e todos os itens,
// ou não grava nada. Por isso aqui também simulamos a "conexão" do banco.

process.env.JWT_SECRET = 'segredo-so-para-teste';

jest.mock('../src/config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const app = require('../src/app');

const autorizacao = `Bearer ${jwt.sign({ id: 1, name: 'Teste' }, process.env.JWT_SECRET)}`;

// Conexão de mentira, com as funções que a transação usa.
let conexao;

beforeEach(() => {
  pool.query.mockReset();
  pool.getConnection.mockReset();
  conexao = {
    beginTransaction: jest.fn(),
    query: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
  };
  pool.getConnection.mockResolvedValue(conexao);
});

describe('GET /api/orders', () => {
  test('lista os pedidos', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, client_name: 'Ana' }]]);

    const resposta = await request(app).get('/api/orders').set('Authorization', autorizacao);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
  });

  test('aplica os filtros de data e status', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    await request(app)
      .get('/api/orders?start_date=2026-11-01&end_date=2026-11-30&status=pendente')
      .set('Authorization', autorizacao);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('o.delivery_date >= ?');
    expect(sql).toContain('o.delivery_date <= ?');
    expect(sql).toContain('o.status = ?');
    expect(params).toEqual(['2026-11-01', '2026-11-30', 'pendente']);
  });

  test('se o banco falhar, responde 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('banco fora do ar'));
    const resposta = await request(app).get('/api/orders').set('Authorization', autorizacao);
    expect(resposta.status).toBe(500);
  });
});

describe('GET /api/orders/:id', () => {
  test('devolve o pedido junto com os itens', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 3, client_name: 'Ana' }]]) // 1ª consulta: o pedido
      .mockResolvedValueOnce([[{ id: 1, product_name: 'Bolo', quantity: 2 }]]); // 2ª: os itens

    const resposta = await request(app).get('/api/orders/3').set('Authorization', autorizacao);

    expect(resposta.status).toBe(200);
    expect(resposta.body.client_name).toBe('Ana');
    expect(resposta.body.items).toHaveLength(1);
  });

  test('pedido que não existe responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const resposta = await request(app).get('/api/orders/999').set('Authorization', autorizacao);
    expect(resposta.status).toBe(404);
  });
});

describe('POST /api/orders', () => {
  test('cria o pedido e os itens dentro de uma transação', async () => {
    conexao.query
      .mockResolvedValueOnce([{ insertId: 10 }]) // INSERT do pedido
      .mockResolvedValueOnce([[{ price: 50 }]]) // busca o preço do produto
      .mockResolvedValueOnce([{}]); // INSERT do item
    pool.query.mockResolvedValueOnce([[{ id: 1, product_id: 4, quantity: 2, unit_price: 50 }]]); // itens no final

    const resposta = await request(app)
      .post('/api/orders')
      .set('Authorization', autorizacao)
      .send({ client_id: 1, delivery_date: '2026-11-20', items: [{ product_id: 4, quantity: 2 }] });

    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBe(10);
    expect(resposta.body.status).toBe('pendente'); // status padrão

    // sem preço informado, o item usa o preço do produto (50)
    const [, paramsDoItem] = conexao.query.mock.calls[2];
    expect(paramsDoItem).toEqual([10, 4, 2, 50]);

    // transação: começou, confirmou, e a conexão foi devolvida
    expect(conexao.beginTransaction).toHaveBeenCalled();
    expect(conexao.commit).toHaveBeenCalled();
    expect(conexao.rollback).not.toHaveBeenCalled();
    expect(conexao.release).toHaveBeenCalled();
  });

  test('sem itens responde 400 e não começa a transação', async () => {
    const resposta = await request(app)
      .post('/api/orders')
      .set('Authorization', autorizacao)
      .send({ client_id: 1, delivery_date: '2026-11-20', items: [] });

    expect(resposta.status).toBe(400);
    expect(conexao.beginTransaction).not.toHaveBeenCalled();
    expect(conexao.release).toHaveBeenCalled();
  });

  test('se der erro no meio, desfaz tudo (rollback)', async () => {
    conexao.query
      .mockResolvedValueOnce([{ insertId: 10 }]) // o pedido até grava...
      .mockRejectedValueOnce(new Error('falhou no item')); // ...mas o item falha

    const resposta = await request(app)
      .post('/api/orders')
      .set('Authorization', autorizacao)
      .send({ client_id: 1, delivery_date: '2026-11-20', items: [{ product_id: 4, quantity: 2 }] });

    expect(resposta.status).toBe(500);
    expect(conexao.rollback).toHaveBeenCalled();
    expect(conexao.commit).not.toHaveBeenCalled();
    expect(conexao.release).toHaveBeenCalled();
  });
});

describe('PUT /api/orders/:id', () => {
  test('atualiza o pedido e troca os itens', async () => {
    conexao.query
      .mockResolvedValueOnce([{}]) // UPDATE do pedido
      .mockResolvedValueOnce([{}]) // DELETE dos itens antigos
      .mockResolvedValueOnce([[{ price: 30 }]]) // preço do produto
      .mockResolvedValueOnce([{}]); // INSERT do item novo
    pool.query.mockResolvedValueOnce([[]]);

    const resposta = await request(app)
      .put('/api/orders/10')
      .set('Authorization', autorizacao)
      .send({ client_id: 1, delivery_date: '2026-11-21', status: 'em_producao', items: [{ product_id: 5, quantity: 1, unit_price: 35 }] });

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('em_producao');
    // aqui o preço foi informado (35), então ele é usado no lugar do preço do produto
    const [, paramsDoItem] = conexao.query.mock.calls[3];
    expect(paramsDoItem).toEqual(['10', 5, 1, 35]);
    expect(conexao.commit).toHaveBeenCalled();
  });

  test('se der erro, desfaz tudo (rollback)', async () => {
    conexao.query.mockRejectedValueOnce(new Error('falhou'));

    const resposta = await request(app)
      .put('/api/orders/10')
      .set('Authorization', autorizacao)
      .send({ client_id: 1, delivery_date: '2026-11-21', status: 'pendente' });

    expect(resposta.status).toBe(500);
    expect(conexao.rollback).toHaveBeenCalled();
  });
});

describe('DELETE /api/orders/:id', () => {
  test('remove o pedido', async () => {
    pool.query.mockResolvedValueOnce([{}]);
    const resposta = await request(app).delete('/api/orders/10').set('Authorization', autorizacao);
    expect(resposta.status).toBe(204);
  });
});
