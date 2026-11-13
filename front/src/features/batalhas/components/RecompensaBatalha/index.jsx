import PropTypes from 'prop-types';
import { formatarNome, formatarNumero } from '@/shared';

/* [DRY] Novo. As recompensas de uma batalha vencida ("+40 Pokécoins e +X XP..." e a lista de quem
 * subiu de nível) estavam copiadas em pages/Batalha (PvP) e no BatalhaSelvagem de pages/Historia.
 * [MVVM] É View: só mostra a recompensa que recebe. Não mostra nada quando ela é null.
 */
function RecompensaBatalha({ recompensa }) {
  if (!recompensa) return null;

  return (
    <>
      {recompensa.semRecompensa ? (
        <span>{recompensa.semRecompensa}</span>
      ) : (
        <span>{`+${recompensa.pokecoins} Pokécoins e +${recompensa.xp} XP para cada Pokémon do time.`}</span>
      )}
      {recompensa.subiram?.length > 0 && (
        <ul>
          {recompensa.subiram.map((s) => (
            <li key={s.pokemonId}>
              {`${formatarNome(s.nome)} ${formatarNumero(s.mintNumero)} subiu para o nível ${s.nivel}${s.podeEvoluir ? ' e já pode evoluir!' : '.'}`}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

RecompensaBatalha.propTypes = {
  recompensa: PropTypes.shape({
    // Batalhas PvP que não dão recompensa (ex.: desistência cedo) trazem só este texto
    semRecompensa: PropTypes.string,
    pokecoins: PropTypes.number,
    xp: PropTypes.number,
    subiram: PropTypes.array,
  }),
};

export default RecompensaBatalha;
