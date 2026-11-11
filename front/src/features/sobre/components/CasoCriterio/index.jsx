import PropTypes from 'prop-types';
import RecorteCodigo from '../RecorteCodigo';

const formatoRecorte = PropTypes.shape({
  primeiraLinha: PropTypes.number.isRequired,
  linhas: PropTypes.arrayOf(PropTypes.string).isRequired,
  origem: PropTypes.oneOf(['logoAbaixo', 'declaracao']).isRequired,
});

const intervalo = ({ primeiraLinha, linhas }) => `linhas ${primeiraLinha} a ${primeiraLinha + linhas.length - 1}`;

// Título do código atual: "Depois" só quando há um "antes" para comparar
function tituloDoAtual(depois, temAntes) {
  if (depois.origem === 'declaracao') return 'Onde se aplica';
  return temAntes ? 'Depois' : 'No código';
}

// Um caso de um critério: explicação, código antigo (antes) e código atual (depois)
function CasoCriterio({ caso }) {
  const {
    arquivo, linha, resumo, explicacao, antes, depois,
  } = caso;

  return (
    <details className="sobre-caso">
      <summary>
        <span className="sobre-caso-local">{`${arquivo}:${linha}`}</span>
        <span className="sobre-caso-resumo">{resumo}</span>
        {antes && depois && <span className="sobre-caso-selo">antes e depois</span>}
      </summary>

      <div className="sobre-caso-corpo">
        <p className="sobre-caso-texto">{explicacao}</p>

        {(antes || depois) && (
          <div className={antes ? 'sobre-comparacao' : undefined}>
            {antes && (
              <RecorteCodigo titulo="Antes" detalhe="guardado no comentário" linhas={antes} variante="antes" />
            )}
            {depois && (
              <RecorteCodigo
                titulo={tituloDoAtual(depois, Boolean(antes))}
                detalhe={`${arquivo} · ${intervalo(depois)}`}
                linhas={depois.linhas}
                primeiraLinha={depois.primeiraLinha}
                variante={antes ? 'depois' : 'neutro'}
              />
            )}
            {antes && !depois && (
              <p className="sobre-caso-removido">
                <strong>Depois</strong>
                O código novo não fica logo abaixo deste comentário: a explicação diz para onde ele foi.
              </p>
            )}
          </div>
        )}

        {!antes && !depois && (
          <p className="sobre-dica">Comentário que descreve o arquivo inteiro, sem um trecho de código específico.</p>
        )}
      </div>
    </details>
  );
}

CasoCriterio.propTypes = {
  caso: PropTypes.shape({
    arquivo: PropTypes.string.isRequired,
    linha: PropTypes.number.isRequired,
    resumo: PropTypes.string.isRequired,
    explicacao: PropTypes.string.isRequired,
    antes: PropTypes.arrayOf(PropTypes.string),
    depois: formatoRecorte,
  }).isRequired,
};

export default CasoCriterio;
