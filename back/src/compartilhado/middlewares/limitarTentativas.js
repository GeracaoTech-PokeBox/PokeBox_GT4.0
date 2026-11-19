/**
 * Limite simples por IP para as rotas de conta: dificulta testar senhas
 * ou celulares em massa. Fica em memória (zera quando o back reinicia).
 *
 * A chave usa req.path, que é relativo ao ponto onde o middleware foi montado:
 * montado no roteador de /auth, cada rota (/login, /cadastro...) tem a sua contagem.
 */
function limitarTentativas({ maximo, janelaMs }) {
  const tentativas = new Map();
  return (req, res, next) => {
    const agora = Date.now();
    const chave = `${req.ip}:${req.path}`;
    const registro = tentativas.get(chave);
    if (!registro || registro.inicio + janelaMs < agora) {
      tentativas.set(chave, { inicio: agora, total: 1 });
      next();
      return;
    }
    registro.total += 1;
    if (registro.total > maximo) {
      res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos e tente de novo.' });
      return;
    }
    next();
  };
}

module.exports = { limitarTentativas };
