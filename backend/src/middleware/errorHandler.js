// Tratamento de erros central da API.
// Toda rota que dá erro chama next(err), e o erro chega aqui.
// Aqui decidimos três coisas:
//   1) registrar o erro no log (para quem cuida do sistema investigar);
//   2) escolher o código HTTP certo;
//   3) devolver uma mensagem clara, SEM detalhes técnicos do banco.

// Erros conhecidos do MySQL, traduzidos para mensagens de quem usa o sistema.
const ERROS_DO_BANCO = {
  // tentou apagar algo que outra tabela usa (ex.: cliente que tem pedidos)
  ER_ROW_IS_REFERENCED_2: {
    status: 409,
    message: 'Não é possível remover: este registro está sendo usado (por exemplo, um cliente com pedidos ou um produto em algum pedido).'
  },
  // tentou gravar algo repetido onde não pode (ex.: dois ingredientes com o mesmo nome)
  ER_DUP_ENTRY: { status: 409, message: 'Já existe um registro com esses dados.' },
  // apontou para algo que não existe (ex.: pedido de um cliente que não existe)
  ER_NO_REFERENCED_ROW_2: { status: 400, message: 'O cliente, produto ou ingrediente informado não existe.' }
};

function registrarErro(err, req) {
  // Durante os testes automáticos não poluímos a tela com logs.
  if (process.env.NODE_ENV === 'test') return;
  const quando = new Date().toISOString();
  console.error(`[${quando}] ERRO em ${req.method} ${req.originalUrl}: ${err.message}`);
  if (err.stack) console.error(err.stack);
}

// O Express reconhece que é um tratador de erros porque a função tem 4 parâmetros.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  registrarErro(err, req);

  // JSON mal escrito no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Os dados enviados não estão em um formato válido (JSON).' });
  }

  const conhecido = ERROS_DO_BANCO[err.code];
  if (conhecido) {
    return res.status(conhecido.status).json({ message: conhecido.message });
  }

  // Qualquer outro erro: mensagem genérica. O detalhe fica só no log.
  return res.status(500).json({ message: 'Erro interno do servidor. Tente novamente.' });
}

module.exports = errorHandler;
