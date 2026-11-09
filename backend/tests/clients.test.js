// Testes das rotas de clientes (/api/clients).

process.env.JWT_SECRET = 'segredo-so-para-teste';

jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const app = require('../src/app');

// Um token válido, como se a Márcia tivesse feito login.
const token = jwt.sign({ id: 1, name: 'Teste' }, process.env.JWT_SECRET);
const autorizacao = `Bearer ${token}`;

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/clients', () => {
  test('lista os clientes', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'Ana' }, { id: 2, name: 'Bruno' }]]);

    const resposta = await request(app).get('/api/clients').set('Authorization', autorizacao);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
  });

  test('a busca usa ? no SQL (proteção contra SQL injection)', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    await request(app).get('/api/clients?search=Ana').set('Authorization', autorizacao);

    // confere o SQL e os valores que a rota mandou para o banco
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('LIKE ?');
    expect(params).toEqual(['%Ana%', '%Ana%', '%Ana%']);
  });

  test('se o banco falhar, responde 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('banco fora do ar'));

    const resposta = await request(app).get('/api/clients').set('Authorization', autorizacao);

    expect(resposta.status).toBe(500);
  });
});

describe('GET /api/clients/:id', () => {
  test('cliente que existe', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 5, name: 'Carla' }]]);

    const resposta = await request(app).get('/api/clients/5').set('Authorization', autorizacao);

    expect(resposta.status).toBe(200);
    expect(resposta.body.name).toBe('Carla');
  });

  test('cliente que não existe responde 404', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const resposta = await request(app).get('/api/clients/999').set('Authorization', autorizacao);

    expect(resposta.status).toBe(404);
  });
});

describe('POST /api/clients', () => {
  test('cria um cliente', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 7 }]);

    const resposta = await request(app)
      .post('/api/clients')
      .set('Authorization', autorizacao)
      .send({ name: 'Daniela', phone: '47 99999-0000' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBe(7);
  });

  test('sem nome responde 400 e não grava nada', async () => {
    const resposta = await request(app)
      .post('/api/clients')
      .set('Authorization', autorizacao)
      .send({ phone: '47 99999-0000' });

    expect(resposta.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
