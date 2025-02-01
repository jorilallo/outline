import { NotificationEventType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Notification, User } from "@server/models";
import { DocumentUserEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";

export default class DocumentAddUserNotificationsTask extends BaseTask<DocumentUserEvent> {
  public async perform(event: DocumentUserEvent) {
    const recipient = await User.findByPk(event.userId);
    if (
      !recipient ||
      recipient.isSuspended ||
      !recipient.subscribedToEventType(NotificationEventType.AddUserToDocument)
    ) {
      return;
    }

    const hasHigherPermission = await recipient.hasHigherDocumentPermission({
      documentId: event.documentId,
      permission: event.data.permission!,
      skipMembershipId: event.modelId,
    });

    if (hasHigherPermission) {
      Logger.debug(
        "task",
        `Suppressing notification for user ${event.userId} as they are already a member of the document`,
        {
          documentId: event.documentId,
          userId: event.userId,
        }
      );
      return;
    }

    await Notification.create({
      event: NotificationEventType.AddUserToDocument,
      userId: event.userId,
      actorId: event.actorId,
      teamId: event.teamId,
      documentId: event.documentId,
      membershipId: event.modelId,
    });
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
