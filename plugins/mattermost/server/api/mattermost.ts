import Router from "koa-router";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { APIContext } from "@server/types";
import { getUser, getUserTeams } from "../mattermost/client";
import * as T from "./schema";

const router = new Router();

router.post(
  "mattermost.user_teams",
  auth({ role: UserRole.Admin }),
  validate(T.MattermostGetUserTeamsSchema),
  async (ctx: APIContext<T.MattermostGetUserTeamsReq>) => {
    const { url, apiKey } = ctx.input.body;

    const [user, teams] = await Promise.all([
      getUser({ serverUrl: url, apiKey }),
      getUserTeams({ serverUrl: url, apiKey }),
    ]);

    ctx.body = {
      data: { user, teams },
    };
  }
);

export default router;
