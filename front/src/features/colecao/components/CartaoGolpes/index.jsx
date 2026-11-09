import PropTypes from 'prop-types';
import { ListaGolpes, formatoPokemon } from '@/shared';
import { useCartaoGolpes } from './index_viewmodels';

/* [MVVM] View dos golpes especiais. Era um componente interno de CantinhoCuidado; ganhou pasta
 * própria junto com o seu ViewModel (index_viewmodels.js). Os estilos (cantinho-*) continuam em
 * ../CantinhoCuidado/CantinhoCuidado.css, carregado pelo CantinhoCuidado.
 */

/* [DRY] O CartaoGolpes tinha duas caixas de confirmação iguais (desbloqueio e roleta):
 *
 *   <div className="cantinho-confirmar">
 *     <span>{texto}</span>
 *     <button type="button" className="jogo-botao" disabled={girando} onClick={...}>Confirmar</button>
 *     <button type="button" className="jogo-botao jogo-botao--claro" onClick={() => setConfirmar(null)}>Cancelar</button>
 *   </div>
 *
 * Só mudavam o texto e a ação do "Confirmar"; agora é este componente.
 */
function Confirmacao({
  texto, desabilitado, onConfirmar, onCancelar,
}) {
  return (
    <div className="cantinho-confirmar">
      <span>{texto}</span>
      <button type="button" className="jogo-botao" disabled={desabilitado} onClick={onConfirmar}>Confirmar</button>
      <button type="button" className="jogo-botao jogo-botao--claro" onClick={onCancelar}>Cancelar</button>
    </div>
  );
}

Confirmacao.propTypes = {
  texto: PropTypes.string.isRequired,
  desabilitado: PropTypes.bool.isRequired,
  onConfirmar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired,
};

// Golpes especiais: liberados com o afeto máximo, sorteados entre os que a espécie aprende
function CartaoGolpes({
  pokemon, nome, onRoletar, onDesbloquear,
}) {
  const {
    girando, confirmar, pedirConfirmacao, cancelarConfirmacao, mensagem, erro, roletar, desbloquear,
  } = useCartaoGolpes(pokemon, nome, onRoletar, onDesbloquear);
  const { golpes, custoRoletaGolpes: custo } = pokemon;

  return (
    <section className="cantinho-cartao">
      <h3>Golpes especiais</h3>
      {!pokemon.golpesLiberados ? (
        <>
          <p className="cantinho-dica">
            {`Com o afeto máximo (5 ♥), ${nome} poderá girar a roleta e aprender 2 golpes entre os que a espécie dele aprende.`}
          </p>
          {erro && <p className="jogo-erro" role="alert">{erro}</p>}
          {confirmar === 'desbloqueio' ? (
            <Confirmacao
              texto={`Libera os golpes de ${nome} agora, sem esperar o afeto máximo, e já gira a primeira roleta. Custa ${pokemon.custoDesbloqueioGolpes} Pokécoins.`}
              desabilitado={girando}
              onConfirmar={desbloquear}
              onCancelar={cancelarConfirmacao}
            />
          ) : (
            <button
              type="button"
              className="jogo-botao jogo-botao--azul"
              disabled={girando}
              onClick={() => pedirConfirmacao('desbloqueio')}
            >
              {girando ? 'Girando a roleta...' : `Desbloquear agora · ${pokemon.custoDesbloqueioGolpes} Pokécoins`}
            </button>
          )}
        </>
      ) : (
        <>
          {golpes.length > 0 ? (
            <ListaGolpes golpes={golpes} />
          ) : (
            <p className="cantinho-dica">{`${nome} confia totalmente em você! Gire a roleta para ele aprender 2 golpes.`}</p>
          )}
          {mensagem && <p className="cantinho-dica" role="status"><strong>{mensagem}</strong></p>}
          {erro && <p className="jogo-erro" role="alert">{erro}</p>}
          {confirmar === 'roleta' ? (
            <Confirmacao
              texto={`Os golpes atuais serão trocados por 2 novos sorteados. Custa ${custo} Pokécoins.`}
              desabilitado={girando}
              onConfirmar={roletar}
              onCancelar={cancelarConfirmacao}
            />
          ) : (
            <button
              type="button"
              className="jogo-botao jogo-botao--azul"
              disabled={girando}
              onClick={() => (custo > 0 ? pedirConfirmacao('roleta') : roletar())}
            >
              {girando && 'Girando a roleta...'}
              {!girando && (custo > 0 ? `Roletar de novo · ${custo} Pokécoins` : 'Girar a roleta (grátis)')}
            </button>
          )}
        </>
      )}
    </section>
  );
}

CartaoGolpes.propTypes = {
  pokemon: formatoPokemon.isRequired,
  nome: PropTypes.string.isRequired,
  onRoletar: PropTypes.func.isRequired,
  onDesbloquear: PropTypes.func.isRequired,
};

export default CartaoGolpes;
