import PropTypes from 'prop-types';

/* Trecho de código. Com primeiraLinha, mostra os números de linha reais do arquivo; sem ela (código
 * antigo, que só existe guardado num comentário), mostra o trecho sem números.
 * variante muda a cor do cabeçalho: antes (vermelho), depois (verde) ou neutro.
 */
function RecorteCodigo({
  titulo, detalhe, linhas, primeiraLinha, variante,
}) {
  return (
    <figure className={`sobre-codigo sobre-codigo--${variante}`}>
      <figcaption>
        <strong>{titulo}</strong>
        {detalhe && <span>{detalhe}</span>}
      </figcaption>
      <pre>
        <code>
          {linhas.map((linha, i) => (
            <span
              // A posição é a identidade da linha: o recorte não muda depois de montado
              key={i}
              className="sobre-codigo-linha"
              data-numero={primeiraLinha ? primeiraLinha + i : undefined}
            >
              {`${linha}\n`}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

RecorteCodigo.propTypes = {
  titulo: PropTypes.string.isRequired,
  detalhe: PropTypes.string,
  linhas: PropTypes.arrayOf(PropTypes.string).isRequired,
  primeiraLinha: PropTypes.number,
  variante: PropTypes.oneOf(['antes', 'depois', 'neutro']).isRequired,
};

export default RecorteCodigo;
