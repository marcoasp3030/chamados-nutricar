-- Seed idempotente: empresa Nutricar Brasil + usuário TI (super admin).
-- Executar após migrations/RLS. Seguro rodar mais de uma vez.

DO $$
DECLARE
  v_usuario_id uuid := 'd7f3fa13-22b7-4e37-b95a-c02783c37bd9';
  v_workspace_id uuid := '492e5190-0a5f-41bb-9cdb-fa81f1b6de83';
  v_email text := 'ti@nutricarbrasil.com.br';
BEGIN
  -- Usuário auth (senha definida separadamente via script/admin)
  INSERT INTO usuarios (id, email, senha_hash, email_verificado)
  VALUES (v_usuario_id, v_email, 'MIGRACAO_PENDENTE_RESETAR_SENHA', true)
  ON CONFLICT (email) DO UPDATE SET
    email_verificado = true,
    atualizado_em = now();

  SELECT id INTO v_usuario_id FROM usuarios WHERE email = v_email;

  -- Perfil (mesmo id que usuarios — padrão Supabase migrado)
  INSERT INTO perfis (id, nome, email, super_admin)
  VALUES (v_usuario_id, 'TI Nutricar', v_email, true)
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    super_admin = true,
    atualizado_em = now();

  -- Workspace Nutricar Brasil
  INSERT INTO workspaces (
    id, nome, slug, cor_primaria, fuso_horario, proprietario_id,
    plano, status, limite_usuarios, limite_chamados_mes
  )
  VALUES (
    v_workspace_id, 'Nutricar Brasil', 'nutricar', '#88BE46', 'America/Sao_Paulo', v_usuario_id,
    'Empresarial', 'Ativo', 100, 10000
  )
  ON CONFLICT (slug) DO UPDATE SET
    nome = EXCLUDED.nome,
    proprietario_id = v_usuario_id,
    plano = EXCLUDED.plano,
    status = 'Ativo',
    atualizado_em = now();

  SELECT id INTO v_workspace_id FROM workspaces WHERE slug = 'nutricar';

  -- Vínculo como Proprietário
  INSERT INTO workspace_membros (workspace_id, usuario_id, papel, cargo, ativo, aceito_em)
  VALUES (v_workspace_id, v_usuario_id, 'Proprietario', 'TI', true, now())
  ON CONFLICT (workspace_id, usuario_id) DO UPDATE SET
    papel = 'Proprietario',
    cargo = 'TI',
    ativo = true,
    aceito_em = COALESCE(workspace_membros.aceito_em, now());

  UPDATE perfis SET ultimo_workspace_id = v_workspace_id, atualizado_em = now()
  WHERE id = v_usuario_id;
END $$;
