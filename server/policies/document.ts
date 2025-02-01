import invariant from "invariant";
import filter from "lodash/filter";
import { DocumentPermission, TeamPreference } from "@shared/types";
import { Document, Revision, User, Team } from "@server/models";
import { allow, cannot, can } from "./cancan";
import { and, isTeamAdmin, isTeamModel, isTeamMutable, or } from "./utils";

allow(User, "createDocument", Team, (actor, document) =>
  and(
    //
    !actor.isGuest,
    !actor.isViewer,
    isTeamModel(actor, document),
    isTeamMutable(actor)
  )
);

allow(User, "read", Document, (actor, document) =>
  and(
    isTeamModel(actor, document),
    or(
      includesMembership(document, [
        DocumentPermission.Read,
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      and(!!document?.isDraft, actor.id === document?.createdById),
      and(
        !!document?.isWorkspaceTemplate,
        can(actor, "readTemplate", actor.team)
      ),
      can(actor, "readDocument", document?.collection),
      // Archived documents can be detached when the containing collection is deleted
      and(
        !!document?.isArchived,
        !document?.collectionId,
        or(
          actor.id === document?.createdById,
          can(actor, "readDocument", actor.team)
        )
      )
    )
  )
);

allow(User, ["listRevisions", "listViews"], Document, (actor, document) =>
  or(
    and(can(actor, "read", document), !actor.isGuest),
    and(can(actor, "update", document), actor.isGuest)
  )
);

allow(User, "download", Document, (actor, document) =>
  and(
    can(actor, "read", document),
    or(
      and(!actor.isGuest, !actor.isViewer),
      !!actor.team.getPreference(TeamPreference.ViewersCanExport)
    )
  )
);

allow(User, "comment", Document, (actor, document) =>
  and(
    // TODO: We'll introduce a separate permission for commenting
    or(
      and(can(actor, "read", document), !actor.isGuest),
      and(can(actor, "update", document), actor.isGuest)
    ),
    isTeamMutable(actor),
    !!document?.isActive,
    !document?.template
  )
);

allow(
  User,
  ["star", "unstar", "subscribe", "unsubscribe"],
  Document,
  (actor, document) =>
    and(
      //
      can(actor, "read", document),
      !document?.template
    )
);

allow(User, "share", Document, (actor, document) =>
  and(
    can(actor, "read", document),
    isTeamMutable(actor),
    !!document?.isActive,
    !document?.template,
    or(!document?.collection, can(actor, "share", document?.collection))
  )
);

allow(User, "update", Document, (actor, document) =>
  and(
    can(actor, "read", document),
    isTeamMutable(actor),
    !!document?.isActive,
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      or(
        can(actor, "updateDocument", document?.collection),
        and(!!document?.isDraft && actor.id === document?.createdById),
        and(
          !!document?.isWorkspaceTemplate,
          or(
            actor.id === document?.createdById,
            can(actor, "updateTemplate", actor.team)
          )
        )
      )
    )
  )
);

allow(User, "publish", Document, (actor, document) =>
  and(
    //
    can(actor, "update", document),
    !!document?.isDraft
  )
);

allow(User, "manageUsers", Document, (actor, document) =>
  and(
    !document?.template,
    can(actor, "update", document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      can(actor, "updateDocument", document?.collection),
      !!document?.isDraft && actor.id === document?.createdById
    )
  )
);

allow(User, "duplicate", Document, (actor, document) =>
  and(
    can(actor, "update", document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      can(actor, "updateDocument", document?.collection),
      !!document?.isDraft && actor.id === document?.createdById,
      and(
        !!document?.isWorkspaceTemplate,
        or(
          actor.id === document?.createdById,
          can(actor, "updateTemplate", actor.team)
        )
      )
    )
  )
);

allow(User, "move", Document, (actor, document) =>
  and(
    can(actor, "update", document),
    or(
      can(actor, "updateDocument", document?.collection),
      and(!!document?.isDraft && actor.id === document?.createdById),
      and(
        !!document?.isWorkspaceTemplate,
        or(
          actor.id === document?.createdById,
          can(actor, "updateTemplate", actor.team)
        )
      )
    )
  )
);

allow(User, "createChildDocument", Document, (actor, document) =>
  and(can(actor, "update", document), !document?.isDraft, !document?.template)
);

allow(User, ["updateInsights", "pin", "unpin"], Document, (actor, document) =>
  and(
    can(actor, "update", document),
    can(actor, "update", document?.collection),
    !document?.isDraft,
    !document?.template,
    !actor.isGuest
  )
);

allow(User, "pinToHome", Document, (actor, document) =>
  and(
    //
    isTeamAdmin(actor, document),
    isTeamMutable(actor),
    !document?.isDraft,
    !document?.template,
    !!document?.isActive
  )
);

allow(User, "delete", Document, (actor, document) =>
  and(
    isTeamModel(actor, document),
    isTeamMutable(actor),
    !document?.isDeleted,
    or(
      can(actor, "unarchive", document),
      can(actor, "update", document),
      and(!document?.isWorkspaceTemplate, !document?.collection)
    )
  )
);

allow(User, ["restore", "permanentDelete"], Document, (actor, document) =>
  and(
    isTeamModel(actor, document),
    !actor.isGuest,
    !!document?.isDeleted,
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      can(actor, "updateDocument", document?.collection),
      and(!!document?.isDraft && actor.id === document?.createdById),
      and(
        !!document?.isWorkspaceTemplate,
        can(actor, "updateTemplate", actor.team)
      ),
      !document?.collection
    )
  )
);

allow(User, "archive", Document, (actor, document) =>
  and(
    !document?.template,
    !document?.isDraft,
    !!document?.isActive,
    can(actor, "update", document),
    or(
      includesMembership(document, [DocumentPermission.Admin]),
      can(actor, "updateDocument", document?.collection)
    )
  )
);

allow(User, "unarchive", Document, (actor, document) =>
  and(
    !document?.template,
    !document?.isDraft,
    !document?.isDeleted,
    !!document?.isArchived,
    can(actor, "read", document),
    or(
      includesMembership(document, [
        DocumentPermission.ReadWrite,
        DocumentPermission.Admin,
      ]),
      can(actor, "updateDocument", document?.collection),
      and(!!document?.isDraft && actor.id === document?.createdById),
      // Archived documents can be detached when the containing collection is deleted
      and(
        !document?.collectionId,
        or(
          actor.id === document?.createdById,
          can(actor, "updateDocument", actor.team)
        )
      )
    )
  )
);

allow(
  Document,
  "restore",
  Revision,
  (document, revision) => document.id === revision?.documentId
);

allow(User, "unpublish", Document, (user, document) => {
  if (
    !document ||
    user.isGuest ||
    user.isViewer ||
    !document.isActive ||
    document.isDraft
  ) {
    return false;
  }

  if (
    document.isWorkspaceTemplate &&
    (user.id === document.createdById || can(user, "updateTemplate", user.team))
  ) {
    return true;
  }

  invariant(
    document.collection,
    "collection is missing, did you forget to include in the query scope?"
  );
  if (cannot(user, "updateDocument", document.collection)) {
    return false;
  }
  return user.teamId === document.teamId;
});

function includesMembership(
  document: Document | null,
  permissions: DocumentPermission[]
) {
  if (!document) {
    return false;
  }

  invariant(
    document.memberships,
    "Development: document memberships should be preloaded, did you forget withMembership scope?"
  );
  invariant(
    document.groupMemberships,
    "Development: document groupMemberships should be preloaded, did you forget withMembership scope?"
  );

  const membershipIds = filter(
    [...document.memberships, ...document.groupMemberships],
    (m) => permissions.includes(m.permission as DocumentPermission)
  ).map((m) => m.id);

  return membershipIds.length > 0 ? membershipIds : false;
}
