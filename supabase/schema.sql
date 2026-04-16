-- ============================================================
-- SCHEMA — Meu Painel
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Tabela de perfis (vinculada ao auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,          -- formato interno: username@painel.local
  username    text not null unique,   -- ex: caio.vsilva
  nome        text not null,          -- nome de exibição
  role        text not null check (role in ('gestor', 'operador')),
  operador_id integer check (
    (role = 'operador' and operador_id between 1 and 12)
    or
    (role = 'gestor' and operador_id is null)
  ),
  avatar_url  text,
  created_at  timestamptz default now()
);

-- 2. RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Usuário lê apenas o próprio perfil
create policy "Usuário lê próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Gestor lê todos os perfis
create policy "Gestor lê todos os perfis"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'gestor'
    )
  );

-- Apenas o próprio usuário pode atualizar seu perfil
create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Trigger: cria perfil automaticamente ao criar usuário no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, nome, role, operador_id)
  values (
    new.id,
    new.email,
    -- username = parte antes do @ (ex: caio.vsilva@painel.local → caio.vsilva)
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'operador'),
    (new.raw_user_meta_data->>'operador_id')::integer
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
