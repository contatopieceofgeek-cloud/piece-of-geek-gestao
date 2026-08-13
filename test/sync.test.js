/* Testes das decisões de sincronização — `node --test`, sem dependência.

   Contexto: o app perdeu dado de produção duas vezes, e as duas por decisão
   errada aqui, não por falha de rede ou banco. Cada teste abaixo trava uma
   dessas decisões. O primeiro bloco reproduz o incidente real, passo a passo. */
const test = require('node:test');
const assert = require('node:assert');

const { isFreshInstall, resolveRead, classifyWriteError, loginSyncDecision } =
  require('../app/js/sync-rules.js');

const ONTEM = '2026-08-12T10:00:00.000Z';
const HOJE  = '2026-08-13T10:00:00.000Z';

// ===========================================================================
//  O INCIDENTE — aba anônima apagou a conta inteira do dono
// ===========================================================================
test('INCIDENTE: aparelho recém-instalado nunca vence a nuvem', () => {
  // 1. Aba anônima: sem localStorage, sem IndexedDB — nada em lugar nenhum.
  assert.strictEqual(isFreshInstall([null,null,null,null,null,null,null,null,null]), true,
    'nada salvo em lugar nenhum = instalação nova');

  // 2. O app monta o andaime. Quem chama NÃO persiste (ver applyLoadedState),
  //    então o local continua SEM timestamp. É esse detalhe que salva.
  const localSemTimestamp = null;

  // 3. Login numa conta que já tem dados. A nuvem é "mais antiga" em data,
  //    mas tem de ser ela a vencer — não há edição local pra proteger.
  assert.strictEqual(
    resolveRead({ hasRemote:true, localUpdatedAt: localSemTimestamp, remoteUpdatedAt: ONTEM, preferRemote:false }),
    'remote',
    'sem timestamp local, a nuvem vence mesmo sendo mais antiga');

  // 4. O bug antigo: se o andaime TIVESSE sido gravado, ele ganharia um
  //    carimbo de agora e passaria a ser empurrado por cima da conta.
  assert.strictEqual(
    resolveRead({ hasRemote:true, localUpdatedAt: HOJE, remoteUpdatedAt: ONTEM, preferRemote:false }),
    'local-and-push',
    'com timestamp local mais novo, o local é empurrado pra nuvem — foi isso que apagou os dados');
});

test('INCIDENTE: login com dados dos dois lados tem que perguntar', () => {
  // Era aqui que o app decidia sozinho e escolhia errado.
  assert.strictEqual(loginSyncDecision({ cloudHasData:true, localHasData:true }), 'ask');
});

// ===========================================================================
//  isFreshInstall
// ===========================================================================
test('isFreshInstall só é verdade quando NADA tem valor', () => {
  assert.strictEqual(isFreshInstall([null,null,null]), true);
  assert.strictEqual(isFreshInstall([undefined,'',null]), true, 'string vazia também conta como vazio');
  assert.strictEqual(isFreshInstall([]), true, 'lista vazia = nada carregado');

  assert.strictEqual(isFreshInstall([null,'[]',null]), false, 'um "[]" salvo já é dado do usuário');
  assert.strictEqual(isFreshInstall(['{"a":1}']), false);
});

// ===========================================================================
//  resolveRead — a matriz completa
// ===========================================================================
test('resolveRead: sem dado na nuvem, fica com o local', () => {
  assert.strictEqual(resolveRead({ hasRemote:false, localUpdatedAt:HOJE, remoteUpdatedAt:null, preferRemote:false }), 'local');
  assert.strictEqual(resolveRead({ hasRemote:false, localUpdatedAt:null, remoteUpdatedAt:null, preferRemote:false }), 'local');
});

test('resolveRead: nuvem mais nova vence', () => {
  assert.strictEqual(
    resolveRead({ hasRemote:true, localUpdatedAt:ONTEM, remoteUpdatedAt:HOJE, preferRemote:false }), 'remote');
});

test('resolveRead: local mais novo vence e é reenviado', () => {
  // É a proteção da edição feita offline — não pode ser perdida.
  assert.strictEqual(
    resolveRead({ hasRemote:true, localUpdatedAt:HOJE, remoteUpdatedAt:ONTEM, preferRemote:false }), 'local-and-push');
});

test('resolveRead: empate de data fica com a nuvem', () => {
  // Sem diferença de data não há edição local a proteger; a nuvem é a
  // fonte compartilhada entre aparelhos, então ela desempata.
  assert.strictEqual(
    resolveRead({ hasRemote:true, localUpdatedAt:HOJE, remoteUpdatedAt:HOJE, preferRemote:false }), 'remote');
});

test('resolveRead: preferRemote atropela a comparação de data', () => {
  // Puxada logo após o login: quem entrou numa conta quer os dados dela,
  // mesmo tendo mexido em algo neste aparelho antes de entrar.
  assert.strictEqual(
    resolveRead({ hasRemote:true, localUpdatedAt:HOJE, remoteUpdatedAt:ONTEM, preferRemote:true }), 'remote');
  // Mas não inventa dado: se a nuvem não tem a chave, continua no local.
  assert.strictEqual(
    resolveRead({ hasRemote:false, localUpdatedAt:HOJE, remoteUpdatedAt:null, preferRemote:true }), 'local');
});

// ===========================================================================
//  classifyWriteError
// ===========================================================================
test('classifyWriteError separa assinatura vencida de falta de conexão', () => {
  assert.strictEqual(classifyWriteError(null), null, 'sem erro, sem classificação');

  // Recusa da RLS: o Postgres devolve 42501 em permissão negada.
  assert.strictEqual(classifyWriteError({ code:'42501' }), 'rls');
  assert.strictEqual(
    classifyWriteError({ message:'new row violates row-level security policy for table "app_data"' }), 'rls',
    'reconhece pela mensagem quando o código não vem');
  assert.strictEqual(classifyWriteError({ message:'ROW-LEVEL SECURITY' }), 'rls', 'não diferencia maiúsculas');

  // Qualquer outra coisa é tratada como offline: salva local e tenta depois.
  assert.strictEqual(classifyWriteError({ message:'Failed to fetch' }), 'offline');
  assert.strictEqual(classifyWriteError({ code:'23505' }), 'offline');
  assert.strictEqual(classifyWriteError({}), 'offline');
});

// ===========================================================================
//  loginSyncDecision — a matriz completa
// ===========================================================================
test('loginSyncDecision cobre os quatro cenários', () => {
  // Conta nova, aparelho novo: nada a fazer além de oferecer o envio.
  assert.strictEqual(loginSyncDecision({ cloudHasData:false, localHasData:false }), 'offer-upload');
  // Aparelho tem dado, conta é nova: oferece subir (com confirmação).
  assert.strictEqual(loginSyncDecision({ cloudHasData:false, localHasData:true  }), 'offer-upload');
  // Só a nuvem tem: puxa direto, sem incomodar.
  assert.strictEqual(loginSyncDecision({ cloudHasData:true,  localHasData:false }), 'pull');
  // Os dois têm: NUNCA decidir sozinho.
  assert.strictEqual(loginSyncDecision({ cloudHasData:true,  localHasData:true  }), 'ask');
});

test('loginSyncDecision nunca devolve pull quando há dado local em risco', () => {
  // Trava a regra que faltava: puxar por cima de dado local, sem perguntar,
  // é exatamente a perda silenciosa que aconteceu.
  for(const localHasData of [true, false]){
    const d = loginSyncDecision({ cloudHasData:true, localHasData });
    if(localHasData) assert.notStrictEqual(d, 'pull', 'com dado local, puxar direto apagaria ele');
  }
});
