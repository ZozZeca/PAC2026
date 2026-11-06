const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'sql', 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, '..', '..', 'sql', 'seed.sql'), 'utf8');

  console.log('Aplicando schema.sql...');
  await connection.query(schema);
  console.log('Aplicando seed.sql...');
  await connection.query(seed);
  console.log('Banco de dados pronto.');
  await connection.end();
}

run().catch((err) => {
  console.error('Falha ao configurar o banco de dados:', err.message);
  process.exit(1);
});
