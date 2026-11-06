const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function run() {
  const [, , name, email, password] = process.argv;

  if (!name || !email || !password) {
    console.log('Uso: npm run create-admin -- "Nome" email@exemplo.com senha');
    process.exit(1);
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    console.log(`Já existe um usuário com o email ${email}.`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );

  console.log(`Usuário ${email} criado com sucesso.`);
  await pool.end();
}

run().catch((err) => {
  console.error('Falha ao criar usuário:', err.message);
  process.exit(1);
});
