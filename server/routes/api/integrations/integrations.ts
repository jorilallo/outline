import Router from "koa-router";
import { WhereOptions, Op } from "sequelize";
import { IntegrationType, UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Event, IntegrationAuthentication } from "@server/models";
import Integration from "@server/models/Integration";
import { authorize } from "@server/policies";
import { presentIntegration, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "integrations.list",
  auth(),
  pagination(),
  validate(T.IntegrationsListSchema),
  async (ctx: APIContext<T.IntegrationsListReq>) => {
    const { direction, service, type, sort } = ctx.input.body;
    const { user } = ctx.state.auth;

    let where: WhereOptions<Integration> = {
      teamId: user.teamId,
    };
    if (type) {
      where = { ...where, type };
    }
    if (service) {
      where = { ...where, service };
    }

    // Linked account is special as these are user-specific, other integrations are workspace-wide.
    where = {
      ...where,
      [Op.or]: [
        { userId: user.id, type: IntegrationType.LinkedAccount },
        {
          type: {
            [Op.not]: IntegrationType.LinkedAccount,
          },
        },
      ],
    };

    const [integrations, total] = await Promise.all([
      await Integration.findAll({
        where,
        order: [[sort, direction]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Integration.count({
        where,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: integrations.map(presentIntegration),
      policies: presentPolicies(user, integrations),
    };
  }
);

router.post(
  "integrations.create",
  auth({ role: UserRole.Admin }),
  validate(T.IntegrationsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.IntegrationsCreateReq>) => {
    const { type, service, settings, accessToken, refreshToken } =
      ctx.input.body;

    const {
      auth: { user },
      transaction,
    } = ctx.state;

    authorize(user, "createIntegration", user.team);

    let authentication;

    // Create authentication data only if accessToken is present.
    // Not much use when only refreshToken is present.
    if (accessToken) {
      authentication = await IntegrationAuthentication.create(
        {
          service,
          token: accessToken,
          refreshToken,
          userId: user.id,
          teamId: user.teamId,
        },
        { transaction }
      );
    }

    const integration = await Integration.create(
      {
        type,
        service,
        settings,
        authenticationId: authentication?.id,
        userId: user.id,
        teamId: user.teamId,
      },
      { transaction }
    );

    ctx.body = {
      data: presentIntegration(integration),
      policies: presentPolicies(user, [integration]),
    };
  }
);

router.post(
  "integrations.info",
  auth(),
  validate(T.IntegrationsInfoSchema),
  async (ctx: APIContext<T.IntegrationsInfoReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;

    const integration = await Integration.findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "read", integration);

    ctx.body = {
      data: presentIntegration(integration),
      policies: presentPolicies(user, [integration]),
    };
  }
);

router.post(
  "integrations.update",
  auth({ role: UserRole.Admin }),
  validate(T.IntegrationsUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.IntegrationsUpdateReq>) => {
    const { id, events, settings } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const integration = await Integration.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "update", integration);

    if (integration.type === IntegrationType.Post) {
      integration.events = events.filter((event: string) =>
        ["documents.update", "documents.publish"].includes(event)
      );
    }

    integration.settings = settings;

    await integration.save({ transaction });

    ctx.body = {
      data: presentIntegration(integration),
      policies: presentPolicies(user, [integration]),
    };
  }
);

router.post(
  "integrations.delete",
  auth(),
  validate(T.IntegrationsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.IntegrationsDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const integration = await Integration.findByPk(id, {
      rejectOnEmpty: true,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", integration);

    await integration.destroy({ transaction });

    await Event.createFromContext(ctx, {
      name: "integrations.delete",
      modelId: integration.id,
    });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
