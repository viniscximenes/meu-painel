-- Corrige a policy recursiva "Gestor lê todos os perfis"
-- Execute no SQL Editor do Supabase

-- Remove a policy problemática
drop policy if exists "Gestor lê todos os perfis" on public.profiles;

-- Recria sem recursão — usa o JWT diretamente via auth.jwt()
create policy "Gestor lê todos os perfis"
  on public.profiles for select
  using (
    (auth.jwt() ->> 'role') = 'authenticated'
    and exists (
      -- usa security definer function para evitar recursão
      select 1
      from auth.users u
      where u.id = auth.uid()
        and (u.raw_user_meta_data ->> 'role') = 'gestor'
    )
  );
