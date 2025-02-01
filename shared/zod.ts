import { z } from "zod";

export const MattermostIntegrationSettingsSchema = z.object({
  url: z.string().url(),
  team: z.object({
    id: z.string(),
    name: z.string(),
  }),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
});

export type MattermostIntegrationSettings = z.infer<
  typeof MattermostIntegrationSettingsSchema
>;
