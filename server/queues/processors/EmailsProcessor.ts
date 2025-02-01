import { NotificationEventType } from "@shared/types";
import { Minute } from "@shared/utils/time";
import CollectionCreatedEmail from "@server/emails/templates/CollectionCreatedEmail";
import CollectionSharedEmail from "@server/emails/templates/CollectionSharedEmail";
import CommentCreatedEmail from "@server/emails/templates/CommentCreatedEmail";
import CommentMentionedEmail from "@server/emails/templates/CommentMentionedEmail";
import CommentResolvedEmail from "@server/emails/templates/CommentResolvedEmail";
import DocumentMentionedEmail from "@server/emails/templates/DocumentMentionedEmail";
import DocumentPublishedOrUpdatedEmail from "@server/emails/templates/DocumentPublishedOrUpdatedEmail";
import DocumentSharedEmail from "@server/emails/templates/DocumentSharedEmail";
import { Notification } from "@server/models";
import { Event, NotificationEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class EmailsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["notifications.create"];

  async perform(event: NotificationEvent) {
    const notification = await Notification.scope([
      "withTeam",
      "withUser",
      "withActor",
    ]).findByPk(event.modelId);
    if (!notification) {
      return;
    }

    const notificationId = notification.id;

    if (notification.user.isSuspended) {
      return;
    }

    switch (notification.event) {
      case NotificationEventType.UpdateDocument:
      case NotificationEventType.PublishDocument: {
        // No need to delay email here as the notification itself is already delayed
        await new DocumentPublishedOrUpdatedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            eventType: notification.event,
            revisionId: notification.revisionId,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
          },
          { notificationId }
        ).schedule();
        return;
      }

      case NotificationEventType.AddUserToDocument: {
        await new DocumentSharedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            documentId: notification.documentId,
            membershipId: notification.membershipId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
          },
          { notificationId }
        ).schedule({
          delay: Minute.ms,
        });
        return;
      }

      case NotificationEventType.AddUserToCollection: {
        await new CollectionSharedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            collectionId: notification.collectionId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
          },
          { notificationId }
        ).schedule({
          delay: Minute.ms,
        });
        return;
      }

      case NotificationEventType.MentionedInDocument: {
        // No need to delay email here as the notification itself is already delayed
        await new DocumentMentionedEmail(
          {
            to: notification.user.email,
            documentId: notification.documentId,
            revisionId: notification.revisionId,
            userId: notification.userId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
          },
          { notificationId }
        ).schedule();
        return;
      }

      case NotificationEventType.MentionedInComment: {
        await new CommentMentionedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
            commentId: notification.commentId,
          },
          { notificationId: notification.id }
        ).schedule({
          delay: Minute.ms,
        });
        return;
      }

      case NotificationEventType.CreateCollection: {
        await new CollectionCreatedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            collectionId: notification.collectionId,
            teamUrl: notification.team.url,
          },
          { notificationId: notification.id }
        ).schedule({
          delay: Minute.ms,
        });
        return;
      }

      case NotificationEventType.CreateComment: {
        await new CommentCreatedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
            commentId: notification.commentId,
          },
          { notificationId: notification.id }
        ).schedule({
          delay: Minute.ms,
        });
        return;
      }

      case NotificationEventType.ResolveComment: {
        await new CommentResolvedEmail(
          {
            to: notification.user.email,
            userId: notification.userId,
            documentId: notification.documentId,
            teamUrl: notification.team.url,
            actorName: notification.actor.name,
            commentId: notification.commentId,
          },
          { notificationId: notification.id }
        ).schedule({
          delay: Minute.ms,
        });
      }
    }
  }
}
