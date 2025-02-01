import z from "zod";

export const server = z.object({
  url: z.string().url().startsWith("http"),
  apiKey: z.string().min(1),
});

export type Server = z.infer<typeof server>;
