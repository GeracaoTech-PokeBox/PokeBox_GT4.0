// Atalhos para montar batalhas entre treinadores nos testes de integração
const assert = require('node:assert/strict');

/**
 * Desafio aceito, batalha em andamento
 * @param {import('./ambiente').Ambiente} amb
 * @returns {Promise<number>} id da batalha
 */
async function criarBatalhaEmAndamento(amb, desafiante, desafiado) {
  const desafio = await amb.api('POST', '/batalhas', { token: desafiante.token, corpo: { oponente: desafiado.login } });
  assert.equal(desafio.status, 201, JSON.stringify(desafio.dados));
  const aceita = await amb.api('POST', `/batalhas/${desafio.dados.id}/responder`, {
    token: desafiado.token, corpo: { aceitar: true },
  });
  assert.equal(aceita.status, 200, JSON.stringify(aceita.dados));
  return desafio.dados.id;
}

async function lerEstado(amb, batalhaId) {
  const { rows: [batalha] } = await amb.pool.query('SELECT estado FROM batalhas WHERE id = $1', [batalhaId]);
  return batalha.estado;
}

/** O treinador (entre os recebidos) que tem a vez agora */
async function daVez(amb, batalhaId, treinadores) {
  const estado = await lerEstado(amb, batalhaId);
  return treinadores.find((t) => t.id === estado.lados[estado.vez].usuarioId);
}

/** Os dois atacam alternadamente `vezes` vezes (jogadas manuais contam para a recompensa) */
async function atacarAlternado(amb, batalhaId, treinadores, vezes) {
  for (let i = 0; i < vezes; i += 1) {
    const quem = await daVez(amb, batalhaId, treinadores);
    const r = await amb.api('POST', `/batalhas/${batalhaId}/jogadas`, { token: quem.token, corpo: { tipo: 'atacar' } });
    assert.equal(r.status, 200, JSON.stringify(r.dados));
    assert.equal(r.dados.status, 'em_andamento', 'a batalha acabou antes do previsto');
  }
}

/**
 * Deixa o lado que não tem a vez com um único Pokémon de pé, com 1 PS e sem a chance de resistir:
 * o próximo ataque de quem tem a vez encerra a batalha. Devolve quem vai dar o golpe final.
 */
async function deixarNoUltimoGolpe(amb, batalhaId, treinadores) {
  const estado = await lerEstado(amb, batalhaId);
  const vitima = estado.lados[estado.vez === 0 ? 1 : 0];
  vitima.pokemons.forEach((p, i) => {
    p.hp = i === vitima.ativo ? 1 : 0;
    p.afetoMaximo = false;
  });
  await amb.pool.query('UPDATE batalhas SET estado = $2 WHERE id = $1', [batalhaId, estado]);
  return daVez(amb, batalhaId, treinadores);
}

module.exports = { criarBatalhaEmAndamento, lerEstado, daVez, atacarAlternado, deixarNoUltimoGolpe };
