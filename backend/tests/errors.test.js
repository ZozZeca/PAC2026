// Testes do tratamento de erros central (src/middleware/errorHandler.js)
// e das rotas que ainda não tinham teste (ingredientes e produção).

process.env.JWT_SECRET = 'segredo-so-para-teste';

jest.mock('../src/config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const app = require('../src/app');

const autorizacao = `Bearer ${jwt.sign({ id: 1, name: 'Teste' }, process.env.JWT_SECRET)}`;

// Cria um erro igual ao que o MySQL devolve, com o código dele.
function erroDoMysql(code) {
  return Object.assign(new Error(`erro técnico do MySQL: ${code}`), { code });
}

beforeEach(() => {
  pool.query.mockReset();
});

describe('tratador de erros central', () => {
  test('remover cliente que tem pedidos responde 409 com mensagem clara', async () => {
    pool.query.mockRejectedValueOnce(erroDoMysql('ER_ROW_IS_REFERENCED_2'));

    const resposta = await request(app).delete('/api/clients/1').set('Authorization', autorizacao);

    expect(resposta.status).toBe(409);
    expect(resposta.body.message).toContain('Não é possível remover');
  });

  test('ingrediente com nome repetido responde 409', async () => {
    pool.query.mockRejectedValueOnce(erroDoMysql('ER_DUP_ENTRY'));

    const resposta = await request(app)
      .post('/api/ingredients')
      .set('Authorization', autorizacao)
      .send({ name: 'Farinha', unit: 'kg' });

    expect(resposta.status).toBe(409);
    expect(resposta.body.message).toBe('Já existe um registro com esses dados.');
  });

  test('erro desconhecido responde 500 SEM mostrar o detalhe técnico', async () => {
    pool.query.mockRejectedValueOnce(new Error('Access denied for user root (senha errada)'));

    const resposta = await request(app).get('/api/clients').set('Authorization', autorizacao);

    expect(resposta.status).toBe(500);
    expect(resposta.body.message).toBe('Erro interno do servidor. Tente novamente.');
    // o texto do erro do banco não pode vazar para a tela
    expect(JSON.stringify(resposta.body)).not.toContain('Access denied');
  });

  test('JSON mal escrito responde 400', async () => {
    const resposta = await request(app)
      .post('/api/clients')
      .set('Authorization', autorizacao)
      .set('Content-Type', 'application/json')
      .send('{ "name": "Ana" '); // falta fechar a chave

    expect(resposta.status).toBe(400);
  });

  test('em produção, o erro é registrado no log com data, método e endereço', async () => {
    const ambienteOriginal = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    pool.query.mockRejectedValueOnce(new Error('falha qualquer'));

    await request(app).get('/api/clients').set('Authorization', autorizacao);

    expect(log).toHaveBeenCalledWith(expect.stringContaining('ERRO em GET /api/clients: falha qualquer'));
    log.mockRestore();
    process.env.NODE_ENV = ambienteOriginal;
  });
});

describe('rotas de ingredientes', () => {
  test('lista os ingredientes', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'Farinha' }]]);
    const resposta = await request(app).get('/api/ingredients').set('Authorization', autorizacao);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
  });

  test('cria um ingrediente', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 4 }]);
    const resposta = await request(app)
      .post('/api/ingredients')
      .set('Authorization', autorizacao)
      .send({ name: 'Açúcar', unit: 'kg', stock_quantity: 5 });
    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBe(4);
  });

  test('estoque negativo responde 400 e não grava', async () => {
    const resposta = await request(app)
      .put('/api/ingredients/4')
      .set('Authorization', autorizacao)
      .send({ name: 'Açúcar', unit: 'kg', stock_quantity: -2 });
    expect(resposta.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('atualiza e remove um ingrediente', async () => {
    pool.query.mockResolvedValue([{}]);
    const atualizar = await request(app)
      .put('/api/ingredients/4')
      .set('Authorization', autorizacao)
      .send({ name: 'Açúcar', unit: 'kg', stock_quantity: 8 });
    const remover = await request(app).delete('/api/ingredients/4').set('Authorization', autorizacao);
    expect(atualizar.status).toBe(200);
    expect(remover.status).toBe(204);
  });
});

describe('rota de produção', () => {
  test('data inválida responde 400', async () => {
    const resposta = await request(app).get('/api/production?date=20/11/2026').set('Authorization', autorizacao);
    expect(resposta.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('calcula a produção de uma data', async () => {
    pool.query.mockResolvedValueOnce([[]]); // nenhum produto cadastrado
    const resposta = await request(app).get('/api/production?date=2026-11-20').set('Authorization', autorizacao);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ production_date: '2026-11-20', items: [], ingredients: [] });
  });

  test('produção de vários dias (range)', async () => {
    pool.query.mockResolvedValue([[]]);
    const resposta = await request(app)
      .get('/api/production/range?start_date=2026-11-20&days=3')
      .set('Authorization', autorizacao);
    expect(resposta.status).toBe(200);
    expect(resposta.body.map((dia) => dia.production_date)).toEqual(['2026-11-20', '2026-11-21', '2026-11-22']);
  });
});
