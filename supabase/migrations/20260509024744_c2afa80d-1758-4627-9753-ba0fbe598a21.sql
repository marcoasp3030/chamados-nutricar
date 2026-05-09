-- Status de compra por item da requisição
CREATE TYPE public.status_item_compra AS ENUM (
  'Pendente',
  'Cotando',
  'Aprovado',
  'Comprado',
  'Recebido',
  'Cancelado'
);

ALTER TABLE public.chamado_requisicao_itens
  ADD COLUMN status_compra public.status_item_compra NOT NULL DEFAULT 'Pendente',
  ADD COLUMN observacao_compra text,
  ADD COLUMN atualizado_compra_em timestamp with time zone,
  ADD COLUMN atualizado_compra_por uuid;
