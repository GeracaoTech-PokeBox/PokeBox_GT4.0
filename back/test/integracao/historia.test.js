// Modo história: explorar, batalhar contra o selvagem, capturar, fugir, revanche e ignorar
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { prepararAmbiente, semBanco } = require('../helpers/ambiente');
const { criarTreinador, criarTime } = require('../helpers/fabricas');

describe('história', { skip: semBanco }, () => {
  let amb;
  let ash;

  before(async () => { amb = await prepararAmbiente(); });
  after(() => amb?.encerrar());

  // Time no nível 60: vence com folga os pontos de força 0,1x atacando
  beforeEach(async () => {
    await amb.limparDados();
    ash = await criarTreinador('Ash', { pokecoins: 1000, pokebolas: 50 });
    await criarTime(ash, { nivel: 60 });
  });

  const explorar = async () => (await amb.api('POST', '/historia/explorar', { token: ash.token })).dados;
  const historia = async () => (await amb.api('GET', '/historia', { token: ash.token })).dados;
  const jogada = (id, tipo) => amb.api('POST', `/historia/encontros/${id}/jogadas`, { token: ash.token, corpo: { tipo } });
  const capturar = (id) => amb.api('POST', `/historia/encontros/${id}/capturar`, { token: ash.token });
  const refazer = (ponto) => amb.api('POST', `/historia/trilhas/1/pontos/${ponto}/refazer`, { token: ash.token });
  const definirSaldo = (pokecoins) => amb.pool.query('UPDATE usuarios SET pokecoins = $2 WHERE id = $1', [ash.id, pokecoins]);

  /** Ataca até a batalha do encontro acabar. Recebe a resposta que abriu a batalha. */
  async function atacarAteOFim(id, resposta) {
    let atual = resposta;
    for (let i = 0; i < 100 && !atual.batalha.fim; i += 1) {
      const r = await jogada(id, 'atacar');
      assert.equal(r.status, 200, JSON.stringify(r.dados));
      atual = r.dados;
    }
    return atual;
  }

  /** Explora o próximo ponto e vence a batalha */
  async function vencerProximoPonto() {
    const encontro = await explorar();
    const inicio = (await amb.api('POST', `/historia/encontros/${encontro.id}/batalha`, { token: ash.token })).dados;
    const fim = await atacarAteOFim(encontro.id, inicio);
    assert.equal(fim.batalha.fim.vencedor, 0);
    return { encontro, fim };
  }

  test('explorar sorteia o selvagem do ponto, e repetir devolve o mesmo', async () => {
    const inicio = await historia();
    assert.deepEqual(inicio.proximo, { trilha: 1, ponto: 1, forca: 0.1 });
    assert.equal(inicio.encontros.length, 0);

    const encontro = await explorar();
    assert.deepEqual([encontro.trilha, encontro.ponto, encontro.forca, encontro.nivel], [1, 1, 0.1, 5]);
    assert.equal(encontro.situacao, 'encontrado');
    assert.equal((await explorar()).id, encontro.id);

    assert.equal((await capturar(encontro.id)).status, 400, 'só captura depois de vencer');
    const gary = await criarTreinador('gary');
    const alheio = await amb.api('POST', `/historia/encontros/${encontro.id}/batalha`, { token: gary.token });
    assert.equal(alheio.status, 404, 'não batalha no encontro de outro treinador');
  });

  test('sem time completo não batalha', async () => {
    const red = await criarTreinador('red');
    await criarTime(red, { especies: [1, 4] });
    const encontro = (await amb.api('POST', '/historia/explorar', { token: red.token })).dados;
    const r = await amb.api('POST', `/historia/encontros/${encontro.id}/batalha`, { token: red.token });
    assert.equal(r.status, 400);
    assert.match(r.dados.erro, /Monte um time/);
  });

  test('o selvagem responde a cada jogada do treinador', async () => {
    // Time no nível 1 contra o selvagem do ponto 1 (nível 5): nenhum lado cai num golpe só
    const red = await criarTreinador('red');
    await criarTime(red, { nivel: 1 });
    const encontro = (await amb.api('POST', '/historia/explorar', { token: red.token })).dados;
    await amb.api('POST', `/historia/encontros/${encontro.id}/batalha`, { token: red.token });

    const troca = await amb.api('POST', `/historia/encontros/${encontro.id}/jogadas`, {
      token: red.token, corpo: { tipo: 'trocar', indice: 1 },
    });
    assert.equal(troca.status, 200, JSON.stringify(troca.dados));
    const { log, fim } = troca.dados.batalha;
    assert.equal(fim, null);
    assert.deepEqual(log.slice(-2).map((turno) => turno.lado), [0, 1]);
    assert.equal(log.at(-2).eventos[0].tipo, 'entrou');
    assert.ok(['dano', 'errou'].includes(log.at(-1).eventos[0].tipo));
  });

  test('vencer dá Pokécoins e XP para o time todo e avança a trilha', async () => {
    const { encontro, fim } = await vencerProximoPonto();

    assert.deepEqual(
      { pokecoins: fim.batalha.recompensa.pokecoins, xp: fim.batalha.recompensa.xp },
      { pokecoins: 10, xp: 515 },
    );
    assert.equal(fim.encontro.situacao, 'vencido');
    assert.equal(fim.encontro.batalha, null);
    // XP para os 3 do time, mesmo os que não entraram em campo
    const { rows } = await amb.pool.query('SELECT xp FROM pokemons WHERE dono_id = $1 AND posicao_time IS NOT NULL', [ash.id]);
    assert.deepEqual(rows.map((p) => p.xp), [515, 515, 515]);
    assert.equal(await amb.saldo(ash.token), 1010);

    assert.equal((await jogada(encontro.id, 'atacar')).status, 400, 'batalha acabada não aceita jogada');
    const outraBatalha = await amb.api('POST', `/historia/encontros/${encontro.id}/batalha`, { token: ash.token });
    assert.match(outraBatalha.dados.erro, /Refazer/, 'encontro vencido não começa outra batalha');
    assert.deepEqual((await historia()).proximo, { trilha: 1, ponto: 2, forca: 0.2 });

    // Refazer só depois de capturar ou de o Pokémon fugir, e só pontos já vencidos
    assert.match((await refazer(1)).dados.erro, /restam 10 tentativas/);
    assert.equal((await refazer(2)).status, 400);
  });

  test('captura: ou captura mantendo nível, shiny e espécie, ou ele foge na 10ª tentativa', async () => {
    const { encontro } = await vencerProximoPonto();
    const chance = (await historia()).encontros.find((e) => e.id === encontro.id).chanceCaptura;
    assert.ok(chance >= 0.1 && chance <= 0.5, `chance ${chance}`);

    let captura;
    for (let i = 0; i < 10; i += 1) {
      captura = (await capturar(encontro.id)).dados;
      if (captura.capturou || captura.fugiu) break;
    }
    assert.equal(captura.encontro.tentativasCaptura, 50 - captura.pokebolas);
    if (captura.capturou) {
      assert.equal(captura.encontro.situacao, 'capturado');
      assert.equal(captura.pokemon.especieId, encontro.especieId);
      assert.equal(captura.pokemon.nivel, encontro.nivel);
      assert.equal(captura.pokemon.shiny, encontro.shiny);
      const { rows: [card] } = await amb.pool.query('SELECT origem, dono_id FROM pokemons WHERE id = $1', [captura.pokemon.id]);
      assert.deepEqual(card, { origem: 'captura', dono_id: ash.id });
    } else {
      assert.equal(captura.fugiu, true);
      assert.equal(captura.encontro.situacao, 'fugiu');
      assert.equal(captura.encontro.tentativasCaptura, 10);
    }
    assert.equal((await capturar(encontro.id)).status, 400);
  });

  test('captura sem pokébola é recusada', async () => {
    const { encontro } = await vencerProximoPonto();
    await amb.pool.query('UPDATE usuarios SET pokebolas = 0 WHERE id = $1', [ash.id]);
    assert.equal((await capturar(encontro.id)).status, 400);
  });

  test('fugir da batalha mantém o mesmo selvagem no ponto e não custa nada', async () => {
    const encontro = await explorar();
    await amb.api('POST', `/historia/encontros/${encontro.id}/batalha`, { token: ash.token });
    const fuga = (await jogada(encontro.id, 'desistir')).dados;

    assert.equal(fuga.batalha.fim.vencedor, 1);
    assert.equal(fuga.encontro.situacao, 'encontrado');
    assert.equal(fuga.encontro.batalha, null);
    assert.equal(await amb.saldo(ash.token), 1000);
    assert.equal((await explorar()).id, encontro.id);
  });

  test('revanche: novo selvagem, custa 25, paga metade do XP e não mexe na trilha', async () => {
    const { encontro } = await vencerProximoPonto();
    await amb.pool.query("UPDATE historia_encontros SET status = 'fugiu' WHERE id = $1", [encontro.id]);

    await definirSaldo(20);
    const semSaldo = await refazer(1);
    assert.equal(semSaldo.status, 400);
    assert.match(semSaldo.dados.erro, /25 Pokécoins/);

    await definirSaldo(100);
    let revanche = (await refazer(1)).dados;
    assert.notEqual(revanche.encontro.id, encontro.id);
    assert.equal(revanche.encontro.revanche, true);
    assert.equal(revanche.encontro.forca, 0.1);
    assert.equal(revanche.batalha.estado.revanche, true);
    assert.equal(await amb.saldo(ash.token), 75);
    // Pedir de novo devolve a mesma batalha sem cobrar outra vez
    assert.equal((await refazer(1)).dados.encontro.id, revanche.encontro.id);
    assert.equal(await amb.saldo(ash.token), 75);

    revanche = await atacarAteOFim(revanche.encontro.id, revanche);
    assert.equal(revanche.batalha.fim.vencedor, 0);
    assert.equal(revanche.batalha.recompensa.xp, 258); // metade dos 515 da primeira vez
    assert.equal(revanche.encontro.situacao, 'vencido');
    assert.equal(await amb.saldo(ash.token), 85);

    const estado = await historia();
    assert.deepEqual(estado.proximo, { trilha: 1, ponto: 2, forca: 0.2 });
    assert.equal(estado.vencidos, 1);
    assert.equal(estado.encontros.find((e) => e.ponto === 1).id, revanche.encontro.id);
  });

  test('ignorar: só depois de vencer, e libera o ponto para refazer', async () => {
    const { encontro } = await vencerProximoPonto();
    const ignorar = (id) => amb.api('POST', `/historia/encontros/${id}/ignorar`, { token: ash.token });

    const naoVencido = await explorar();
    assert.equal((await ignorar(naoVencido.id)).status, 400);

    const ignorado = await ignorar(encontro.id);
    assert.equal(ignorado.status, 200, JSON.stringify(ignorado.dados));
    assert.equal(ignorado.dados.situacao, 'ignorado');
    assert.equal((await capturar(encontro.id)).status, 400);
    assert.equal((await ignorar(encontro.id)).status, 400);
  });

  test('na última tentativa de captura sem sucesso, o Pokémon foge', async () => {
    const { encontro } = await vencerProximoPonto();
    await amb.pool.query('UPDATE historia_encontros SET tentativas_captura = 9 WHERE id = $1', [encontro.id]);
    const ultima = (await capturar(encontro.id)).dados;
    assert.equal(ultima.encontro.situacao, ultima.capturou ? 'capturado' : 'fugiu');
    assert.equal(ultima.encontro.tentativasCaptura, 10);
  });

  test('perder uma revanche faz o Pokémon fugir', async () => {
    const { encontro } = await vencerProximoPonto();
    await amb.pool.query("UPDATE historia_encontros SET status = 'fugiu' WHERE id = $1", [encontro.id]);

    const revanche = (await refazer(1)).dados;
    const perdida = (await jogada(revanche.encontro.id, 'desistir')).dados;
    assert.equal(perdida.encontro.situacao, 'fugiu');

    const estado = await historia();
    assert.equal(estado.vencidos, 1);
    assert.equal(estado.encontros.find((e) => e.ponto === 1).situacao, 'fugiu');
  });
});
