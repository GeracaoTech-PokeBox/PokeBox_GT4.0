import PropTypes from 'prop-types';

// Seletor de ordenação do mercado (ListaEspecies e AnunciosDaEspecie). Era interno de Mercado.
function Ordenar({ valor, opcoes, onMudar }) {
  return (
    <label className="trocas-ordenar">
      <span>Ordenar por:</span>
      <select value={valor} onChange={(e) => onMudar(e.target.value)}>
        {opcoes.map(({ valor: v, nome }) => <option key={v} value={v}>{nome}</option>)}
      </select>
    </label>
  );
}

Ordenar.propTypes = {
  valor: PropTypes.string.isRequired,
  opcoes: PropTypes.arrayOf(PropTypes.shape({ valor: PropTypes.string, nome: PropTypes.string })).isRequired,
  onMudar: PropTypes.func.isRequired,
};

export default Ordenar;
