// Aplica sozinho, ao subir o back, os arquivos de db/migracoes que o banco ainda não tem.
// A tabela "migracoes" guarda quais já rodaram. No Docker a pasta entra por volume
// (docker-compose.yml); rodando direto do repositório ela fica em ../db/migracoes.
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('./db');

const PASTA = process.env.MIGRACOES_DIR ?? path.join(__dirname, '../../db/migracoes');
// Número qualquer, fixo: impede dois backs subindo juntos de aplicar a mesma migração
const TRAVA = 4815162342;

async function aplicarMigracoes() {
  if (!fs.existsSync(PASTA)) {
    console.warn(`Migrações: pasta ${PASTA} não encontrada, nada aplicado.`);
    return;
  }
  const arquivos = fs.readdirSync(PASTA).filter((nome) => nome.endsWith('.sql')).sort();

  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [TRAVA]);
    const { rows: [{ existe }] } = await client.query("SELECT to_regclass('migracoes') IS NOT NULL AS existe");

    if (!existe) {
      // Primeira vez: o banco veio do db.sql (que já tem tudo) ou já recebeu as migrações à mão,
      // então as que existem hoje contam como aplicadas. Daqui para frente só as novas rodam.
      await client.query(`CREATE TABLE migracoes (
        nome        TEXT PRIMARY KEY,
        aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await client.query('INSERT INTO migracoes (nome) SELECT unnest($1::text[])', [arquivos]);
      console.log(`Migrações: controle criado, ${arquivos.length} migração(ões) marcadas como já aplicadas.`);
      return;
    }

    const { rows } = await client.query('SELECT nome FROM migracoes');
    const aplicadas = new Set(rows.map((r) => r.nome));
    for (const nome of arquivos.filter((a) => !aplicadas.has(a))) {
      // Cada arquivo já tem o próprio BEGIN/COMMIT
      await client.query(fs.readFileSync(path.join(PASTA, nome), 'utf8'));
      await client.query('INSERT INTO migracoes (nome) VALUES ($1)', [nome]);
      console.log(`Migrações: ${nome} aplicada.`);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [TRAVA]).catch(() => {});
    client.release();
  }
}

module.exports = { aplicarMigracoes };
