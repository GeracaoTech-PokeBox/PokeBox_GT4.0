import PropTypes from 'prop-types';
import {
  Avatar, Coracoes, plural, dadosTipo, formatarNome, formatarNumero, nomesTipos, urlArtwork,
} from '@/shared';
import Album from '../Album';
import EditorVitrine from '../EditorVitrine';
import OutrasVitrines from '../OutrasVitrines';
import { formatoDestaque } from '../../types/index_types';
import { useVitrineViewModel } from './index_viewmodels';
import './Vitrine.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js; o editor,
 * o álbum e a busca de vitrines viraram componentes com o seu próprio ViewModel.
 * [SOLID-D] Não recebe mais `usuario` por props do App e não importa models/api.
 * [MVVM] Ficou aqui só o que é de tela: a formatação de datas e o
 *   window.scrollTo ao trocar de vitrine.
 */

const formatarDesde = (data) => new Date(data).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

function CardDestaque({ pokemon, compacto = false }) {
  const nome = formatarNome(pokemon.nome);
  return (
    <article
      className={`vitrine-destaque${compacto ? ' vitrine-destaque--compacto' : ''}${pokemon.shiny ? ' vitrine-destaque--shiny' : ''}`}
      style={{ '--vitrine-cor': dadosTipo(pokemon.tipos[0]).cor }}
    >
      <div className="vitrine-destaque-imagem">
        {!compacto && <span className="vitrine-destaque-nivel">{`Nv. ${pokemon.nivel}`}</span>}
        <img src={urlArtwork(pokemon.especieId, pokemon.shiny)} alt={`${nome}${pokemon.shiny ? ' shiny' : ''}`} loading="lazy" />
      </div>
      <div className="vitrine-destaque-info">
        <strong>
          {nome}
          {pokemon.shiny && ' ★'}
        </strong>
        <Coracoes quantidade={pokemon.coracoes} tamanho="pequeno" />
      </div>
      {!compacto && (
        <span className="vitrine-destaque-detalhe">
          {/* [DRY] Retirado daqui: o map + join dos nomes dos tipos repetia nomesTipos() de
            @/shared (o comentário de lá já citava esta tela, mas ela não tinha sido trocada).
            Código original:
            {`${formatarNumero(pokemon.mintNumero)} · ${pokemon.tipos.map((tipo) => dadosTipo(tipo).nome).join(' / ')}`}
          */}
          {`${formatarNumero(pokemon.mintNumero)} · ${nomesTipos(pokemon.tipos)}`}
        </span>
      )}
    </article>
  );
}

CardDestaque.propTypes = { pokemon: formatoDestaque.isRequired, compacto: PropTypes.bool };

function Perfil({ vitrine, onEditar }) {
  const { treinador, estatisticas } = vitrine;
  const numeros = [
    { valor: estatisticas.especies, rotulo: 'espécies' },
    { valor: estatisticas.shinies, rotulo: 'shinies' },
    { valor: `${estatisticas.afetoTime.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} ♥`, rotulo: 'afeto do time' },
    { valor: estatisticas.vitorias, rotulo: 'vitórias' },
  ];
  return (
    <section className="vitrine-perfil">
      <Avatar login={treinador.login} tamanho="grande" />
      <div className="vitrine-perfil-texto">
        <h2 className="vitrine-perfil-nome">
          {vitrine.estilo === 'album' ? <>Álbum de <span>{treinador.login}</span></> : treinador.login}
        </h2>
        <span className="vitrine-desde">{`Treinador desde ${formatarDesde(treinador.desde)}`}</span>
        {vitrine.bio && <p className="vitrine-bio">{vitrine.bio}</p>}
      </div>
      <dl className="vitrine-numeros">
        {numeros.map(({ valor, rotulo }) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      <div className="vitrine-perfil-rodape">
        {/* [DRY] A escolha "visita"/"visitas" era feita na mão; agora usa plural() de @/shared.
          Código original:
          <span className="vitrine-visitas">{`${vitrine.visitas} ${vitrine.visitas === 1 ? 'visita' : 'visitas'}`}</span>
        */}
        <span className="vitrine-visitas">{plural(vitrine.visitas, 'visita', 'visitas')}</span>
        {vitrine.souDono && (
          <button type="button" className="vitrine-botao vitrine-botao--secundario" onClick={onEditar}>Editar vitrine</button>
        )}
      </div>
    </section>
  );
}

Perfil.propTypes = {
  vitrine: PropTypes.shape({
    treinador: PropTypes.shape({ login: PropTypes.string.isRequired, desde: PropTypes.string.isRequired }).isRequired,
    estatisticas: PropTypes.shape({
      especies: PropTypes.number.isRequired,
      shinies: PropTypes.number.isRequired,
      afetoTime: PropTypes.number.isRequired,
      vitorias: PropTypes.number.isRequired,
    }).isRequired,
    bio: PropTypes.string.isRequired,
    estilo: PropTypes.string.isRequired,
    visitas: PropTypes.number.isRequired,
    souDono: PropTypes.bool.isRequired,
  }).isRequired,
  onEditar: PropTypes.func.isRequired,
};

function Vitrine() {
  const vm = useVitrineViewModel();
  const { vitrine } = vm;

  // Ao trocar de vitrine, volta para o topo da página
  const visitar = (alvo) => {
    vm.visitar(alvo);
    window.scrollTo(0, 0);
  };

  const renderVitrine = () => {
    if (!vitrine) {
      return vm.erro ? null : <p aria-busy="true">Carregando vitrine...</p>;
    }
    if (vm.editando) {
      return (
        <EditorVitrine
          vitrine={vitrine}
          pokemons={vm.meusPokemons}
          onSalvar={vm.salvar}
          onCancelar={vm.cancelarEdicao}
        />
      );
    }

    const palco = vitrine.estilo === 'palco';
    const destaques = vitrine.destaques.length > 0 ? (
      <section aria-labelledby="vitrine-destaques-titulo">
        {palco && (
          <div className="vitrine-secao-topo">
            <span className="vitrine-rotulo">Vitrine</span>
            <h2 id="vitrine-destaques-titulo" className="vitrine-titulo">Time em destaque</h2>
          </div>
        )}
        {!palco && <h3 id="vitrine-destaques-titulo" className="vitrine-sr">Pokémon em destaque</h3>}
        <ul className={palco ? 'vitrine-destaques' : 'vitrine-destaques vitrine-destaques--faixa'}>
          {vitrine.destaques.map((pokemon) => (
            <li key={pokemon.id}><CardDestaque pokemon={pokemon} compacto={!palco} /></li>
          ))}
        </ul>
      </section>
    ) : (
      <p className="vitrine-dica">
        {vitrine.souDono ? 'Monte seu time ou escolha destaques em "Editar vitrine".' : 'Este treinador ainda não tem destaques.'}
      </p>
    );

    return (
      <div className={`vitrine vitrine--${vitrine.estilo}`}>
        <Perfil vitrine={vitrine} onEditar={vm.editar} />
        <div className="vitrine-conteudo">
          {destaques}
          <Album key={vitrine.treinador.login} colecao={vitrine.colecao} />
        </div>
      </div>
    );
  };

  return (
    <>
      {!vm.souDono && (
        <button
          type="button"
          className="vitrine-voltar"
          onClick={() => {
            vm.voltarParaMinha();
            window.scrollTo(0, 0);
          }}
        >
          ← Minha vitrine
        </button>
      )}
      {vm.erro && <p className="jogo-erro" role="alert">{vm.erro}</p>}
      {vm.aviso && <p className="jogo-aviso" role="status">{vm.aviso}</p>}
      {renderVitrine()}
      {!vm.editando && <OutrasVitrines onVisitar={visitar} />}
    </>
  );
}

export default Vitrine;
