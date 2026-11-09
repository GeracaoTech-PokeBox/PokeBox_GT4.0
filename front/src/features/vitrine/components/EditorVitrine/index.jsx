import PropTypes from 'prop-types';
import {
  Coracoes, formatoPokemon, formatarNome, urlSprite,
} from '@/shared';
import { BIO_MAXIMO, DESTAQUES_MAXIMO } from '../../constants/index_constants';
import { formatoDestaque } from '../../types/index_types';
import { useEditorVitrine } from './index_viewmodels';

/* [MVVM] View do formulário do dono da vitrine. Era um componente interno de pages/Vitrine; ganhou
 * pasta própria junto com o seu ViewModel (index_viewmodels.js). ESTILOS (textos dos botões)
 * veio junto, porque só o editor usa.
 */

const ESTILOS = [
  { valor: 'palco', nome: 'Palco do time', descricao: 'Seus Pokémon em destaque, em cards grandes.' },
  { valor: 'album', nome: 'Álbum da coleção', descricao: 'O álbum com todas as espécies que você já tem.' },
];

function EditorVitrine({ vitrine, pokemons, onSalvar, onCancelar }) {
  const editor = useEditorVitrine(vitrine, onSalvar);

  const handleSubmit = (evento) => {
    evento.preventDefault();
    editor.salvar();
  };

  return (
    <form className="vitrine-editor" onSubmit={handleSubmit}>
      <h2 className="vitrine-titulo">Editar vitrine</h2>
      {editor.erro && <p className="jogo-erro" role="alert">{editor.erro}</p>}

      <label className="vitrine-campo">
        <span>Apresentação</span>
        <textarea
          value={editor.bio}
          maxLength={BIO_MAXIMO}
          rows={2}
          placeholder="Ex.: Colecionador de tipos elétricos. Aceito desafios!"
          onChange={(e) => editor.setBio(e.target.value)}
        />
        <small>{`${editor.bio.length}/${BIO_MAXIMO}`}</small>
      </label>

      <fieldset className="vitrine-campo">
        <legend>Estilo</legend>
        <div className="vitrine-estilos">
          {ESTILOS.map(({ valor, nome, descricao }) => (
            <label key={valor} className="vitrine-estilo" data-marcado={editor.estilo === valor}>
              <input
                type="radio"
                name="estilo"
                value={valor}
                checked={editor.estilo === valor}
                onChange={() => editor.setEstilo(valor)}
              />
              <strong>{nome}</strong>
              <span>{descricao}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="vitrine-campo">
        <legend>{`Pokémon em destaque (${editor.selecionados.length}/${DESTAQUES_MAXIMO})`}</legend>
        <p className="vitrine-dica">Clique na ordem em que eles devem aparecer. Sem nenhum escolhido, a vitrine mostra o seu time.</p>
        <ul className="vitrine-escolha">
          {pokemons.map((pokemon) => {
            const ordem = editor.selecionados.indexOf(pokemon.id);
            return (
              <li key={pokemon.id}>
                <button
                  type="button"
                  className="vitrine-escolha-item"
                  aria-pressed={ordem !== -1}
                  disabled={ordem === -1 && editor.cheio}
                  onClick={() => editor.alternar(pokemon.id)}
                >
                  {ordem !== -1 && <span className="vitrine-escolha-ordem">{ordem + 1}</span>}
                  <img src={urlSprite(pokemon.especieId, pokemon.shiny)} alt="" loading="lazy" />
                  <span className="vitrine-escolha-nome">{formatarNome(pokemon.nome)}</span>
                  <span className="vitrine-escolha-detalhe">{`Nv. ${pokemon.nivel}`}</span>
                  <Coracoes quantidade={pokemon.afeto.coracoes} tamanho="pequeno" />
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="vitrine-editor-botoes">
        <button type="button" className="vitrine-botao vitrine-botao--secundario" onClick={onCancelar} disabled={editor.salvando}>
          Cancelar
        </button>
        <button type="submit" className="vitrine-botao" disabled={editor.salvando}>
          {editor.salvando ? 'Salvando...' : 'Salvar vitrine'}
        </button>
      </div>
    </form>
  );
}

EditorVitrine.propTypes = {
  vitrine: PropTypes.shape({
    bio: PropTypes.string.isRequired,
    estilo: PropTypes.string.isRequired,
    destaques: PropTypes.arrayOf(formatoDestaque).isRequired,
  }).isRequired,
  pokemons: PropTypes.arrayOf(formatoPokemon).isRequired,
  onSalvar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired,
};

export default EditorVitrine;
