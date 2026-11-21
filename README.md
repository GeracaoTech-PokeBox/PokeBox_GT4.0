# PokeBox

Aplicação onde treinadores possam gerenciar suas coleções de pokémons e trocar pokemons com outros treinadores.

Feito durante o curso FullCycle - Engenharia de Software do projeto Geração Tech 4.0

## Membros da equipe

- Felipe Viana
- Lucas Mendes
- Victor Vale

## Stack

- Node.js
- JavaScript
- Cypress
- Mochawesome
- MySQL
- React
- Docker Compose

## Rodar localmente

```bash
docker compose up --build
```

Abra http://localhost:5174. O banco é criado a partir de `db/db.sql` na primeira vez.

## Publicar (Netlify + Render + Neon, tudo grátis)

| Parte | Onde | Configuração |
|---|---|---|
| Banco (PostgreSQL) | [Neon](https://neon.com) | `db/db.sql` |
| Back (Express) | [Render](https://render.com) | `render.yaml` |
| Front (React/Vite) | [Netlify](https://netlify.com) | `netlify.toml` |

Faça nesta ordem, porque cada passo usa o endereço gerado no anterior.

### 1. Banco no Neon

1. Crie um projeto na região **AWS US East 1 (N. Virginia)**, a mesma do back no Render.
2. Abra o **SQL Editor**, cole o conteúdo inteiro de `db/db.sql` e execute (só uma vez).
3. Em **Connect**, copie a *connection string* (`postgresql://...?sslmode=require...`).

### 2. Back no Render

**New → Blueprint**, escolha este repositório e cole a connection string do Neon quando ele pedir `DATABASE_URL`. Em `CORS_ORIGENS`, coloque o endereço do front (ex.: `https://pokebox.netlify.app`); se ainda não tiver, preencha depois do passo 3.

Se o Render não conseguir acessar a organização do GitHub, crie à mão: **New → Web Service → Public Git Repository**, cole a URL do repositório e preencha:

- Root Directory: `back`
- Build Command: `npm ci`
- Start Command: `node server.js`
- Instance Type: Free
- Health Check Path: `/api/saude`
- Environment: `DATABASE_URL` = connection string do Neon e `CORS_ORIGENS` = endereço do front

Para testar, abra `https://SEU-BACK.onrender.com/api/saude`, que deve responder `{"ok":true}`. A documentação das rotas (Swagger UI) fica em `https://SEU-BACK.onrender.com/api/docs`.

### 3. Front no Netlify

1. **Add new project → Import an existing project**, escolha este repositório. O `netlify.toml` já configura tudo.
2. Em **Site configuration → Environment variables**, crie `VITE_BACK_URL` com a URL do back (ex.: `https://pokebox-back.onrender.com`).
3. Rode o deploy (ou **Deploys → Trigger deploy**, se o primeiro falhou por falta da variável).

Se o Netlify não conseguir acessar a organização do GitHub, publique pela CLI, a partir da raiz do repositório (ela usa o `netlify.toml` e a variável do painel):

```bash
npx netlify-cli deploy --build --prod
```

### Avisos

- **O back grátis do Render dorme depois de 15 min sem acesso** e leva cerca de 1 min para acordar. O front já manda um "acorda" ao abrir, mas antes de apresentar abra o site com alguns minutos de antecedência.
- O `VITE_BACK_URL` entra no front na hora do build: se a URL do back mudar, faça um novo deploy no Netlify.
- **O back só aceita chamadas do navegador vindas dos endereços em `CORS_ORIGENS`** (mais de um, separados por vírgula). Se o front publicado mostrar erro de conexão e o console do navegador falar em CORS, confira essa variável no Render. No `docker-compose` local ela não é necessária.
- Nunca coloque a connection string do Neon no `back/.env` (o repositório é público). Ela fica só no painel do Render.
- O aviso `SECURITY WARNING: The SSL modes 'prefer', 'require'...` no log do Render é normal e não impede a conexão.

## Testes automatizados

A pipeline `Cypress | Allure e Discord` roda a cada **push em qualquer branch**, diariamente às **06h de Brasília** (`0 9 * * *` em UTC) e pelo disparo manual no Actions. Pushes e execuções manuais usam os arquivos de teste do commit disparado; o cron usa a `develop` atual. O site testado é o endereço configurado em `cypress.env.json`.

Os testes E2E usam Cypress com Page Objects e relatórios Mochawesome e Allure. A configuração e as dependências da automação ficam na raiz do projeto.

Centralize `baseUrl`, `baseUrlLocal`, `treinador` e `senha` em `cypress.env.json` (modelo: `cypress.env.example.json`). `baseUrl` define o site testado; `baseUrlLocal` é uma referência para trocar de ambiente. Execute com `npm run cy:run`. O cenário `login/sessao-real.cy.js` usa a conta existente para validar login, recarga da sessão e logout; cadastro e batalhas mantêm respostas simuladas.

No GitHub, em **Settings → Secrets and variables → Actions**, crie **`CYPRESS_ENV_JSON`** com o conteúdo completo do `cypress.env.json`. A pipeline recria o arquivo e usa sua URL nos testes, na espera do site e na notificação. O arquivo real permanece no `.gitignore`. `DISCORD_WEBHOOK_URL` continua sendo o secret separado das notificações.

