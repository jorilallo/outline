import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const MattermostGetUserTeamsSchema = BaseSchema.extend({
  body: z.object({
    url: z.string().url(),
    apiKey: z.string(),
  }),
});

export type MattermostGetUserTeamsReq = z.infer<
  typeof MattermostGetUserTeamsSchema
>;
