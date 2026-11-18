# Testes de segurança (OWASP ZAP)

Varredura de segurança do PokeBox com o [OWASP ZAP](https://www.zaproxy.org/), com o resultado
agrupado pelas categorias do **OWASP Top 10 (2021)**. Tudo roda em Docker, separado do front, do
back, do banco e do Cypress: nada nestas pastas é alterado.

## Como rodar

Precisa só do Docker e do Node (sem `npm install`: não há dependências).

```bash
cd testes_de_seguranca
npm run seguranca                       # os dois scans + resumo 
npm run seguranca:front                 # só o scan passivo do front 
npm run seguranca:api                   # só o scan ativo da API
npm run seguranca -- --top10 A01,A05    # resumo só dessas categorias
npm run seguranca -- --minutos 5        # limite do scan ativo (padrão: 15)
npm run resumo -- relatorios/<data-hora> --top10 A03   # refaz o resumo de um scan antigo
```

## O que acontece

1. **Ambiente isolado** (`docker-compose.yml`, projeto `pokebox_seguranca`): sobe uma cópia do
   jogo só para ser atacada, com banco **descartável** (some ao final) e **sem portas abertas** na
   máquina. Pode rodar com o `docker-compose` principal no ar, e o banco de desenvolvimento não é
   tocado. O scan ativo manda milhares de requisições maliciosas e criaria lixo em um banco de verdade.
2. **Baseline no front** (`zap-baseline.py`): navega pelo front e analisa as respostas sem atacar
   (cabeçalhos de segurança, cookies, vazamento de informação...).
3. **Usuário de teste**: cria o treinador `zap-scanner`, com Pokémon inicial, e pega o token.
4. **API scan no back** (`zap-api-scan.py`): ataca cada rota descrita em `zap/openapi.yaml`, já
   autenticado com o token (SQL injection, XSS, injeção de comandos, path traversal...).
5. **Desliga tudo** e gera `relatorios/<data-hora>/resumo.md`, agrupado por categoria do Top 10.

Em `relatorios/<data-hora>/` ficam:

| Arquivo | O que é |
|---|---|
| `resumo.md` | alertas agrupados por categoria do OWASP Top 10 |
| `front.html` / `api.html` | relatório completo do ZAP, com descrição e solução de cada alerta |
| `front.json` / `api.json` | os mesmos dados em JSON (lidos pelo `resumo.js`) |
| `openapi.yaml` | cópia da definição de API usada no scan |

## Como os alertas viram categorias do Top 10

Cada alerta do ZAP traz o CWE da falha (ex.: CWE-79 é XSS). O `resumo.js` usa as listas de CWE
de cada categoria do Top 10 2021 para encaixar o alerta: CWE-79 cai em A03 (Injeção), CWE-1021
(clickjacking) em A04, e assim por diante. O que não se encaixa vai para "Outros". Se um dia o
relatório JSON do ZAP passar a trazer a marcação `OWASP_2021_Axx`, ela tem prioridade.

## Limites (o que o ZAP não pega)

- **Regras do jogo:** o ZAP não sabe que "sem o inicial, nada abre" ou "o menu libera com 3
  Pokémon". Essas travas hoje existem **só no front**; chamando a API direto, elas não valem (A01).
  Isso pede testes próprios de API, não um scanner.
- **Rotas de conta** (`/auth/...`): têm limite de 20 tentativas a cada 15 min, então boa parte dos
  ataques recebe 429. Isso é a proteção funcionando, mas também reduz o que o scan consegue testar ali.
- **Front em produção:** o scan ataca o build de produção (`vite preview`), com os mesmos
  cabeçalhos de segurança do `front/vercel.json` e do `netlify.toml`. Se mudar um, mude os outros.
- **Rota nova no back:** ela precisa entrar em `zap/openapi.yaml`, senão o scan ativo não a ataca.
- `POST /auth/sair` fica de fora de propósito: o ZAP derrubaria a própria sessão no meio do scan.

## Falsos positivos conhecidos

- **SQL Injection em `POST /batalhas/{id}/jogadas` (campo `indice`)**: o ZAP troca `0` por `2-2`,
  recebe a mesma resposta e conclui que o banco "calculou" a conta. Não é injeção: com
  `tipo: "atacar"` o back ignora o `indice`, o valor vira número antes de qualquer uso e as
  consultas usam parâmetros (`$1`). Conferido à mão em 16/11/2026: `0`, `2-2` e `0' OR '1'='1`
  dão exatamente a mesma resposta. O alerta aparece em algumas execuções e em outras não, porque o
  ZAP varia as tentativas.

## Escopo

Rode só contra o ambiente isolado deste compose. Não aponte o ZAP para a Vercel ou para o Render:
o scan ativo é, na prática, um ataque.
