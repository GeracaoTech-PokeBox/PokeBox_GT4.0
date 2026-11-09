import PropTypes from 'prop-types';
import {
  plural, dadosTipo, formatarNome, nomesTipos, urlArtwork,
} from '@/shared';
import Ordenar from '../Ordenar';
import { useListaEspecies } from './index_viewmodels';

/* [MVVM] View da primeira tela do mercado. Era um componente interno de Mercado; ganhou pasta
 * própria junto com o seu ViewModel (index_viewmodels.js).
 */

const ORDENS_MERCADO = [
  { valor: 'popularidade', nome: 'Popularidade' },
  { valor: 'preco', nome: 'Preço (crescente)' },
  { valor: 'nome', nome: 'Nome' },
];

// Primeira tela: uma caixa por espécie anunciada
function ListaEspecies({ onAbrir }) {
  const {
    busca, setBusca, ordem, setOrdem, especies, erro,
  } = useListaEspecies();

  return (
    <>
      <div className="trocas-barra-topo">
        <input
          type="search"
          className="trocas-busca"
          placeholder="Buscar Pokémon (ex.: pikachu)"
          aria-label="Buscar Pokémon"
          value={busca}
          maxLength={40}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Ordenar valor={ordem} opcoes={ORDENS_MERCADO} onMudar={setOrdem} />
      </div>

      {erro && <p className="jogo-erro" role="alert">{erro}</p>}
      {especies === null && !erro && <p aria-busy="true">Carregando mercado...</p>}
      {especies?.length === 0 && (
        <p className="trocas-vazio">{busca ? 'Ninguém está anunciando esse Pokémon agora.' : 'Nenhum Pokémon anunciado ainda. Que tal ser o primeiro?'}</p>
      )}
      {especies?.length > 0 && <p className="trocas-contagem">{plural(especies.length, 'espécie anunciada', 'espécies anunciadas')}</p>}

      <ul className="trocas-grade">
        {especies?.map((especie) => {
          const nome = formatarNome(especie.nome);
          return (
            <li key={especie.especieId}>
              <button
                type="button"
                className="trocas-especie"
                style={{ '--trocas-cor': dadosTipo(especie.tipos[0]).cor }}
                onClick={() => onAbrir(especie)}
              >
                <span className="trocas-especie-tipo">
                  {/* [DRY] Mesma junção de nomes de tipos de CardAnuncio e pages/Vitrine.jsx;
                    agora é nomesTipos() de tipos.js.
                    Código original:
                    {especie.tipos.map((tipo) => dadosTipo(tipo).nome).join(' / ')}
                  */}
                  {nomesTipos(especie.tipos)}
                  {especie.shinies > 0 && <span className="trocas-shiny">{` · ★ ${especie.shinies} shiny`}</span>}
                </span>
                <strong className="trocas-especie-nome">{nome}</strong>
                <img src={urlArtwork(especie.especieId)} alt="" loading="lazy" />
                <span className="trocas-especie-qtd">{`Anúncios: ${especie.anuncios.toLocaleString('pt-BR')}`}</span>
                <span className="trocas-especie-preco">
                  {especie.menorPreco !== null ? `A partir de ${especie.menorPreco.toLocaleString('pt-BR')} Pokécoins` : 'Só propostas de troca'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

ListaEspecies.propTypes = { onAbrir: PropTypes.func.isRequired };

export default ListaEspecies;
