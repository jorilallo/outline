import { InternalError, InvalidRequestError } from "@server/errors";
import { Team, User } from "../../shared/types";

const Endpoints = {
  User: "/api/v4/users/me",
  UserTeams: "/api/v4/users/me/teams",
};

export const getUser = async ({
  serverUrl,
  apiKey,
}: {
  serverUrl: string;
  apiKey: string;
}): Promise<User> =>
  getDataFromMattermost<User>({
    url: `${serverUrl}${Endpoints.User}`,
    apiKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseResponse: (data: any) => ({
      id: data.id,
      name: data.username,
      email: data.email,
    }),
  });

export const getUserTeams = async ({
  serverUrl,
  apiKey,
}: {
  serverUrl: string;
  apiKey: string;
}): Promise<Team[]> =>
  getDataFromMattermost<Team[]>({
    url: `${serverUrl}${Endpoints.UserTeams}`,
    apiKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseResponse: (data: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.map((team: any) => ({ id: team.id, name: team.display_name })),
  });

const getDataFromMattermost = async <T>({
  url,
  apiKey,
  parseResponse,
}: {
  url: string;
  apiKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseResponse: (json: any) => T;
}) => {
  let res: Response;

  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (err) {
    throw InternalError();
  }

  if (res.ok) {
    return parseResponse(await res.json());
  } else if (res.status >= 400 && res.status < 500) {
    throw InvalidRequestError();
  } else {
    throw InternalError();
  }
};
