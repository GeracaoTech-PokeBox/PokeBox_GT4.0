// Fábricas: montam o cenário de um teste direto pelas funções do jogo, sem passar pela API.
// Assim cada teste cria só o que precisa, e o que está sendo testado continua indo pela API.
// Só use depois de prepararAmbiente() (que define o banco antes destes requires).

/** Atributos fixos: card comum, IVs medianos e tamanho padrão */
const ATRIBUTOS_PADRAO = {
  shiny: false, iv_hp: 15, iv_ataque: 15, iv_defesa: 15, iv_velocidade: 15, mult_altura: 1, mult_peso: 1,
};

let proximoCelular = 11900000000;

/**
 * Cria um treinador com sessão aberta, online e com o saldo pedido.
 * Usa o cadastro do jogo direto (e não a rota) para não gastar o limite de tentativas por IP.
 * @param {string} login
 * @param {{ pokecoins?: number, pokebolas?: number, senha?: string, celular?: string }} [opcoes]
 * @returns {Promise<{ id: number, login: string, token: string, senha: string, celular: string }>}
 */
async function criarTreinador(login, { pokecoins = 1000, pokebolas = 0, senha = 'senha12345', celular } = {}) {
  const { cadastrarUsuario } = require('../../src/features/contas');
  const { pool } = require('../../src/banco/db');
  proximoCelular += 1;
  const cel = celular ?? String(proximoCelular);
  const { usuario, token } = await cadastrarUsuario({ login, celular: cel, senha });
  await pool.query(
    'UPDATE usuarios SET pokecoins = $2, pokebolas = $3, online_em = now() WHERE id = $1',
    [usuario.id, pokecoins, pokebolas],
  );
  return { id: usuario.id, login, token, senha, celular: cel };
}

/**
 * Cria um card para o treinador. Campos extras (afeto, humor, golpes...) são gravados depois do mint.
 * @param {{ id: number }} dono
 * @param {{ especieId?: number, posicaoTime?: number | null, nivel?: number, atributos?: object,
 *   origem?: 'inicial' | 'loja' | 'captura' } & Record<string, unknown>} [opcoes]
 * @returns {Promise<number>} id do card
 */
async function criarPokemon(dono, {
  especieId = 4, posicaoTime = null, nivel = 1, atributos = {}, origem = 'loja', ...campos
} = {}) {
  const { garantirEspecie } = require('../../src/features/especies');
  const { mintarPokemon } = require('../../src/features/pokemons');
  const { pool, transacao } = require('../../src/banco/db');

  await garantirEspecie(especieId);
  const id = await transacao((client) => mintarPokemon(client, {
    donoId: dono.id, especieId, origem, posicaoTime, nivel, atributos: { ...ATRIBUTOS_PADRAO, ...atributos },
  }));

  const colunas = Object.keys(campos);
  if (colunas.length > 0) {
    const sets = colunas.map((coluna, i) => `"${coluna}" = $${i + 2}`).join(', ');
    await pool.query(`UPDATE pokemons SET ${sets} WHERE id = $1`, [id, ...Object.values(campos)]);
  }
  return id;
}

/**
 * Time completo (posições 1 a 3), um Pokémon de cada família inicial
 * @returns {Promise<number[]>} ids na ordem do time
 */
async function criarTime(dono, { especies = [1, 4, 7], ...opcoes } = {}) {
  const ids = [];
  for (const [i, especieId] of especies.entries()) {
    ids.push(await criarPokemon(dono, { ...opcoes, especieId, posicaoTime: i + 1 }));
  }
  return ids;
}

module.exports = { criarTreinador, criarPokemon, criarTime };
