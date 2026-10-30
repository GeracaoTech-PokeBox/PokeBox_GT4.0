declare namespace Cypress {
  interface Chainable {
    /** Lê as credenciais locais sem exibir seus valores no log. */
    obterCredenciais(): Chainable<{ treinador: string; senha: string }>;
    /** Observa a autenticação sem simular respostas e desativa o cache HTTP da consulta da sessão. */
    monitorarAutenticacao(): Chainable<null>;
    /** Aguarda a requisição, verifica o status e devolve o corpo da resposta. */
    aguardarResposta(alias: string, statusEsperado: number): Chainable<any>;
    /** Visita a tela e autentica pela interface usando as credenciais do env. */
    login(): Chainable<AUTWindow>;
    /** Encerra pela interface a sessão monitorada e valida o retorno ao login. */
    logout(): Chainable<AUTWindow>;
  }
}
