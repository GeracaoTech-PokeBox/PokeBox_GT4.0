import PropTypes from 'prop-types';

// Trecho de código com o caminho do arquivo e os números de linha reais
function RecorteCodigo({ arquivo, recorte }) {
  if (!recorte) {
    return <p className="sobre-dica">{`O trecho não foi encontrado em ${arquivo}: o código mudou desde que este exemplo foi escrito.`}</p>;
  }

  const { primeiraLinha, linhas } = recorte;
  const ultimaLinha = primeiraLinha + linhas.length - 1;
  return (
    <figure className="sobre-codigo">
      <figcaption>{`${arquivo} · linhas ${primeiraLinha} a ${ultimaLinha}`}</figcaption>
      <pre>
        <code>
          {linhas.map((linha, i) => (
            <span key={primeiraLinha + i} className="sobre-codigo-linha" data-numero={primeiraLinha + i}>
              {`${linha}\n`}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

RecorteCodigo.propTypes = {
  arquivo: PropTypes.string.isRequired,
  recorte: PropTypes.shape({
    primeiraLinha: PropTypes.number.isRequired,
    linhas: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),
};

export default RecorteCodigo;
