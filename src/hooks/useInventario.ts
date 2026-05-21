import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/dados/atual";

export interface ItemInventario {
  id: string;
  workspace_id: string;
  departamento_id: string;
  nome: string;
  descricao: string | null;
  unidade: string | null;
  quantidade: number;
  quantidade_minima: number;
  localizacao: string | null;
  loja: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
}

export interface MovimentacaoInventario {
  id: string;
  workspace_id: string;
  item_id: string;
  tipo: "entrada" | "saida" | "ajuste";
  quantidade: number;
  motivo: string | null;
  usuario_id: string;
  criado_em: string;
}

export interface CompartilhamentoInventario {
  id: string;
  workspace_id: string;
  departamento_dono_id: string;
  departamento_compartilhado_id: string;
  criado_por: string;
  criado_em: string;
}

// Departamentos do usuário no workspace atual
export function useDepartamentosDoUsuario(workspaceId: string | undefined, usuarioId: string | null) {
  return useQuery({
    queryKey: ["meus-departamentos", workspaceId, usuarioId],
    enabled: !!workspaceId && !!usuarioId,
    queryFn: async (): Promise<string[]> => {
      const { data: membro, error: e1 } = await db
        .from("workspace_membros")
        .select("id")
        .eq("workspace_id", workspaceId!)
        .eq("usuario_id", usuarioId!)
        .eq("ativo", true)
        .maybeSingle();
      if (e1) throw e1;
      if (!membro) return [];
      const { data, error } = await db
        .from("workspace_membro_departamentos")
        .select("departamento_id")
        .eq("membro_id", membro.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.departamento_id);
    },
  });
}

// Itens de um departamento
export function useItensInventario(workspaceId: string | undefined, departamentoId: string | undefined) {
  return useQuery({
    queryKey: ["inventario-itens", workspaceId, departamentoId],
    enabled: !!workspaceId && !!departamentoId,
    queryFn: async (): Promise<ItemInventario[]> => {
      const { data, error } = await db
        .from("inventario_itens")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("departamento_id", departamentoId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as ItemInventario[];
    },
  });
}

export function useMovimentacoesItem(itemId: string | undefined) {
  return useQuery({
    queryKey: ["inventario-mov", itemId],
    enabled: !!itemId,
    queryFn: async (): Promise<MovimentacaoInventario[]> => {
      const { data, error } = await db
        .from("inventario_movimentacoes")
        .select("*")
        .eq("item_id", itemId!)
        .order("criado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as MovimentacaoInventario[];
    },
  });
}

export function useMovimentacoesDepartamento(
  workspaceId: string | undefined,
  departamentoId: string | undefined,
) {
  return useQuery({
    queryKey: ["inventario-mov-dep", workspaceId, departamentoId],
    enabled: !!workspaceId && !!departamentoId,
    queryFn: async (): Promise<(MovimentacaoInventario & { item_nome?: string })[]> => {
      const { data: itens, error: e1 } = await db
        .from("inventario_itens")
        .select("id, nome")
        .eq("workspace_id", workspaceId!)
        .eq("departamento_id", departamentoId!);
      if (e1) throw e1;
      const ids = (itens ?? []).map((i) => i.id);
      if (ids.length === 0) return [];
      const { data, error } = await db
        .from("inventario_movimentacoes")
        .select("*")
        .in("item_id", ids)
        .order("criado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      const mapaNomes = new Map((itens ?? []).map((i) => [i.id, i.nome]));
      return (data ?? []).map((m) => ({
        ...(m as MovimentacaoInventario),
        item_nome: mapaNomes.get((m as MovimentacaoInventario).item_id),
      }));
    },
  });
}

export function useCompartilhamentos(workspaceId: string | undefined, departamentoDonoId: string | undefined) {
  return useQuery({
    queryKey: ["inventario-compart", workspaceId, departamentoDonoId],
    enabled: !!workspaceId && !!departamentoDonoId,
    queryFn: async (): Promise<CompartilhamentoInventario[]> => {
      const { data, error } = await db
        .from("inventario_compartilhamentos")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("departamento_dono_id", departamentoDonoId!);
      if (error) throw error;
      return (data ?? []) as CompartilhamentoInventario[];
    },
  });
}

export function useMutacoesInventario(workspaceId: string | undefined, usuarioId: string | null) {
  const qc = useQueryClient();

  const salvarItem = useMutation({
    mutationFn: async (
      item: Partial<ItemInventario> & { departamento_id: string; nome: string },
    ) => {
      if (item.id) {
        const { error } = await db
          .from("inventario_itens")
          .update({
            nome: item.nome,
            descricao: item.descricao ?? null,
            unidade: item.unidade ?? null,
            quantidade_minima: item.quantidade_minima ?? 0,
            localizacao: item.localizacao ?? null,
            loja: item.loja ?? null,
          })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("inventario_itens").insert({
          workspace_id: workspaceId!,
          departamento_id: item.departamento_id,
          nome: item.nome,
          descricao: item.descricao ?? null,
          unidade: item.unidade ?? null,
          quantidade: item.quantidade ?? 0,
          quantidade_minima: item.quantidade_minima ?? 0,
          localizacao: item.localizacao ?? null,
          loja: item.loja ?? null,
          criado_por: usuarioId!,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario-itens"] }),
  });

  const excluirItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inventario_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario-itens"] }),
  });

  const registrarMovimentacao = useMutation({
    mutationFn: async (m: {
      item_id: string;
      tipo: "entrada" | "saida" | "ajuste";
      quantidade: number;
      motivo?: string;
    }) => {
      const { error } = await db.from("inventario_movimentacoes").insert({
        workspace_id: workspaceId!,
        item_id: m.item_id,
        tipo: m.tipo,
        quantidade: m.quantidade,
        motivo: m.motivo ?? null,
        usuario_id: usuarioId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventario-itens"] });
      qc.invalidateQueries({ queryKey: ["inventario-mov"] });
    },
  });

  const compartilhar = useMutation({
    mutationFn: async (v: { departamento_dono_id: string; departamento_compartilhado_id: string }) => {
      const { error } = await db.from("inventario_compartilhamentos").insert({
        workspace_id: workspaceId!,
        departamento_dono_id: v.departamento_dono_id,
        departamento_compartilhado_id: v.departamento_compartilhado_id,
        criado_por: usuarioId!,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario-compart"] }),
  });

  const removerCompartilhamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inventario_compartilhamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventario-compart"] }),
  });

  return { salvarItem, excluirItem, registrarMovimentacao, compartilhar, removerCompartilhamento };
}
