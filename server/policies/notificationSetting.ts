import { NotificationSetting, Team, User } from "../models";
import policy from "./policy";

const { allow } = policy;
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
allow(User, "createNotificationSetting", Team, (user, team) => {
  if (!team || user.teamId !== team.id) return false;
  return true;
});
allow(
  User,
  ["read", "update", "delete"],
  NotificationSetting,
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'user' implicitly has an 'any' type.
  (user, setting) => user && user.id === setting.userId
);
