// @flow
import path from "path";
import Router from "koa-router";
import { parseDomain, isCustomSubdomain } from "../../shared/utils/domains";
import { signin } from "../../shared/utils/routeHelpers";
import auth from "../middlewares/authentication";
import { Team } from "../models";
import { presentUser, presentTeam, presentPolicies } from "../presenters";
import { isCustomDomain } from "../utils/domains";
import { requireDirectory } from "../utils/fs";

const router = new Router();
let services = [];

requireDirectory(path.join(__dirname, "..", "auth")).forEach(
  ([{ config }, id]) => {
    if (config && config.enabled) {
      services.push({
        id,
        name: config.name,
        authUrl: signin(id),
      });
    }
  }
);

function filterServices(team) {
  const providerNames = team
    ? team.authenticationProviders.map((provider) => provider.name)
    : [];

  return services.filter((service) => {
    // guest sign-in is an exception as it does not have an authentication
    // provider using passport, instead it exists as a boolean option on the team
    if (service.id === "email") {
      return team && team.guestSignin;
    }

    return !team || providerNames.includes(service.id);
  });
}

router.post("auth.config", async (ctx) => {
  // If self hosted AND there is only one team then that team becomes the
  // brand for the knowledge base and it's guest signin option is used for the
  // root login page.
  if (process.env.DEPLOYMENT !== "hosted") {
    const teams = await Team.scope("withAuthenticationProviders").findAll();

    if (teams.length === 1) {
      const team = teams[0];
      ctx.body = {
        data: {
          name: team.name,
          services: filterServices(team),
        },
      };
      return;
    }
  }

  if (isCustomDomain(ctx.request.hostname)) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: { domain: ctx.request.hostname },
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          hostname: ctx.request.hostname,
          services: filterServices(team),
        },
      };
      return;
    }
  }

  // If subdomain signin page then we return minimal team details to allow
  // for a custom screen showing only relevant signin options for that team.
  if (
    process.env.SUBDOMAINS_ENABLED === "true" &&
    isCustomSubdomain(ctx.request.hostname) &&
    !isCustomDomain(ctx.request.hostname)
  ) {
    const domain = parseDomain(ctx.request.hostname);
    const subdomain = domain ? domain.subdomain : undefined;
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: { subdomain },
    });

    if (team) {
      ctx.body = {
        data: {
          name: team.name,
          hostname: ctx.request.hostname,
          services: filterServices(team),
        },
      };
      return;
    }
  }

  // Otherwise, we're requesting from the standard root signin page
  ctx.body = {
    data: {
      services: filterServices(),
    },
  };
});

router.post("auth.info", auth(), async (ctx) => {
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);

  ctx.body = {
    data: {
      user: presentUser(user, { includeDetails: true }),
      team: presentTeam(team),
    },
    policies: presentPolicies(user, [team]),
  };
});

export default router;
