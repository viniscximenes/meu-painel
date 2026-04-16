-- ============================================================
-- SEED — Usuários reais do sistema
-- Email interno: username@painel.local
-- Senha padrão:  Painel@2024
-- Execute no SQL Editor do Supabase (precisa rodar schema.sql antes)
-- ============================================================

DO $$
BEGIN

  -- ── GESTORES ────────────────────────────────────────────────

  -- Supervisora (gestor puro)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'ana.angelica@painel.local',
    crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Ana Angelica Mattos Goncalves","role":"gestor","operador_id":14}'::jsonb,
    now(), now()
  );

  -- Admin-operador (gestor com operador_id)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'caio.vsilva@painel.local',
    crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Caio Vinicius Ximenes da Silva","role":"gestor","operador_id":13}'::jsonb,
    now(), now()
  );

  -- ── OPERADORES ───────────────────────────────────────────────

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'samyrha.fenix@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Samyrha Fenix da Silva Costa","role":"operador","operador_id":1}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'marcos.psilva@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Marcos Paulo Rodrigues da Silva","role":"operador","operador_id":2}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'bruno.roberto@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Bruno Chaves Roberto","role":"operador","operador_id":3}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'reyzo.deus@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Reyzo Miranda Candido de Deus","role":"operador","operador_id":4}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'kaian.alfradique@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Kaian Alfradique Rodrigues","role":"operador","operador_id":5}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'edna.desouza@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Edna de Souza","role":"operador","operador_id":6}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'sara.secundo@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Sara Secundo Batista da Silva","role":"operador","operador_id":7}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'igor.souza@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Igor Rogerio da Silva Souza","role":"operador","operador_id":8}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'willian.souza@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Willian Gozzi Nunes de Souza","role":"operador","operador_id":9}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'thyelen.azevedo@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Thyelen Oliveira Azevedo","role":"operador","operador_id":10}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'barbara.vilela@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Barbara Beatriz Damasceno Vilela","role":"operador","operador_id":11}'::jsonb, now(), now());

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'vitor.halmeida@painel.local', crypt('Painel@2024', gen_salt('bf')), now(),
    '{"nome":"Vitor Hugo de Almeida Rodrigues","role":"operador","operador_id":12}'::jsonb, now(), now());

END $$;
