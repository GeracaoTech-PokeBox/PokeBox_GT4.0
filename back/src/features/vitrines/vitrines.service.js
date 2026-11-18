// Vitrine: o perfil público de cada treinador, com os Pokémon em destaque e o álbum de espécies.
// Regras de negócio e transações; o SQL fica no model e o formato da resposta na view.
const { pool, transacao } = require('../../banco/db');
const config = require('../../compartilhado/config');
const { ErroJogo } = require('../../compartilhado/erros');
const model = require('./vitrines.model');
const view = require('./vitrines.view');

const ESTILOS = ['palco', 'album'];

// Sem linha em vitrines, a vitrine usa estes padrões
const VITRINE_PADRAO = { bio: '', estilo: 'palco', visitas: 0 };

/**
 * Vitrine de um treinador. A visita de outro treinador soma no contador.
 * @param {number} visitanteId
 * @param {string} login  dono da vitrine
 */
async function obterVitrine(visitanteId, login) {
  const dono = await model.buscarDonoPorLogin(pool, login);
  if (!dono) throw new ErroJogo('Treinador não encontrado.');
  const souDono = dono.id === visitanteId;

  // A primeira visita de outro treinador já cria a linha
  const dados = (souDono ? await model.lerVitrine(pool, dono.id) : await model.registrarVisita(pool, dono.id))
    ?? VITRINE_PADRAO;

  const [numeros, especies, vitorias, destaques] = await Promise.all([
    model.contarColecao(pool, dono.id),
    model.listarEspecies(pool, dono.id),
    model.contarVitorias(pool, dono.id),
    model.buscarDestaques(pool, dono.id),
  ]);

  return view.vitrine({
    dono, souDono, dados, numeros, vitorias, destaques, especies,
  });
}

/**
 * Salva bio, estilo e os Pokémon em destaque (na ordem recebida).
 * @param {number} usuarioId
 * @param {{ bio: string, estilo: string, pokemonIds: number[] }} dados
 */
async function salvarVitrine(usuarioId, { bio, estilo, pokemonIds }) {
  if (bio.length > config.BIO_VITRINE_MAXIMO) {
    throw new ErroJogo(`A apresentação pode ter no máximo ${config.BIO_VITRINE_MAXIMO} caracteres.`);
  }
  if (!ESTILOS.includes(estilo)) throw new ErroJogo('Estilo de vitrine inválido.');
  if (pokemonIds.length > config.DESTAQUES_VITRINE || new Set(pokemonIds).size !== pokemonIds.length) {
    throw new ErroJogo(`Escolha até ${config.DESTAQUES_VITRINE} Pokémon diferentes para a vitrine.`);
  }

  await transacao(async (client) => {
    await model.travarUsuario(client, usuarioId);
    const meus = await model.contarPokemonsDoDono(client, pokemonIds, usuarioId);
    if (meus !== pokemonIds.length) throw new ErroJogo('Algum desses Pokémon não é seu.');

    await model.salvarApresentacao(client, usuarioId, { bio, estilo });
    await model.definirDestaques(client, usuarioId, pokemonIds);
  });
}

/**
 * Vitrines de outros treinadores para visitar: as mais visitadas primeiro.
 * @param {number} usuarioId  fica fora da lista
 * @param {string} busca      começo do login (vazio = todos)
 */
async function listarVitrines(usuarioId, busca) {
  const linhas = await model.listarVitrines(pool, usuarioId, busca);
  return linhas.map(view.itemDaLista);
}

module.exports = { obterVitrine, salvarVitrine, listarVitrines };
