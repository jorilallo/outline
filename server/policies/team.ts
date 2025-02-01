import { Team, User } from "@server/models";
import { allow } from "./cancan";
import {
  and,
  isCloudHosted,
  isTeamAdmin,
  isTeamModel,
  isTeamMutable,
  or,
} from "./utils";

allow(User, "read", Team, isTeamModel);

allow(User, "share", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    !actor.isGuest,
    !actor.isViewer,
    !!team?.sharing
  )
);

allow(User, "createTeam", Team, (actor, team) =>
  and(
    //
    isCloudHosted(),
    !actor.isGuest,
    !actor.isViewer,
    or(actor.isAdmin, !!team?.memberTeamCreate)
  )
);

allow(User, "update", Team, isTeamAdmin);

allow(User, ["delete", "audit"], Team, (actor, team) =>
  and(
    //
    isCloudHosted(),
    isTeamAdmin(actor, team)
  )
);

allow(User, "createTemplate", Team, (actor, team) =>
  and(
    //
    !actor.isGuest,
    !actor.isViewer,
    isTeamModel(actor, team),
    isTeamMutable(actor)
  )
);

allow(User, "readDocument", Team, (actor, team) => isTeamAdmin(actor, team));

allow(User, "readTemplate", Team, (actor, team) =>
  and(!actor.isViewer, isTeamModel(actor, team))
);

allow(User, ["updateDocument", "updateTemplate"], Team, (actor, team) =>
  and(isTeamAdmin(actor, team), isTeamMutable(actor))
);
