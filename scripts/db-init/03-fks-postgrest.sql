-- FKs necessárias para embeds PostgREST (ex.: workspace:workspaces(slug))
-- Sem estas constraints, queries como workspace_membros?select=workspace:workspaces(slug) falham.

ALTER TABLE workspace_membros
  ADD CONSTRAINT workspace_membros_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE workspace_membros
  ADD CONSTRAINT workspace_membros_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
