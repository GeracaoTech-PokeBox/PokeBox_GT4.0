// Cadastro, login, sessão e redefinição de senha
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador } = require('../helpers/fabricas');

describe('contas', { skip: semBanco }, () => {
  let amb;
  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());
  beforeEach(() => amb.limparDados());

  test('cadastro dá 1000 Pokécoins, registra o bônus e o login não diferencia maiúsculas', async () => {
    const conta = { login: 'Ash', celular: '11999999999', senha: 'pikachu123' };
    const cadastro = await amb.api('POST', '/auth/cadastro', { corpo: conta });
    assert.equal(cadastro.status, 201);
    assert.equal(cadastro.dados.usuario.pokecoins, 1000);
    assert.ok(cadastro.dados.token);

    const { rows } = await amb.pool.query('SELECT valor, motivo FROM transacoes_pokecoins');
    assert.deepEqual(rows, [{ valor: 1000, motivo: 'bonus_cadastro' }]);

    const repetido = await amb.api('POST', '/auth/cadastro', { corpo: { ...conta, login: 'ASH' } });
    assert.equal(repetido.status, 400, 'login não diferencia maiúsculas');
  });

  test('login: senha errada é recusada, a certa abre sessão sem devolver o hash', async () => {
    await criarTreinador('Ash', { senha: 'pikachu123' });

    const errada = await amb.api('POST', '/auth/login', { corpo: { login: 'ash', senha: 'errada123' } });
    assert.equal(errada.status, 400);
    assert.equal((await amb.api('POST', '/auth/login', { corpo: { login: 'ninguem', senha: 'errada123' } })).dados.erro,
      errada.dados.erro, 'não revela se o login existe');

    const certa = await amb.api('POST', '/auth/login', { corpo: { login: 'ash', senha: 'pikachu123' } });
    assert.equal(certa.status, 200);
    assert.equal(certa.dados.usuario.senha_hash, undefined);
    assert.equal((await amb.api('GET', '/eu', { token: certa.dados.token })).status, 200);
  });

  test('sair derruba só aquela sessão', async () => {
    const ash = await criarTreinador('Ash', { senha: 'pikachu123' });
    const outra = (await amb.api('POST', '/auth/login', { corpo: { login: 'ash', senha: 'pikachu123' } })).dados.token;

    assert.equal((await amb.api('POST', '/auth/sair', { token: outra })).status, 204);
    assert.equal((await amb.api('GET', '/eu', { token: outra })).status, 401);
    assert.equal((await amb.api('GET', '/eu', { token: ash.token })).status, 200);
  });

  test('redefinir senha com login + celular derruba todas as sessões', async () => {
    const gary = await criarTreinador('gary', { senha: 'eevee1234', celular: '11888888888' });

    const verificar = (celular) => amb.api('POST', '/auth/verificar', { corpo: { login: 'GARY', celular } });
    assert.equal((await verificar('11888888888')).dados.encontrado, true);
    assert.equal((await verificar('11000000000')).dados.encontrado, false);

    const celularErrado = await amb.api('POST', '/auth/redefinir-senha', {
      corpo: { login: 'gary', celular: '11000000000', senha: 'novasenha1' },
    });
    assert.equal(celularErrado.status, 400);

    const redefinir = await amb.api('POST', '/auth/redefinir-senha', {
      corpo: { login: 'gary', celular: '11888888888', senha: 'novasenha1' },
    });
    assert.equal(redefinir.status, 204);
    assert.equal((await amb.api('GET', '/eu', { token: gary.token })).status, 401);
    assert.equal((await amb.api('POST', '/auth/login', { corpo: { login: 'gary', senha: 'eevee1234' } })).status, 400);
    assert.equal((await amb.api('POST', '/auth/login', { corpo: { login: 'gary', senha: 'novasenha1' } })).status, 200);
  });

  // Por último: o limite é por IP e caminho e fica em memória até o processo acabar.
  // Outros testes deste arquivo já chamaram /auth/verificar, então só dá para garantir
  // que o 429 chega em no máximo 21 chamadas e não libera depois.
  test('limite de tentativas: passou de 20 chamadas em 15 min, responde 429', async () => {
    await criarTreinador('Ash', { senha: 'pikachu123' });
    const verificar = () => amb.api('POST', '/auth/verificar', { corpo: { login: 'ash', celular: '11999999999' } });

    let bloqueio = null;
    for (let i = 0; i < 21 && !bloqueio; i += 1) {
      const r = await verificar();
      if (r.status === 429) bloqueio = r;
      else assert.equal(r.status, 200);
    }
    assert.ok(bloqueio, 'deveria bloquear até a 21ª chamada');
    assert.match(bloqueio.dados.erro, /Muitas tentativas/);
    assert.equal((await verificar()).status, 429);

    // O limite é por caminho: o login continua liberado
    assert.equal((await amb.api('POST', '/auth/login', { corpo: { login: 'ash', senha: 'pikachu123' } })).status, 200);
  });
});
