-- Flag "proposta criada" em chamados encerrados de solicitação de projeto.
ALTER TABLE public.chamados
  ADD COLUMN IF NOT EXISTS proposta_criada boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.chamados.proposta_criada IS
  'Indica se a proposta comercial foi criada (categorias de solicitação de projeto encerradas).';
