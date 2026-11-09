// Ponto de partida da API: pega o app montado em app.js e liga o servidor.
const app = require('./app');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
