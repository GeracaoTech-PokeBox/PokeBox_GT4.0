import { useEffect, useState } from 'react';
import { carregar, TIPOS, formatarNome } from '@/shared';
import { listarOpcoesFiltro } from '../../services/index_services';

/* [MVVM] Novo. ViewModel do componente FiltrosPokemons: busca as opções na PokeAPI, traduz e ordena.
 * O componente ficou só com `aberto` (painel aberto/fechado), que é estado visual.
 * [SOLID-S] A View recebe cada filtro pronto ({ rotulo, textoVazio, opcoes }) e só monta o <select>.
 */

const REGIOES = {
  'generation-i': '1ª Geração (Kanto)',
  'generation-ii': '2ª Geração (Johto)',
  'generation-iii': '3ª Geração (Hoenn)',
  'generation-iv': '4ª Geração (Sinnoh)',
  'generation-v': '5ª Geração (Unova)',
  'generation-vi': '6ª Geração (Kalos)',
  'generation-vii': '7ª Geração (Alola)',
  'generation-viii': '8ª Geração (Galar)',
  'generation-ix': '9ª Geração (Paldea)',
};

/* [DRY] As traduções dos tipos repetiam os 18 nomes que já existem em TIPOS (tipos.js).
 * Se um nome mudasse lá, o filtro continuaria com o antigo. Agora são derivadas de TIPOS.
 *
 * [KISS] A ordenação usava "traducoes === REGIOES ? 0 : localeCompare" para descobrir, pela
 * identidade do objeto, que as gerações não devem ser ordenadas por nome. Agora cada filtro
 * diz isso explicitamente com "manterOrdem".
 */

// Um filtro por recurso da PokeAPI, com os nomes traduzidos
const FILTROS = [
  {
    recurso: 'type',
    rotulo: 'Tipo',
    // Tipos que não têm nenhum Pokémon
    ignorar: ['stellar', 'unknown', 'shadow'],
    traducoes: Object.fromEntries(Object.entries(TIPOS).map(([tipo, { nome }]) => [tipo, nome])),
  },
  // As gerações já vêm em ordem cronológica, que faz mais sentido que a alfabética
  {
    recurso: 'generation', rotulo: 'Geração / Região', traducoes: REGIOES, manterOrdem: true,
  },
];

/** Opções de cada filtro da Pokédex, buscadas na PokeAPI e já traduzidas */
export function useFiltrosPokemonsViewModel() {
  // recurso -> lista de opções, ou false quando a requisição falhou
  const [opcoes, setOpcoes] = useState({});

  // [DRY] O controle "let ativo = true ... ativo = false" era o mesmo das outras telas;
  // agora cada requisição usa carregar() e a limpeza cancela todas.
  useEffect(() => {
    const cancelamentos = FILTROS.map(({ recurso, ignorar = [] }) => carregar(
      listarOpcoesFiltro(recurso).then((nomes) => nomes.filter((nome) => !ignorar.includes(nome)), () => false),
      (resultado) => setOpcoes((atual) => ({ ...atual, [recurso]: resultado })),
    ));
    return () => cancelamentos.forEach((cancelar) => cancelar());
  }, []);

  const opcoesDe = (recurso, traducoes, manterOrdem) => {
    if (!opcoes[recurso]) return [];
    const lista = opcoes[recurso].map((nome) => ({ nome, rotulo: traducoes[nome] ?? formatarNome(nome) }));
    if (!manterOrdem) lista.sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
    return lista;
  };

  const textoVazio = (recurso) => {
    if (opcoes[recurso] === false) return 'Não foi possível carregar';
    if (!opcoes[recurso]) return 'Carregando...';
    return 'Todos';
  };

  return FILTROS.map(({
    recurso, rotulo, traducoes, manterOrdem,
  }) => ({
    recurso,
    rotulo,
    disponivel: Boolean(opcoes[recurso]),
    textoVazio: textoVazio(recurso),
    opcoes: opcoesDe(recurso, traducoes, manterOrdem),
  }));
}
