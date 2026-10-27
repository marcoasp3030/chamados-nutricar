import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LocalVmpay } from "@/tipos/vmpay";
import { listarLocaisVmpayFn } from "@/lib/vmpay.functions";
import { buscarLocalPorNomeLoja } from "@/utilitarios/vmpay-endereco";

export type { LocalVmpay };

export function useLocaisVMPay(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["vmpay-locais", workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<LocalVmpay[]> => {
      try {
        const data = await listarLocaisVmpayFn({
          data: { workspaceId: workspaceId! },
        });
        if (!data?.ok) return [];
        return data.locais ?? [];
      } catch {
        return [];
      }
    },
  });
}

export function useLocalVMPayPorNome(
  workspaceId: string | undefined,
  nomeLoja: string | null | undefined,
) {
  const query = useLocaisVMPay(workspaceId);
  const local = useMemo(
    () => buscarLocalPorNomeLoja(query.data ?? [], nomeLoja),
    [query.data, nomeLoja],
  );
  return { ...query, local };
}
