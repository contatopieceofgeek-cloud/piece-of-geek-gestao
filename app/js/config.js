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
  supabaseUrl: 'https://plskerczkhjvqahpyucd.supabase.co',
  // Publishable key: pública por natureza, vai no navegador de todo usuário.
  // NUNCA trocar pela service_role — aquela ignora a RLS.
  supabasePublishableKey: 'sb_publishable_5LVn3HsjCBxvbngoJABEgA_a0FVlmkf',

  // Link do checkout do gateway, usado nos avisos de assinatura.
  // Preencher na Fase 3 quando o gateway estiver escolhido.
  checkoutUrl: '',

  // Valor mostrado nos avisos (só texto — o preço real é o do gateway).
  precoMensal: 'R$ 49/mês',
};
