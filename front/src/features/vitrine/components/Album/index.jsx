import PropTypes from 'prop-types';
import { urlSprite } from '@/shared';
import { useAlbum } from './index_viewmodels';

/* [MVVM] View do álbum de espécies. Era um componente interno de pages/Vitrine; ganhou pasta
 * própria junto com o seu ViewModel (index_viewmodels.js).
 */

// Álbum de espécies por região: as que o treinador tem aparecem coloridas, as outras como silhueta
function Album({ colecao }) {
  const {
    regioes, regiaoIndice, setRegiaoIndice, regiao, ids, naRegiao, especieDe,
  } = useAlbum(colecao);

  return (
    <section className="vitrine-album" aria-labelledby="vitrine-album-titulo">
      <div className="vitrine-album-topo">
        <h3 id="vitrine-album-titulo">{`${regiao.nome} · ${naRegiao} de ${ids.length}`}</h3>
        <span
          className="vitrine-album-barra"
          role="progressbar"
          aria-label={`Espécies de ${regiao.nome}`}
          aria-valuemin={0}
          aria-valuemax={ids.length}
          aria-valuenow={naRegiao}
        >
          <span style={{ width: `${(naRegiao / ids.length) * 100}%` }} />
        </span>
      </div>
      <div className="vitrine-regioes" role="tablist" aria-label="Região">
        {regioes.map(({ nome }, i) => (
          <button
            key={nome}
            type="button"
            role="tab"
            aria-selected={i === regiaoIndice}
            className="vitrine-regiao"
            onClick={() => setRegiaoIndice(i)}
          >
            {nome}
          </button>
        ))}
      </div>
      <ul className="vitrine-album-grade">
        {ids.map((id) => {
          const especie = especieDe(id);
          return (
            <li key={id} data-possui={Boolean(especie)} title={especie ? `#${id}` : `#${id} · ainda não tem`}>
              <img src={urlSprite(id, especie?.shiny)} alt={especie ? `Espécie ${id}` : ''} loading="lazy" />
              <span>{id}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

Album.propTypes = {
  colecao: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number.isRequired, shiny: PropTypes.bool })).isRequired,
};

export default Album;
