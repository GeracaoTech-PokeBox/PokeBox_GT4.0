// Contas: hash de senha e de token de sessão. Só criptografia, sem banco.
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

// "sal:hash" em hex. scrypt já vem no Node, sem precisar de bcrypt.
async function gerarHashSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(senha, sal, 64);
  return `${sal}:${hash.toString('hex')}`;
}

async function conferirSenha(senha, salvo) {
  const [sal, hashHex] = salvo.split(':');
  const hash = await scrypt(senha, sal, 64);
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}

/** Token novo de sessão (vai para o front; no banco fica só o hash) */
const gerarToken = () => crypto.randomBytes(32).toString('hex');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = {
  gerarHashSenha, conferirSenha, gerarToken, hashToken,
};
