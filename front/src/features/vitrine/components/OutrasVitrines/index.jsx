import PropTypes from 'prop-types';
import { Avatar, urlSprite } from '@/shared';
import { useBuscaVitrines } from './index_viewmodels';

/* [MVVM] View da lista de outras vitrines. Era um componente interno de pages/Vitrine; ganhou
 * pasta própria junto com o seu ViewModel (index_viewmodels.js).
 */

// Lista de vitrines de outros treinadores, com busca por login
function OutrasVitrines({ onVisitar }) {
  const { busca, setBusca, lista } = useBuscaVitrines();

  return (
    <section className="vitrine-outras" aria-labelledby="vitrine-outras-titulo">
      <h2 id="vitrine-outras-titulo" className="vitrine-titulo">Visitar vitrines</h2>
      <input
        type="search"
        className="vitrine-busca"
        placeholder="Buscar treinador"
        aria-label="Buscar treinador"
        value={busca}
        maxLength={20}
        onChange={(e) => setBusca(e.target.value)}
      />
      {lista === null && <p className="vitrine-dica" aria-busy="true">Carregando vitrines...</p>}
      {lista?.length === 0 && <p className="vitrine-dica">Nenhuma vitrine encontrada.</p>}
      <ul className="vitrine-outras-lista">
        {lista?.map((item) => (
          <li key={item.login}>
            <button type="button" className="vitrine-outra" onClick={() => onVisitar(item.login)}>
              <Avatar login={item.login} />
              <span className="vitrine-outra-texto">
                <strong>{item.login}</strong>
                <span>{`${item.especies} espécies · ${item.visitas} visitas`}</span>
              </span>
              <span className="vitrine-outra-previa" aria-hidden="true">
                {item.previa.map((p, i) => (
                  <img key={`${p.especieId}-${i}`} src={urlSprite(p.especieId, p.shiny)} alt="" loading="lazy" />
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

OutrasVitrines.propTypes = { onVisitar: PropTypes.func.isRequired };

export default OutrasVitrines;
