import PropTypes from 'prop-types';

/* [DRY] Componente novo. A mesma barra acessível (span com role="progressbar", os 4 atributos
 * aria e o span interno com a largura) estava escrita à mão três vezes: XP em CartaPokemon.jsx,
 * afeto e bem-estar (BarraBemEstar) em CantinhoCuidado.jsx. Só mudavam a classe, o rótulo e o
 * valor. Ex. do original em CartaPokemon.jsx:
 *
 *   <span
 *     className="carta-xp"
 *     role="progressbar"
 *     aria-label="Experiência"
 *     aria-valuemin={0}
 *     aria-valuemax={100}
 *     aria-valuenow={Math.round(porcentagemXp)}
 *   >
 *     <span style={{ width: `${porcentagemXp}%` }} />
 *   </span>
 */

// Barra de 0 a 100%. Atributos extras (ex.: data-baixo) vão direto para o elemento.
function BarraProgresso({
  className, rotulo, porcentagem, ...atributos
}) {
  return (
    <span
      className={className}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(porcentagem)}
      {...atributos}
    >
      <span style={{ width: `${porcentagem}%` }} />
    </span>
  );
}

BarraProgresso.propTypes = {
  className: PropTypes.string.isRequired,
  rotulo: PropTypes.string.isRequired,
  porcentagem: PropTypes.number.isRequired,
};

export default BarraProgresso;
