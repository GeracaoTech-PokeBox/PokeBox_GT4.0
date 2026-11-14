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
npm test
```

Precisa do Docker: o script sobe o Postgres do compose (se ele não estiver rodando), cria o banco `pokebox_teste` e roda o teste de integração ponta a ponta.

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
