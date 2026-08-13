/* ===================== REGRAS DE SINCRONIZAÇÃO =====================
   As DECISÕES da sincronização, separadas do encanamento (IndexedDB,
   Supabase, DOM) pra poderem ser testadas no Node — ver test/sync.test.js.

   Por que existe: o app já perdeu dado de produção duas vezes por causa de
   decisão errada aqui, não por falha de rede ou de banco. Toda vez foi uma
   comparação escrita inline no meio do IO, impossível de testar. Cada função
   abaixo é uma dessas comparações, com nome e teste.

   Regra: nada aqui pode tocar DOM, storage, rede ou `state`. Entra dado,
   sai decisão. */

/* Instalação nova = nenhuma das chaves de domínio tem valor, nem local nem
   na nuvem. É o gatilho pra montar o andaime de defaultData().

   ⚠️ Quem chama NÃO pode persistir esse andaime. Gravar dá a ele um carimbo
   de data "agora", e aí o resolveRead() abaixo passa a tratá-lo como edição
   recente do usuário — foi assim que uma aba anônima apagou a conta inteira
   do dono ao conectar. Ver a pegadinha de sincronização no CLAUDE.md. */
function isFreshInstall(values){
  return (values || []).every(v => !v);
}

/* Quem vence numa leitura: o que está neste aparelho ou o que está na nuvem?

   Devolve:
     'remote'         usa o da nuvem
     'local'          usa o local (a nuvem não tem essa chave)
     'local-and-push' usa o local E reenvia pra nuvem, porque é edição mais
                      nova feita aqui (tipicamente offline)

   O caso que importa: local SEM `localUpdatedAt` significa que este aparelho
   nunca gravou nada de verdade. Nesse caso a nuvem sempre vence, mesmo que o
   `updated_at` dela seja antigo — não existe edição local pra proteger. */
function resolveRead({ hasRemote, localUpdatedAt, remoteUpdatedAt, preferRemote }){
  if(!hasRemote) return 'local';
  // Puxada explícita logo após o login: quem acabou de entrar numa conta
  // quer os dados dela, sem negociação de data.
  if(preferRemote) return 'remote';
  // Só o local ESTRITAMENTE mais novo justifica reenviar. Empate significa
  // dado idêntico — o storageSet grava o mesmo carimbo nos dois lados, então
  // toda chave já sincronizada empata. Tratar empate como "local mais novo"
  // fazia o app disparar um upsert inútil por chave a cada abertura (nove).
  const localIsNewer = !!localUpdatedAt && new Date(localUpdatedAt) > new Date(remoteUpdatedAt);
  return localIsNewer ? 'local-and-push' : 'remote';
}

/* O upsert falhou: é assinatura vencida ou falta de internet?

   O cliente do Supabase devolve o erro no objeto em vez de lançar, então
   antes qualquer falha virava "sem conexão" silencioso — inclusive recusa da
   RLS, o que fazia a assinatura vencida parar de sincronizar sem o usuário
   nunca ficar sabendo. 42501 é o código do Postgres pra permissão negada. */
function classifyWriteError(err){
  if(!err) return null;
  if(err.code === '42501' || /row-level security/i.test(err.message || '')) return 'rls';
  return 'offline';
}

/* O que fazer logo depois do login, dado o que existe de cada lado.

     'offer-upload'  nuvem vazia — perguntar se sobe o que tem aqui
     'pull'          só a nuvem tem dado — puxar, sem perguntar
     'ask'           os DOIS têm dado — conflito de verdade, o usuário decide
                     (e quem chama baixa um backup antes de qualquer coisa)

   'ask' existe porque decidir isso sozinho por data é justamente o que
   apagou os dados do dono. */
function loginSyncDecision({ cloudHasData, localHasData }){
  if(!cloudHasData) return 'offer-upload';
  return localHasData ? 'ask' : 'pull';
}

// Ponte pro Node (no navegador `module` não existe e este bloco é ignorado).
if(typeof module !== 'undefined' && module.exports){
  module.exports = { isFreshInstall, resolveRead, classifyWriteError, loginSyncDecision };
}
