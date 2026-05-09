import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LojaVMPay {
  id: number;
  name: string;
}

interface RespostaLojas {
  ok: boolean;
  erro?: string;
  clientes?: LojaVMPay[];
}

export function useLojasVMPay(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["vmpay-lojas", workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<LojaVMPay[]> => {
      const { data, error } = await supabase.functions.invoke<RespostaLojas>(
        "vmpay-clients",
        { body: { workspaceId } },
      );
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.erro || "Falha ao carregar lojas.");
      return data.clientes ?? [];
    },
  });
}
