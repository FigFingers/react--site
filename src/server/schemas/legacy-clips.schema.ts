import { z } from "zod";

export const legacyClipCreateBodySchema = z
  .object({
    clipName: z.string().trim().min(1).max(255).optional(),
    service: z.string().trim().min(1),
    StartTime: z.number().finite().min(0),
    EndTime: z.number().finite().min(0),
    URL: z.string().trim().min(1),
    title: z.string().trim().min(1),
    epnumber: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((data) => data.EndTime > data.StartTime, {
    path: ["EndTime"],
    message: "EndTime must be greater than StartTime",
  });

export type LegacyClipCreateBody = z.infer<typeof legacyClipCreateBodySchema>;
