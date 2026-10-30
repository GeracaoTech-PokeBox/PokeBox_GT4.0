const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const raiz = path.join(__dirname, '../..'); // onde fica o docker-compose.yml na minha maquina (Lucas)
const BANCO = 'pokebox_teste';

function docker(...args) {
  return execFileSync('docker', args, { cwd: raiz, encoding: 'utf8' }).trim();
}


// Procura um Postgres já rodando


let container = docker('ps', '--filter', 'publish=5432', '--format', '{{.Names}}').split('\n')[0];
if (!container) {
  console.log('Subindo o Postgres...');
  docker('compose', 'up', '-d', '--wait', 'db');
  container = docker('compose', 'ps', '-q', 'db');
}
console.log(`Usando o Postgres do container ${container}`);


// Garante que o banco pokebox_teste existe



const existe = docker('exec', container, 'psql', '-U', 'pokebox', '-d', 'postgres', '-tAc',
  `SELECT 1 FROM pg_database WHERE datname = '${BANCO}'`) === '1';
if (!existe) {
  console.log(`Criando o banco ${BANCO}...`);
  docker('exec', container, 'createdb', '-U', 'pokebox', BANCO);
}


// Define a variável DATABASE_URL_TESTE


const env = {
  ...process.env,
  DATABASE_URL_TESTE: process.env.DATABASE_URL_TESTE || `postgres://pokebox:pokebox@localhost:5432/${BANCO}`,
};


// Roda os testes


const resultado = spawnSync(process.execPath,
  ['--env-file=.env', '--test', 'test/integracao.test.js'],
  { cwd: path.join(__dirname, '..'), env, stdio: 'inherit' });
process.exit(resultado.status ?? 1);
