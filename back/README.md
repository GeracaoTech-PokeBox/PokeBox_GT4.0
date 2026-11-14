# Backend do PokeBox

API REST do PokeBox em **Node.js + Express 5 + PostgreSQL** (SQL escrito à mão, sem ORM). Os dados de espécies e golpes vêm da [PokeAPI](https://pokeapi.co) e ficam guardados no banco como cache.

> Arquitetura, regras do jogo e todos os endpoints: [docs/BACKEND.md](docs/BACKEND.md).

## Rodando

**Tudo no Docker** (na raiz do repositório):

```bash
docker compose up -d     # banco (5432) + back (8080) + front (5174)
```

**Back fora do Docker** (com o banco do compose rodando):

```bash
cd back
npm install
cp .env.example .env     # já aponta para o Postgres do compose
npm start                # http://localhost:8080/api/saude → { "ok": true }
```

Ao subir, o back aplica sozinho as migrações de `db/migracoes` que ainda não rodaram. Se alguma falhar, ele não sobe.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Connection string do Postgres. Sem ela, só `/api/saude` e o proxy da PokeAPI funcionam |
| `PORT` | Porta HTTP (padrão `8080`) |

O `.env` não vai para o Git. Nunca coloque nele a connection string de produção.

## Testes

```bash
npm run test:unit       # unitários: regras, motor de batalha, tipos, proxy da PokeAPI (sem banco, < 1 s)
npm run test:int        # integração ponta a ponta (precisa do Docker)
npm test                # os dois
npm run test:cobertura  # unitários com relatório de cobertura
```

Os unitários ficam em `test/unit` e não precisam de banco nem de rede. Os sorteios usam `rngSequencia` (`test/helpers/rng.js`), que devolve valores fixos e falha se a regra sortear mais vezes do que o teste previu. A PokeAPI é trocada por `instalarPokeApiFake` (`test/helpers/pokeapi-fake.js`).

O `test:int` sobe o Postgres do compose (se ele não estiver rodando), cria o banco `pokebox_teste` e roda o teste de integração ponta a ponta. Com `DATABASE_URL_TESTE` definida, ele usa esse banco direto e não precisa de Docker. O nome do banco precisa terminar em `_teste`, porque o teste apaga e recria o schema.

No GitHub, o workflow [`.github/workflows/back.yml`](../.github/workflows/back.yml) roda os unitários (com cobertura) e a integração (com um Postgres 16 do próprio Actions) em todo PR e push na `main` que mexa em `back/` ou `db/`.

## Estrutura

```
server.js        # Entrada: .env, migrações, HTTP e agendador de batalhas
src/app.js       # CORS, /api/saude, proxy da PokeAPI
src/rotas.js     # Endpoints /api/*: validação, autenticação, erros → HTTP
src/db.js        # Pool do Postgres + transacao()
src/jogo/        # Regras de negócio, um arquivo por área
  config.js      #   todas as constantes de balanceamento (preços, prazos, chances)
```

## Onde mexer

- **Preço, prazo, chance ou recompensa:** `src/jogo/config.js`
- **Novo endpoint:** `src/rotas.js` (validação) + o módulo em `src/jogo/` (regra)
- **Banco:** nova migração idempotente em `db/migracoes/` **e** atualização de `db/db.sql`

## Deploy

Render (`render.yaml`, health check em `/api/saude`) com o banco no Neon, ou `docker-compose.prod.yml` numa máquina própria. Detalhes em [docs/BACKEND.md](docs/BACKEND.md#9-rodando-e-testando).
