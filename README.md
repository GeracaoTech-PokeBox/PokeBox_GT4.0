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

**New → Blueprint**, escolha este repositório e cole a connection string do Neon quando ele pedir `DATABASE_URL`.

Se o Render não conseguir acessar a organização do GitHub, crie à mão: **New → Web Service → Public Git Repository**, cole a URL do repositório e preencha:

- Root Directory: `back`
- Build Command: `npm ci`
- Start Command: `node server.js`
- Instance Type: Free
- Health Check Path: `/api/saude`
- Environment: `DATABASE_URL` = connection string do Neon

Para testar, abra `https://SEU-BACK.onrender.com/api/saude`, que deve responder `{"ok":true}`.

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
- Nunca coloque a connection string do Neon no `back/.env` (o repositório é público). Ela fica só no painel do Render.
- O aviso `SECURITY WARNING: The SSL modes 'prefer', 'require'...` no log do Render é normal e não impede a conexão.

## Testes automatizados

A execução diária às **06h de Brasília**, a publicação do relatório Allure no GitHub Pages e as notificações no Discord.

Os testes E2E usam Cypress com Page Objects e relatórios Mochawesome e Allure. A configuração e as dependências da automação ficam na raiz do projeto.

