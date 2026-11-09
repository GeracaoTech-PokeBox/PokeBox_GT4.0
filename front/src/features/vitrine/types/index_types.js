import PropTypes from 'prop-types';

// Pokémon em destaque como o back devolve na vitrine (usado por Vitrine e EditorVitrine)
export const formatoDestaque = PropTypes.shape({
  id: PropTypes.number.isRequired,
  mintNumero: PropTypes.number.isRequired,
  especieId: PropTypes.number.isRequired,
  nome: PropTypes.string.isRequired,
  tipos: PropTypes.arrayOf(PropTypes.string).isRequired,
  shiny: PropTypes.bool.isRequired,
  nivel: PropTypes.number.isRequired,
  coracoes: PropTypes.number.isRequired,
});
