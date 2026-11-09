// Testes do login e da proteção das rotas (token JWT).
// O Supertest faz requisições HTTP para o app, como o frontend faria,
// mas sem precisar ligar o servidor na porta 3001.

// Segredo usado só nos testes (o .env de verdade não é usado aqui).
process.env.JWT_SECRET = 'segredo-so-para-teste';

jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const app = require('../src/app');

beforeEach(() => {
  pool.query.mockReset();
});

describe('rotas gerais', () => {
  test('GET /api/health responde que a API está no ar', async () => {
    const resposta = await request(app).get('/api/health');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  test('rota que não existe responde 404', async () => {
    const resposta = await request(app).get('/api/nao-existe');
    expect(resposta.status).toBe(404);
  });
});

describe('POST /api/auth/login', () => {
  test('sem email ou senha responde 400', async () => {
    const resposta = await request(app).post('/api/auth/login').send({ email: 'a@a.com' });
    expect(resposta.status).toBe(400);
  });

  test('email que não existe responde 401', async () => {
    // o banco de mentira responde: nenhum usuário encontrado
    pool.query.mockResolvedValueOnce([[]]);

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@teste.com', password: 'qualquer' });

    expect(resposta.status).toBe(401);
  });

  test('senha errada responde 401', async () => {
    const hash = await bcrypt.hash('senha-certa', 4);
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'Teste', email: 't@teste.com', password_hash: hash }]]);

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 't@teste.com', password: 'senha-errada' });

    expect(resposta.status).toBe(401);
  });

  test('email e senha certos devolvem um token válido', async () => {
    const hash = await bcrypt.hash('senha-certa', 4);
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'Teste', email: 't@teste.com', password_hash: hash, role: 'admin' }]]);

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 't@teste.com', password: 'senha-certa' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.user.email).toBe('t@teste.com');
    // o token tem que abrir com o segredo e conter o id do usuário
    const conteudo = jwt.verify(resposta.body.token, process.env.JWT_SECRET);
    expect(conteudo.id).toBe(1);
    // a senha nunca pode voltar na resposta
    expect(resposta.body.user.password_hash).toBeUndefined();
  });
});

describe('proteção das rotas (middleware de autenticação)', () => {
  test('sem token responde 401', async () => {
    const resposta = await request(app).get('/api/clients');
    expect(resposta.status).toBe(401);
  });

  test('com token falso responde 401', async () => {
    const resposta = await request(app)
      .get('/api/clients')
      .set('Authorization', 'Bearer token-inventado');
    expect(resposta.status).toBe(401);
  });
});
