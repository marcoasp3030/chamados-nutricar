// Server function que lista clientes VMpay (substitui edge function `vmpay-clients`).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/auth/middleware.server";
import { listarClientesVmpay } from "./vmpay.server";

const Schema = z.object({
  workspaceId: z.string().uuid(),
});

export const listarClientesVmpayFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data, context }) => {
    return listarClientesVmpay(context.userId, data.workspaceId);
  });
