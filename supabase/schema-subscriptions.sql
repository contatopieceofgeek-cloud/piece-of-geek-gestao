-- ============================================================================
--  ASSINATURAS  —  rodar no SQL Editor do projeto Supabase, DEPOIS do schema.sql
-- ============================================================================
--
--  ⚠️  LEIA O BLOCO 6 ANTES DE RODAR. Ele libera os usuários que JÁ existem.
--      Sem ele, quem já usa o app (inclusive você) perde o direito de gravar
--      na nuvem assim que as políticas novas entrarem no ar.
--
--  Princípio de segurança deste arquivo: o navegador NUNCA pode alterar o
--  próprio status de assinatura. A tabela subscriptions só aceita escrita da
--  service_role (que ignora RLS), usada exclusivamente pela Edge Function de
--  webhook do gateway de pagamento. O app só lê.
--
--  Princípio de produto: assinatura vencida NÃO tranca os dados do usuário.
--  Ele continua lendo e exportando tudo; só não consegue gravar coisa nova.
--  Isso é o que os Termos de Uso prometem ("prazo para exportar seu backup")
--  e é o que a LGPD espera em relação a portabilidade e exclusão.
-- ============================================================================


-- 1. Tabela ------------------------------------------------------------------

create table if not exists public.subscriptions (
  user_id                  uuid primary key references auth.users on delete cascade,
  -- trialing | active | past_due | canceled
  status                   text        not null default 'trialing',
  trial_ends_at            timestamptz,
  current_period_end       timestamptz,
  -- Preenchidos pelo webhook do gateway (stripe, asaas, ...)
  provider                 text,
  provider_customer_id     text,
  provider_subscription_id text,
  updated_at               timestamptz not null default now(),
  constraint subscriptions_status_check
    check (status in ('trialing','active','past_due','canceled'))
);

alter table public.subscriptions enable row level security;


-- 2. RLS da própria tabela de assinaturas ------------------------------------
-- Só leitura da própria linha. Repare que NÃO existe policy de insert/update
-- para usuário autenticado: isso é intencional. Sem policy, ninguém que passe
-- pela RLS consegue escrever — sobra só a service_role, que a ignora.

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);


-- 3. Função que decide se o usuário pode gravar ------------------------------
-- security definer pra conseguir ler subscriptions mesmo dentro da avaliação
-- da policy de outra tabela. search_path fixo evita sequestro de resolução de
-- nome por um schema malicioso no caminho.

create or replace function public.has_write_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.subscriptions s
     where s.user_id = uid
       and (
             (s.status = 'active'
              and (s.current_period_end is null or s.current_period_end > now()))
          or (s.status = 'trialing'
              and s.trial_ends_at is not null and s.trial_ends_at > now())
           )
  );
$$;

revoke execute on function public.has_write_access(uuid) from public;
grant  execute on function public.has_write_access(uuid) to authenticated;


-- 4. Novas políticas de app_data ---------------------------------------------
-- A policy antiga era "for all" (leitura e escrita juntas). Trocamos por
-- quatro políticas separadas pra poder liberar leitura e travar só a escrita.

drop policy if exists "own data" on public.app_data;

-- Ler sempre pode: é o que garante export de backup e consulta do histórico
-- mesmo com a assinatura vencida.
create policy "app_data select own" on public.app_data
  for select using (auth.uid() = user_id);

-- Apagar sempre pode: direito de exclusão (LGPD art. 18) não depende de estar
-- em dia com o pagamento.
create policy "app_data delete own" on public.app_data
  for delete using (auth.uid() = user_id);

-- Gravar exige assinatura válida (em teste ou ativa).
create policy "app_data insert own paid" on public.app_data
  for insert with check (auth.uid() = user_id and public.has_write_access(auth.uid()));

create policy "app_data update own paid" on public.app_data
  for update using (auth.uid() = user_id and public.has_write_access(auth.uid()))
          with check (auth.uid() = user_id and public.has_write_access(auth.uid()));


-- 5. Todo usuário novo nasce com período de teste ----------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.subscriptions (user_id, status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '14 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 6. ⚠️ USUÁRIOS QUE JÁ EXISTEM  — não pule -----------------------------------
-- O trigger acima só vale pra cadastro novo. Sem a linha abaixo, todo mundo
-- que já tem conta fica sem linha em subscriptions, has_write_access() devolve
-- false e a sincronização para de gravar sem aviso claro.

insert into public.subscriptions (user_id, status, trial_ends_at)
select id, 'trialing', now() + interval '14 days'
  from auth.users
 on conflict (user_id) do nothing;

-- E a SUA conta de dono, que não deve depender de gateway nenhum.
-- Descomente e troque pelo seu e-mail antes de rodar:
--
-- update public.subscriptions
--    set status = 'active', current_period_end = null, provider = 'owner'
--  where user_id = (select id from auth.users where email = 'seu@email.com');


-- 7. Conferência --------------------------------------------------------------
-- Depois de rodar, isto deve listar cada usuário como podendo gravar:
--
-- select u.email, s.status, s.trial_ends_at, public.has_write_access(u.id) as pode_gravar
--   from auth.users u left join public.subscriptions s on s.user_id = u.id;
