import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { buscarFiltro, buscarPokemon, listarPokemons } from '../../services/index_services';

/* [MVVM] Novo. ViewModel da Pokédex (./index.jsx): lista da PokeAPI, busca, filtros,
 * detalhes dos cards visíveis e paginação. Eram 8 useState e 3 useEffect dentro da tela.
 * [MVVM] O IntersectionObserver ficou na View (mexe no DOM); ela só chama carregarMais().
 * [KISS] Cada card visível já sai com os seus `detalhes`, sem a View consultar outro objeto.
 */

// Quantos cards são carregados por vez ao rolar a página
const PAGINA = 24;

// Busca pelo nome ("pika") ou pelo número ("25" ou "#0025")
function filtrarPokemons(pokemons, busca) {
  const termo = busca.trim().toLowerCase().replace(/^#0*/, '');
  if (!termo) return pokemons;

  return pokemons.filter(
    (pokemon) => pokemon.name.includes(termo) || String(pokemon.id) === termo,
  );
}

// Mantém só quem aparece em todos os filtros ativos
function aplicarFiltros(pokemons, conjuntos) {
  if (conjuntos.length === 0) return pokemons;

  return pokemons.filter((pokemon) => conjuntos.every(({ alvo, ids }) => (
    ids.has(alvo === 'pokemon' ? pokemon.id : pokemon.especieId)
  )));
}

const chaveFiltro = (recurso, nome) => `${recurso}/${nome}`;

/** Pokédex: lista completa da PokeAPI, busca, filtros e carregamento aos poucos */
export function usePokemonsViewModel() {
  const [lista, setLista] = useState(null);
  const [erroLista, setErroLista] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  // id -> dados do Pokémon, ou false quando a requisição falhou
  const [detalhes, setDetalhes] = useState({});
  const [busca, setBusca] = useState('');
  // recurso -> opção escolhida (ex.: { type: 'fire' }); filtro sem opção não entra aqui
  const [filtros, setFiltros] = useState({});
  // "recurso/nome" -> { alvo, ids }, ou false quando a requisição falhou
  const [conjuntos, setConjuntos] = useState({});
  const [quantidade, setQuantidade] = useState(PAGINA);

  useEffect(() => {
    let ativo = true;
    listarPokemons()
      .then((pokemons) => {
        if (ativo) setLista(pokemons);
      })
      .catch(() => {
        if (ativo) setErroLista('Não foi possível carregar a Pokédex. Verifique sua conexão.');
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  // Busca na PokeAPI quem passa em cada filtro escolhido
  useEffect(() => {
    let ativo = true;
    Object.entries(filtros).forEach(([recurso, nome]) => {
      const chave = chaveFiltro(recurso, nome);
      buscarFiltro(recurso, nome)
        .then((conjunto) => conjunto, () => false)
        .then((resultado) => {
          if (ativo) setConjuntos((atual) => ({ ...atual, [chave]: resultado }));
        });
    });
    return () => {
      ativo = false;
    };
  }, [filtros]);

  const { filtrados, erroFiltro, aplicandoFiltros } = useMemo(() => {
    const ativos = Object.entries(filtros).map(
      ([recurso, nome]) => conjuntos[chaveFiltro(recurso, nome)],
    );
    const erro = ativos.includes(false);
    const aplicando = ativos.includes(undefined);

    if (!lista || erro || aplicando) {
      return { filtrados: [], erroFiltro: erro, aplicandoFiltros: aplicando };
    }
    return {
      filtrados: aplicarFiltros(filtrarPokemons(lista, busca), ativos),
      erroFiltro: false,
      aplicandoFiltros: false,
    };
  }, [lista, busca, filtros, conjuntos]);
  const visiveis = useMemo(() => filtrados.slice(0, quantidade), [filtrados, quantidade]);

  // Busca os detalhes dos cards visíveis (o service evita requisições repetidas)
  useEffect(() => {
    let ativo = true;
    visiveis.forEach(({ id }) => {
      buscarPokemon(id)
        .then((pokemon) => pokemon, () => false)
        .then((resultado) => {
          if (!ativo) return;
          setDetalhes((atual) => (atual[id] === resultado ? atual : { ...atual, [id]: resultado }));
        });
    });
    return () => {
      ativo = false;
    };
  }, [visiveis]);

  const buscar = (texto) => {
    setBusca(texto);
    setQuantidade(PAGINA);
  };

  const alterarFiltro = (recurso, nome) => {
    setFiltros((atual) => {
      const novos = { ...atual };
      if (nome) {
        novos[recurso] = nome;
      } else {
        delete novos[recurso];
      }
      return novos;
    });
    setQuantidade(PAGINA);
  };

  const limparFiltros = () => {
    setFiltros({});
    setQuantidade(PAGINA);
  };

  const tentarNovamente = () => {
    setErroLista(null);
    setTentativa((atual) => atual + 1);
  };

  // [KISS] Estável entre renderizações (useCallback): a View usa no IntersectionObserver sem
  // recriar o observador a cada render.
  const carregarMais = useCallback(() => setQuantidade((atual) => atual + PAGINA), []);

  return {
    carregado: lista !== null,
    total: lista?.length ?? 0,
    erroLista,
    tentarNovamente,
    busca,
    buscar,
    filtros,
    alterarFiltro,
    limparFiltros,
    erroFiltro,
    aplicandoFiltros,
    totalFiltrados: filtrados.length,
    // Cards já liberados na tela, cada um com seus detalhes (undefined carregando, false se falhou)
    visiveis: visiveis.map(({ id, name }) => ({ id, name, detalhes: detalhes[id] })),
    temMais: visiveis.length < filtrados.length,
    carregarMais,
  };
}
