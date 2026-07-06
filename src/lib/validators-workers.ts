import { z } from "zod";
import { isWorkerProviderId } from "@/lib/workers/registry";

const providerSchema = z
  .string()
  .trim()
  .refine((value) => isWorkerProviderId(value), "Provedor inválido.");

export const workerUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    primaryProvider: providerSchema.optional(),
    secondaryProvider: providerSchema.nullable().optional(),
    intervalSeconds: z.number().int().min(300).max(86400).optional(),
  })
  .refine(
    (data) =>
      data.primaryProvider === undefined ||
      data.secondaryProvider === undefined ||
      data.secondaryProvider === null ||
      data.primaryProvider !== data.secondaryProvider,
    { message: "Provedor primário e secundário devem ser diferentes." },
  );

export type WorkerUpdateInput = z.infer<typeof workerUpdateSchema>;
