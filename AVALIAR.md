# Guia de avaliação do PokeBox

Este arquivo resume o projeto e indica onde está cada parte, para facilitar a avaliação.

**PokeBox** é uma aplicação web em que treinadores montam e cuidam de uma coleção de Pokémon, batalham entre si, jogam um modo história e trocam Pokémon com outros treinadores. Foi feito no curso FullCycle (Engenharia de Software) do projeto **Geração Tech 4.0**.

---

## O que cada integrante fez

| Integrante | Contribuição |
|---|---|
| **Felipe** | Back (reestruturação MVC, testes e princípios), hospedagem e Swagger |
| **Lucas** | Front, Back, testes de segurança e API |
| **Victor** | Testes Cypress, Allure e Discord |

---

## Pontos principais

### Funcionalidades do jogo

- **Contas:** cadastro, login, recuperação de senha e sessão por token (o banco guarda só o hash do token).
- **Coleção e loja:** Pokémon inicial, compra de Pokémon por geração e de Pokébolas, com Pokécoins.
- **Cuidados e evolução:** afeto, humor, energia, XP, evolução e golpes especiais desbloqueáveis.
- **Time e batalhas PvP:** time de 3 Pokémon e batalhas assíncronas, com motor de batalha, tabela de tipos e prazos resolvidos por um agendador.
- **Modo história (PvE):** trilhas, Pokémon selvagens e captura.
- **Mercado de trocas:** anúncios, compra direta e propostas entre treinadores.
- **Vitrine:** perfil público do treinador, busca de treinadores e status online.
- **Notificações:** painel de novidades (em andamento).
- **Integração com a PokeAPI:** dados de espécies e golpes vêm da [PokeAPI](https://pokeapi.co) e ficam no banco como cache.

### Arquitetura

| Parte | Tecnologia | Organização |
|---|---|---|
| Front (`front/`) | React 19 + Vite | **MVVM por funcionalidade**: cada feature em `front/src/features/<nome>/` separa View (`index.jsx`), ViewModel (`index_viewmodels.js`), services e models |
| Back (`back/`) | Node.js + Express 5 | **MVC por funcionalidade**: cada feature em `back/src/features/<nome>/` tem rotas, controller, service, model e view |
| Banco (`db/`) | PostgreSQL | Esquema em `db/db.sql` e migrações versionadas em `db/migracoes/`, aplicadas sozinhas quando o back sobe. SQL escrito à mão, sem ORM |
| Infra | Docker Compose | `docker-compose.yml` sobe banco, back e front localmente |

As regras puras do jogo (motor de batalha, tipos, status, XP e afeto) ficam em `back/src/nucleo/`, separadas do banco e da rede, o que permite testá-las sem banco.

### Princípios de código (KISS, DRY, YAGNI e SOLID)

- O back tem um documento para cada princípio, mostrando **o código antes e depois** de cada mudança aplicada (links na seção de documentação abaixo).
- No código, os trechos que aplicam um princípio têm comentários com a tag correspondente: `[KISS]`, `[DRY]`, `[YAGNI]`, `[SOLID-S]`, `[SOLID-O]`, `[SOLID-L]`, `[SOLID-I]`, `[SOLID-D]` e `[MVVM]`.
- **Dentro da aplicação:** entrando com o usuário `admin`, a página **Sobre nós** mostra a aba **Critérios de avaliação**, que lista os trechos do código de cada critério e a estrutura do projeto.

### Testes

| Tipo | Onde | Como rodar |
|---|---|---|
| Unitários do back (regras, motor de batalha, tipos, PokeAPI) | `back/test/unit/` | `cd back && npm run test:unit` |
| Integração do back com PostgreSQL real (inclui concorrência, autorização, atomicidade e migrações) | `back/test/integracao/` | `cd back && npm run test:int` |
| Cobertura com metas mínimas (hoje ~99% das linhas do `src/`) | `back/test/metas-de-cobertura.js` | `cd back && npm run test:cobertura` |
| E2E com Cypress (Page Objects, Mochawesome e Allure) | `cypress/` | `npm run cy:run` na raiz |
| Segurança com OWASP ZAP (resultado agrupado pelo OWASP Top 10) | `testes_de_seguranca/` | `cd testes_de_seguranca && npm run seguranca` |

### Integração contínua (GitHub Actions)

- **`.github/workflows/back.yml`:** roda os testes unitários e de integração do back com cobertura em todo PR e push para `develop` e `main`.
- **`.github/workflows/cypress-allure.yml`:** roda o Cypress a cada push, todo dia às 06h (Brasília) e por disparo manual, publica o relatório Allure e envia o resultado para o Discord.

### Hospedagem

- **Banco:** Neon (PostgreSQL).
- **Back:** Render (`render.yaml`), com health check em `/api/saude`.
- **Front:** Netlify (`netlify.toml`).

> O back gratuito do Render dorme após 15 minutos sem acesso e leva cerca de 1 minuto para acordar. Se a primeira tela demorar, aguarde um pouco e recarregue.

---

## Onde está a documentação

| Documento | Conteúdo |
|---|---|
| [`README.md`](README.md) | Visão geral, como rodar localmente, como publicar e como funcionam os testes E2E e a pipeline |
| [`back/README.md`](back/README.md) | Como rodar o back, variáveis de ambiente, testes, cobertura e onde mexer |
| [`back/docs/BACKEND.md`](back/docs/BACKEND.md) | Arquitetura completa do back, fluxos do jogo, banco, regras e referência de endpoints |
| [`back/docs/openapi.yaml`](back/docs/openapi.yaml) | Especificação OpenAPI da API |
| **Swagger UI** | `/api/docs` no back rodando (ex.: http://localhost:8080/api/docs) |
| [`back/docs/SOLID.md`](back/docs/SOLID.md) | Aplicação dos 5 princípios SOLID, com antes e depois |
| [`back/docs/DRY.md`](back/docs/DRY.md) | Aplicação do DRY, com antes e depois |
| [`back/docs/KISS.md`](back/docs/KISS.md) | Aplicação do KISS, com antes e depois |
| [`back/docs/YAGNI.md`](back/docs/YAGNI.md) | Aplicação do YAGNI, com antes e depois |
| [`testes_de_seguranca/README.md`](testes_de_seguranca/README.md) | Como funcionam e como rodar os testes de segurança com OWASP ZAP |
| [`front/src/main.jsx`](front/src/main.jsx) | Comentário no topo explicando a arquitetura MVVM do front e as tags de critérios |
| Aba **Sobre nós → Critérios de avaliação** | Dentro da aplicação, logado como `admin` |

---

## Como rodar localmente

Precisa só do Docker:

```bash
docker compose up --build
```

- Front: http://localhost:5174
- Back: http://localhost:8080/api/saude (deve responder `{"ok":true}`)
- Swagger: http://localhost:8080/api/docs

O banco é criado a partir de `db/db.sql` na primeira vez.
