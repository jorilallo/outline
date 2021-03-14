// @flow
import { AdminRequiredError } from "../errors";
import { Integration, User } from "../models";
import policy from "./policy";

const { allow } = policy;

allow(User, "create", Integration, (user) => !user.isViewer);

allow(
  User,
  "read",
  Integration,
  (user, integration) => user.teamId === integration.teamId
);

allow(User, ["update", "delete"], Integration, (user, integration) => {
  if (user.isViewer) return false;
  if (!integration || user.teamId !== integration.teamId) return false;
  if (user.isAdmin) return true;
  throw new AdminRequiredError();
});
