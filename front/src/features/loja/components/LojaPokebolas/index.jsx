import { PACOTES_POKEBOLA, PRECO_POKEBOLA, useLojaPokebolas } from './index_viewmodels';

/* [MVVM] View da compra de Pokébolas. Era um componente interno de pages/Loja; ganhou pasta
 * própria junto com o seu ViewModel (index_viewmodels.js).
 */

// Pokébolas: usadas para capturar os Pokémon derrotados na história
function LojaPokebolas() {
  const {
    pokebolas, podePagar, comprando, erro, aviso, comprar,
  } = useLojaPokebolas();

  return (
    <div className="loja-pokebolas jogo-painel">
      <div className="loja-pokebola" aria-hidden="true" data-girando={comprando !== null} />
      <div className="loja-pokebolas-info">
        <h2 className="loja-nome">Pokébolas</h2>
        <p className="loja-intervalo">
          {`${PRECO_POKEBOLA} Pokécoins cada. Use na História para tentar capturar os Pokémon que você derrotar (15% de chance). `}
          <strong>{`Você tem ${pokebolas}.`}</strong>
        </p>
        <div className="loja-pokebolas-botoes">
          {PACOTES_POKEBOLA.map((quantidade) => (
            <button
              key={quantidade}
              type="button"
              className="jogo-botao jogo-botao--azul"
              disabled={comprando !== null || !podePagar(quantidade)}
              onClick={() => comprar(quantidade)}
            >
              {`${quantidade}x · ${quantidade * PRECO_POKEBOLA}`}
            </button>
          ))}
        </div>
        {erro && <p className="jogo-erro" role="alert">{erro}</p>}
        {aviso && <p className="loja-dica" role="status">{aviso}</p>}
      </div>
    </div>
  );
}

export default LojaPokebolas;
