// Testes das rotas de produtos (/api/products).
// Um produto tem uma receita (lista de ingredientes). Criar e editar
// gravam o produto e a receita juntos, numa transação.

process.env.JWT_SECRET = 'segredo-so-para-teste';

jest.mock('../src/config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const app = require('../src/app');

const autorizacao = `Bearer ${jwt.sign({ id: 1, name: 'Teste' }, process.env.JWT_SECRET)}`;

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

describe('GET /api/products', () => {
  test('lista os produtos', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'Bolo' }, { id: 2, name: 'Brigadeiro' }]]);
    const resposta = await request(app).get('/api/products').set('Authorization', autorizacao);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
  });

  test('se o banco falhar, responde 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('banco fora do ar'));
    const resposta = await request(app).get('/api/products').set('Authorization', autorizacao);
    expect(resposta.status).toBe(500);
  });
});

describe('GET /api/products/:id', () => {
  test('devolve o produto junto com a receita', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1, name: 'Bolo de Morango' }]]) // o produto
      .mockResolvedValueOnce([[{ ingredient_name: 'Morango', quantity_per_unit: 0.5 }]]); // a receita

    const resposta = await request(app).get('/api/products/1').set('Authorization', autorizacao);

    expect(resposta.status).toBe(200);
    expect(resposta.body.recipe[0].ingredient_name).toBe('Morango');
  });

  test('produto que não existe responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const resposta = await request(app).get('/api/products/999').set('Authorization', autorizacao);
    expect(resposta.status).toBe(404);
  });
});

describe('POST /api/products', () => {
  test('cria o produto com a receita', async () => {
    conexao.query
      .mockResolvedValueOnce([{ insertId: 8 }]) // INSERT do produto
      .mockResolvedValue([{}]); // INSERTs da receita

    const resposta = await request(app)
      .post('/api/products')
      .set('Authorization', autorizacao)
      .send({
        name: 'Bolo de Cenoura',
        price: 60,
        production_lead_days: 1,
        recipe: [
          { ingredient_id: 1, quantity_per_unit: 0.3 },
          { ingredient_id: 2, quantity_per_unit: 0.2 }
        ]
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBe(8);
    // 1 INSERT do produto + 2 INSERTs da receita
    expect(conexao.query).toHaveBeenCalledTimes(3);
    expect(conexao.commit).toHaveBeenCalled();
    expect(conexao.release).toHaveBeenCalled();
  });

  test('sem nome responde 400', async () => {
    const resposta = await request(app)
      .post('/api/products')
      .set('Authorization', autorizacao)
      .send({ price: 60 });

    expect(resposta.status).toBe(400);
    expect(conexao.beginTransaction).not.toHaveBeenCalled();
  });

  test('se der erro, desfaz tudo (rollback)', async () => {
    conexao.query.mockRejectedValueOnce(new Error('falhou'));

    const resposta = await request(app)
      .post('/api/products')
      .set('Authorization', autorizacao)
      .send({ name: 'Bolo' });

    expect(resposta.status).toBe(500);
    expect(conexao.rollback).toHaveBeenCalled();
    expect(conexao.commit).not.toHaveBeenCalled();
  });
});

describe('PUT /api/products/:id', () => {
  test('atualiza o produto e troca a receita inteira', async () => {
    conexao.query.mockResolvedValue([{}]);

    const resposta = await request(app)
      .put('/api/products/8')
      .set('Authorization', autorizacao)
      .send({ name: 'Bolo de Cenoura', unit: 'unidade', price: 65, recipe: [{ ingredient_id: 1, quantity_per_unit: 0.4 }] });

    expect(resposta.status).toBe(200);
    expect(resposta.body.price).toBe(65);
    // a receita antiga é apagada antes de gravar a nova
    expect(conexao.query.mock.calls[1][0]).toContain('DELETE FROM recipe_items');
    expect(conexao.commit).toHaveBeenCalled();
  });

  test('se der erro, desfaz tudo (rollback)', async () => {
    conexao.query.mockRejectedValueOnce(new Error('falhou'));

    const resposta = await request(app)
      .put('/api/products/8')
      .set('Authorization', autorizacao)
      .send({ name: 'Bolo' });

    expect(resposta.status).toBe(500);
    expect(conexao.rollback).toHaveBeenCalled();
  });
});

describe('DELETE /api/products/:id', () => {
  test('remove o produto', async () => {
    pool.query.mockResolvedValueOnce([{}]);
    const resposta = await request(app).delete('/api/products/8').set('Authorization', autorizacao);
    expect(resposta.status).toBe(204);
  });
});
