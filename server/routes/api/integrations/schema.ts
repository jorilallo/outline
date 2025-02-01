import { z } from "zod";
import {
  IntegrationService,
  IntegrationType,
  UserCreatableIntegrationService,
} from "@shared/types";
import { MattermostIntegrationSettingsSchema } from "@shared/zod";
import { Integration } from "@server/models";
import { BaseSchema } from "../schema";

export const IntegrationsListSchema = BaseSchema.extend({
  body: z.object({
    /** Integrations sorting direction */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    /** Integrations sorting column */
    sort: z
      .string()
      .refine((val) => Object.keys(Integration.getAttributes()).includes(val), {
        message: "Invalid sort parameter",
      })
      .default("updatedAt"),

    /** Integration type */
    type: z.nativeEnum(IntegrationType).optional(),

    /** Integration service */
    service: z.nativeEnum(IntegrationService).optional(),
  }),
});

export type IntegrationsListReq = z.infer<typeof IntegrationsListSchema>;

export const IntegrationsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Integration type */
    type: z.nativeEnum(IntegrationType),

    /** Integration service */
    service: z.nativeEnum(UserCreatableIntegrationService),

    /** Integration access token (or) api key */
    accessToken: z.string().optional(),

    /** Integration refresh token */
    refreshToken: z.string().optional(),

    /** Integration config/settings */
    settings: MattermostIntegrationSettingsSchema.or(
      z.object({ url: z.string().url() })
    )
      .or(
        z.object({
          url: z.string().url(),
          channel: z.string(),
          channelId: z.string(),
        })
      )
      .or(
        z.object({
          measurementId: z.string(),
          instanceUrl: z.string().url().optional(),
          scriptName: z.string().optional(),
        })
      )
      .or(z.object({ serviceTeamId: z.string() }))
      .optional(),
  }),
});

export type IntegrationsCreateReq = z.infer<typeof IntegrationsCreateSchema>;

export const IntegrationsUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Id of integration that needs update */
    id: z.string().uuid(),

    /** Integration config/settings */
    settings: z
      .object({ url: z.string().url() })
      .or(
        z.object({
          url: z.string().url(),
          channel: z.string(),
          channelId: z.string(),
        })
      )
      .or(
        z.object({
          measurementId: z.string(),
          instanceUrl: z.string().url().optional(),
          scriptName: z.string().optional(),
        })
      )
      .or(z.object({ serviceTeamId: z.string() }))
      .optional(),

    /** Integration events */
    events: z.array(z.string()).optional().default([]),
  }),
});

export type IntegrationsUpdateReq = z.infer<typeof IntegrationsUpdateSchema>;

export const IntegrationsInfoSchema = BaseSchema.extend({
  body: z.object({
    /** Id of integration to find */
    id: z.string().uuid(),
  }),
});

export type IntegrationsInfoReq = z.infer<typeof IntegrationsInfoSchema>;

export const IntegrationsDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Id of integration to be deleted */
    id: z.string().uuid(),
  }),
});

export type IntegrationsDeleteReq = z.infer<typeof IntegrationsDeleteSchema>;
