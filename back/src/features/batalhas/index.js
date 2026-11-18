// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const rotas = require('./batalhas.rotas');
// A história monta a batalha contra o selvagem com o mesmo time de batalha
const { carregarTime, timeCompleto } = require('./batalhas.service');
// server.js liga o agendador; os testes chamam rodarUmaVez direto
const { iniciarAgendador, rodarUmaVez } = require('./batalhas.agendador');

module.exports = {
  rotas, carregarTime, timeCompleto, iniciarAgendador, rodarUmaVez,
};
