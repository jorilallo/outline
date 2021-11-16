import mailer from "../../mailer";
import { View, NotificationSetting } from "../../models";
import {
  buildDocument,
  buildCollection,
  buildUser,
} from "../../test/factories";
import { flushdb } from "../../test/support";
import NotificationsService from "./notifications";

jest.mock("../../mailer");
const Notifications = new NotificationsService();
beforeEach(() => flushdb());
beforeEach(jest.resetAllMocks);
describe("documents.publish", () => {
  test("should not send a notification to author", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      lastModifiedById: user.id,
    });
    await NotificationSetting.create({
      userId: user.id,
      teamId: user.teamId,
      event: "documents.publish",
    });
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ name: "documents.publish"; doc... Remove this comment to see the full error message
    await Notifications.on({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
    });
    expect(mailer.documentNotification).not.toHaveBeenCalled();
  });
  test("should send a notification to other users in team", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
    });
    await NotificationSetting.create({
      userId: user.id,
      teamId: user.teamId,
      event: "documents.publish",
    });
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ name: "documents.publish"; doc... Remove this comment to see the full error message
    await Notifications.on({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
    });
    expect(mailer.documentNotification).toHaveBeenCalled();
  });
  test("should not send a notification to users without collection access", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      permission: null,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
    });
    await NotificationSetting.create({
      userId: user.id,
      teamId: user.teamId,
      event: "documents.publish",
    });
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ name: "documents.publish"; doc... Remove this comment to see the full error message
    await Notifications.on({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
    });
    expect(mailer.documentNotification).not.toHaveBeenCalled();
  });
});
describe("revisions.create", () => {
  test("should send a notification to other collaborators", async () => {
    const document = await buildDocument();
    const collaborator = await buildUser({
      teamId: document.teamId,
    });
    document.collaboratorIds = [collaborator.id];
    await document.save();
    await NotificationSetting.create({
      userId: collaborator.id,
      teamId: collaborator.teamId,
      event: "documents.update",
    });
    await Notifications.on({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ name: "revisions.create"; docu... Remove this comment to see the full error message
      actorId: document.createdById,
    });
    expect(mailer.documentNotification).toHaveBeenCalled();
  });
  test("should not send a notification if viewed since update", async () => {
    const document = await buildDocument();
    const collaborator = await buildUser({
      teamId: document.teamId,
    });
    document.collaboratorIds = [collaborator.id];
    await document.save();
    await NotificationSetting.create({
      userId: collaborator.id,
      teamId: collaborator.teamId,
      event: "documents.update",
    });
    await View.touch(document.id, collaborator.id, true);
    await Notifications.on({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ name: "revisions.create"; docu... Remove this comment to see the full error message
      actorId: document.createdById,
    });
    expect(mailer.documentNotification).not.toHaveBeenCalled();
  });
  test("should not send a notification to last editor", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      lastModifiedById: user.id,
    });
    await NotificationSetting.create({
      userId: user.id,
      teamId: user.teamId,
      event: "documents.update",
    });
    await Notifications.on({
      name: "revisions.create",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ name: "revisions.create"; docu... Remove this comment to see the full error message
      actorId: document.createdById,
    });
    expect(mailer.documentNotification).not.toHaveBeenCalled();
  });
});
