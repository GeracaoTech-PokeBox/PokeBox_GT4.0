import { useState } from 'react';
import { filtrarEOrdenar, tiposDaColecao } from '../../models/index_models';
import { formatarNome, formatarNumero } from '@/shared';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';
import { useTutorialCuidados } from '@/features/tutorial';
import { useFiltrosColecao } from '../../hooks/index_hooks';

/* [MVVM] Novo. ViewModel de Meus Pokémon (./index.jsx): inicial, evolução, filtros e cantinho.
 * [SOLID-S] As 5 ações (escolherInicial, evoluir, cuidar, roletarGolpes, desbloquearGolpes)
 *   estavam escritas no App; voltaram para a tela a que pertencem.
 * [DRY] Cada ação usa executarEAtualizar() do SessaoProvider, em vez de repetir
 *   "await api.x(); await recarregarUsuario();". Os filtros vêm de useFiltrosColecao().
 * [MVVM] INICIAIS (dados) ficou aqui; TIPOS_INICIAIS (cores dos botões) ficou na View.
 */

// Os filtros escolhidos ficam salvos neste navegador para a próxima visita
const CHAVE_FILTROS = 'pokebox-filtros-colecao';

// Em todas as gerações os iniciais vêm na ordem planta, fogo e água
export const INICIAIS = [
  {
    geracao: '1ª Geração',
    regiao: 'Kanto',
    pokemons: [{ id: 1, nome: 'Bulbasaur' }, { id: 4, nome: 'Charmander' }, { id: 7, nome: 'Squirtle' }],
  },
  {
    geracao: '2ª Geração',
    regiao: 'Johto',
    pokemons: [{ id: 152, nome: 'Chikorita' }, { id: 155, nome: 'Cyndaquil' }, { id: 158, nome: 'Totodile' }],
  },
  {
    geracao: '3ª Geração',
    regiao: 'Hoenn',
    pokemons: [{ id: 252, nome: 'Treecko' }, { id: 255, nome: 'Torchic' }, { id: 258, nome: 'Mudkip' }],
  },
  {
    geracao: '4ª Geração',
    regiao: 'Sinnoh',
    pokemons: [{ id: 387, nome: 'Turtwig' }, { id: 390, nome: 'Chimchar' }, { id: 393, nome: 'Piplup' }],
  },
  {
    geracao: '5ª Geração',
    regiao: 'Unova',
    pokemons: [{ id: 495, nome: 'Snivy' }, { id: 498, nome: 'Tepig' }, { id: 501, nome: 'Oshawott' }],
  },
  {
    geracao: '6ª Geração',
    regiao: 'Kalos',
    pokemons: [{ id: 650, nome: 'Chespin' }, { id: 653, nome: 'Fennekin' }, { id: 656, nome: 'Froakie' }],
  },
  {
    geracao: '7ª Geração',
    regiao: 'Alola',
    pokemons: [{ id: 722, nome: 'Rowlet' }, { id: 725, nome: 'Litten' }, { id: 728, nome: 'Popplio' }],
  },
  {
    geracao: '8ª Geração',
    regiao: 'Galar',
    pokemons: [{ id: 810, nome: 'Grookey' }, { id: 813, nome: 'Scorbunny' }, { id: 816, nome: 'Sobble' }],
  },
  {
    geracao: '9ª Geração',
    regiao: 'Paldea',
    pokemons: [{ id: 906, nome: 'Sprigatito' }, { id: 909, nome: 'Fuecoco' }, { id: 912, nome: 'Quaxly' }],
  },
];

// Para a mensagem do bônus da evolução
const NOMES_STATUS = [
  { chave: 'hp', nome: 'PS' },
  { chave: 'ataque', nome: 'Ataque' },
  { chave: 'defesa', nome: 'Defesa' },
  { chave: 'velocidade', nome: 'Velocidade' },
];

function encontrarInicial(id) {
  return INICIAIS.flatMap(({ pokemons }) => pokemons).find((pokemon) => pokemon.id === id) ?? null;
}

/** Coleção do treinador: escolha do inicial, evolução, filtros e o cantinho de cuidado */
export function useMeusPokemonsViewModel() {
  const { usuario, executarEAtualizar } = useSessao();
  const { pokemons } = usuario;
  const [escolhido, setEscolhido] = useState(null);
  // Id do Pokémon aberto no cantinho de cuidado
  const [cuidandoId, setCuidandoId] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [filtros, mudarFiltros] = useFiltrosColecao(CHAVE_FILTROS);
  // Tutorial de cuidados: abre sozinho na primeira visita com coleção ou pelo botão "Como cuidar"
  const tutorialCuidados = useTutorialCuidados();

  // As duas ações seguem o mesmo roteiro: trava os botões, mostra erro ou aviso
  const executar = async (acao) => {
    setEnviando(true);
    setErro(null);
    setAviso(null);
    try {
      await acao();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const confirmarInicial = () => executar(async () => {
    await executarEAtualizar(() => api.escolherInicial(escolhido));
    setEscolhido(null);
  });

  const evoluir = (pokemon, evolucao) => executar(async () => {
    const evoluido = await executarEAtualizar(() => api.evoluir(pokemon.id, evolucao.especieId));
    const ganhos = NOMES_STATUS
      .filter(({ chave }) => evoluido.bonusGanho?.[chave] > 0)
      .map(({ chave, nome }) => `+${evoluido.bonusGanho[chave]} ${nome}`);
    const bonus = ganhos.length > 0
      ? ` Bônus da evolução: ${ganhos.join(', ')}.`
      : ' Desta vez nenhum status ganhou pontos extras.';
    setAviso(`${formatarNome(pokemon.nome)} ${formatarNumero(pokemon.mintNumero)} evoluiu para ${formatarNome(evoluido.nome)}!${bonus}`);
  });

  const abrirCuidado = (pokemonId) => {
    setAviso(null);
    setCuidandoId(pokemonId);
  };

  return {
    tutorialCuidados,
    semPokemons: pokemons.length === 0,
    total: pokemons.length,
    escolhido,
    escolher: setEscolhido,
    inicialEscolhido: encontrarInicial(escolhido),
    confirmarInicial,
    enviando,
    erro,
    aviso,
    filtros,
    mudarFiltros,
    tipos: tiposDaColecao(pokemons),
    visiveis: filtrarEOrdenar(pokemons, filtros),
    evoluir,
    cuidando: pokemons.find((pokemon) => pokemon.id === cuidandoId),
    abrirCuidado,
    fecharCuidado: () => setCuidandoId(null),
    // Ações do cantinho de cuidado: todas mudam o card, então atualizam o usuário
    cuidar: (pokemonId, tipo) => executarEAtualizar(() => api.cuidar(pokemonId, tipo)),
    roletarGolpes: (pokemonId) => executarEAtualizar(() => api.roletarGolpes(pokemonId)),
    desbloquearGolpes: (pokemonId) => executarEAtualizar(() => api.desbloquearGolpes(pokemonId)),
  };
}
