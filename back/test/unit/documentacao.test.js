// A documentação (docs/openapi.yaml) precisa acompanhar as rotas de verdade. Este teste lista as rotas
// montadas no rotas.js e falha se alguma não estiver documentada, se o YAML documentar uma rota que não
// existe mais ou se o cadeado (security) não bater com o uso do autenticar.
// Ao criar, mudar ou remover uma rota, atualize o openapi.yaml junto.
const test = require('node:test');
const assert = require('node:assert/strict');

const rotas = require('../../src/rotas');
const { autenticar } = require('../../src/features/contas');
const { especificacao } = require('../../src/documentacao');

// Rotas que o app.js monta direto, fora do rotas.js. Nenhuma exige login.
const ROTAS_DO_APP = ['GET /saude', 'GET /pokeapi/{recurso}', 'GET /pokeapi/{recurso}/{id}'];

// O Express 5 não guarda o caminho em que um roteador foi montado (rotas.use('/auth', auth)), só uma
// função que testa se uma URL bate com ele. Por isso os prefixos usados ficam listados aqui.
const PREFIXOS = ['/auth'];

function prefixoDe(camada) {
  if (camada.slash) return ''; // montado sem caminho: router.use(outroRouter)
  const prefixo = PREFIXOS.find((p) => camada.matchers[0](p)?.path === p);
  assert.ok(prefixo, 'Há um roteador montado num caminho que o teste não conhece: acrescente-o em PREFIXOS.');
  return prefixo;
}

/**
 * Rotas do roteador (e dos roteadores dentro dele) no formato do OpenAPI, cada uma dizendo se passa
 * pelo autenticar: { 'POST /pokemons/{id}/cuidar': true, 'POST /auth/login': false, ... }
 */
function listarRotas(router, prefixo = '') {
  return router.stack.reduce((lista, camada) => {
    if (camada.route) {
      const caminho = (prefixo + camada.route.path).replace(/:(\w+)/g, '{$1}'); // :id -> {id}
      const exigeLogin = camada.route.stack.some((etapa) => etapa.handle === autenticar);
      Object.keys(camada.route.methods).forEach((metodo) => {
        lista[`${metodo.toUpperCase()} ${caminho}`] = exigeLogin;
      });
    } else if (camada.name === 'router') {
      Object.assign(lista, listarRotas(camada.handle, prefixo + prefixoDe(camada)));
    }
    return lista; // o resto são middlewares (express.json, limitarTentativas, tratarErros)
  }, {});
}

const noCodigo = listarRotas(rotas);

// Mesmo formato, lido do openapi.yaml: sem "security: []" a rota herda o bearerAuth global
const METODOS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const naDocumentacao = Object.fromEntries(Object.entries(especificacao.paths).flatMap(
  ([caminho, operacoes]) => Object.entries(operacoes)
    .filter(([metodo]) => METODOS.has(metodo))
    .map(([metodo, operacao]) => [`${metodo.toUpperCase()} ${caminho}`, operacao.security?.length !== 0]),
));

test('o teste enxerga as rotas do rotas.js, inclusive as de /auth', () => {
  assert.equal(noCodigo['POST /auth/login'], false);
  assert.equal(noCodigo['POST /auth/sair'], true);
  assert.equal(noCodigo['POST /pokemons/{id}/cuidar'], true);
});

test('toda rota do rotas.js está no openapi.yaml', () => {
  const faltando = Object.keys(noCodigo).filter((rota) => !(rota in naDocumentacao));
  assert.deepEqual(faltando, [], `Rotas sem documentação em docs/openapi.yaml:\n${faltando.join('\n')}`);
});

test('o openapi.yaml só documenta rotas que existem', () => {
  const existentes = new Set([...Object.keys(noCodigo), ...ROTAS_DO_APP]);
  const sobrando = Object.keys(naDocumentacao).filter((rota) => !existentes.has(rota));
  assert.deepEqual(sobrando, [], `Rotas documentadas que não existem mais:\n${sobrando.join('\n')}`);
});

test('o cadeado de cada rota na documentação bate com o autenticar no código', () => {
  const exigeLogin = { ...noCodigo, ...Object.fromEntries(ROTAS_DO_APP.map((rota) => [rota, false])) };
  const erradas = Object.entries(naDocumentacao)
    .filter(([rota, documentadaComLogin]) => rota in exigeLogin && documentadaComLogin !== exigeLogin[rota])
    .map(([rota]) => `${rota} (no código ${exigeLogin[rota] ? 'exige' : 'não exige'} login)`);
  assert.deepEqual(erradas, [], `Rotas com o "security" errado no openapi.yaml:\n${erradas.join('\n')}`);
});
