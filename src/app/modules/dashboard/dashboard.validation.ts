import { z } from "zod";

export const rangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export type TRangeQuery = z.infer<typeof rangeQuerySchema>;
