/* Configuração do backend do produto.
   ---------------------------------------------------------------------------
   Antes isto era digitado pelo usuário em Configurações → Sincronização, o que
   é fluxo de desenvolvedor, não de produto: ninguém que assina um app vai
   criar um projeto Supabase e colar uma chave. Agora as credenciais do
   projeto do PRODUTO ficam aqui, e o usuário só vê e-mail e senha.

   Pôr a publishable key aqui é seguro por design: ela é pública por natureza
   e o que protege os dados é a Row Level Security do banco (ver
   supabase/schema.sql e schema-subscriptions.sql), não o segredo da chave.
   O que NUNCA pode entrar aqui é a service_role key — essa ignora a RLS e só
   pode viver nos secrets das Edge Functions.

   Se os campos ficarem em branco, o app volta ao comportamento antigo de
   "traga seu próprio Supabase" (útil pra rodar local ou pra quem já usava). */
window.APP_CONFIG = {
  // Ex: 'https://xxxxxxxxxxxx.supabase.co'
  supabaseUrl: '',
  // Ex: 'sb_publishable_...' (ou a anon key legada). NUNCA a service_role.
  supabasePublishableKey: '',

  // Link do checkout do gateway, usado nos avisos de assinatura.
  // Preencher na Fase 3 quando o gateway estiver escolhido.
  checkoutUrl: '',

  // Valor mostrado nos avisos (só texto — o preço real é o do gateway).
  precoMensal: 'R$ 49/mês',
};
