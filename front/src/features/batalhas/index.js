// Fachada da feature batalhas: batalhas entre treinadores
export { default as Batalhas } from './components/Batalhas';
export { default as Batalha } from './components/Batalha';

// Peças e regras de batalha, reaproveitadas pela feature historia
export { default as AcoesBatalha } from './components/AcoesBatalha';
export { LadoCampo } from './components/CampoBatalha';
export { default as RecompensaBatalha } from './components/RecompensaBatalha';
export { MOTIVOS, descreverEventos, reservasDoLado } from './models/index_models';
