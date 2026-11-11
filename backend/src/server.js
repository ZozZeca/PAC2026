// Ponto de partida da API: pega o app montado em app.js e liga o servidor.
const app = require('./app');

// Segurança: sem um JWT_SECRET de verdade, qualquer um poderia criar tokens falsos.
// Por isso o servidor se recusa a ligar se o segredo estiver vazio ou com o valor de exemplo.
const secret = process.env.JWT_SECRET;
if (!secret || secret === 'troque-esta-chave-em-producao' || secret.length < 32) {
  console.error('ERRO: defina um JWT_SECRET forte (32+ caracteres) no arquivo .env antes de ligar a API.');
  process.exit(1);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
