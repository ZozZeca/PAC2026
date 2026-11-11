// Troca a senha de um usuário que já existe.
// Uso: npm run change-password -- email@exemplo.com novaSenha
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function run() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.log('Uso: npm run change-password -- email@exemplo.com novaSenha');
    process.exit(1);
  }
  if (password.length < 8) {
    console.log('A senha precisa ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  // a senha nunca é guardada como texto: guardamos só o hash (bcrypt)
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, email]);

  if (result.affectedRows === 0) {
    console.log(`Nenhum usuário com o email ${email}.`);
  } else {
    console.log(`Senha de ${email} trocada com sucesso.`);
  }
  await pool.end();
}

run().catch((err) => {
  console.error('Falha ao trocar a senha:', err.message);
  process.exit(1);
});
