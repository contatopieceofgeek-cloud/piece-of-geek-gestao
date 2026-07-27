-- Schema usado pela sincronização multi-dispositivo do Piece of Geek 3D.
-- Rodar no SQL Editor de um projeto Supabase (novo ou existente).
--
-- O app guarda cada domínio de dado (materials, products, sales, orders,
-- customers, printFailures, settings) como uma linha JSON separada,
-- chaveada por usuário + nome da chave. Não é um schema relacional —
-- é deliberadamente simples pra espelhar exatamente o que já existia
-- em localStorage/IndexedDB, sem precisar reescrever toda a camada
-- de persistência do app.

create table app_data (
  user_id uuid references auth.users not null,
  key text not null,
  value text not null,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

alter table app_data enable row level security;

create policy "own data" on app_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Liga a replicação Realtime pra essa tabela — sem isso, o app não recebe
-- atualização automática quando outro dispositivo salva algo (é preciso dar F5).
-- Já protegido pela RLS acima; o Realtime respeita a mesma política.
alter publication supabase_realtime add table app_data;

-- Chaves usadas pelo app: 'materials', 'products', 'sales', 'orders',
-- 'customers', 'printFailures', 'settings'.
--
-- Autenticação: email/senha simples via Supabase Auth (auth.users nativo,
-- sem tabela própria de perfil).
--
-- Se for evoluir pra um schema relacional de verdade (tabelas próprias
-- por domínio, em vez de blobs JSON), isso é uma migração de dados real,
-- não só de schema — pensar em como migrar o JSON existente de cada
-- usuário antes de trocar a estrutura.

-- ---------------------------------------------------------------------
-- Integração com a API oficial do Mercado Livre (taxa real por categoria).
-- Guarda o token OAuth de UMA conta de vendedor por usuário do app.
-- Só as Edge Functions (ml-oauth-callback, ml-fee-lookup) leem/escrevem
-- aqui, usando a service role key — o token nunca é lido direto pelo
-- navegador, só através das functions.
create table ml_oauth_tokens (
  user_id uuid references auth.users primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

alter table ml_oauth_tokens enable row level security;

create policy "own ml token" on ml_oauth_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
