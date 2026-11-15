-- capture_rate da PokeAPI em cada espécie: a chance de captura na história passa a depender dela.
-- As espécies que já estão no banco ficam com NULL e são completadas pelo back na primeira vez que forem usadas.
-- Aplicar depois da 014: docker compose exec -T db psql -U pokebox -d pokebox < db/migracoes/015_taxa_captura.sql
-- Antes se chamava 012_taxa_captura.sql (repetia o número da 012_desbloqueio_golpes). Bancos que já a aplicaram
-- com o nome antigo rodam de novo com o nome novo, sem efeito: a coluna já existe (ADD COLUMN IF NOT EXISTS).
BEGIN;
ALTER TABLE especies ADD COLUMN IF NOT EXISTS taxa_captura SMALLINT CHECK (taxa_captura BETWEEN 0 AND 255);
COMMIT;
