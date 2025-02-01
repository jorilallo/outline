import crypto from "crypto";
import type {
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
} from "sequelize";
import {
  Table,
  ForeignKey,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  BelongsTo,
  DataType,
  Default,
  AllowNull,
  Scopes,
  AfterCreate,
  DefaultScope,
} from "sequelize-typescript";
import { NotificationEventType } from "@shared/types";
import { getBaseDomain } from "@shared/utils/domains";
import env from "@server/env";
import Model from "@server/models/base/Model";
import Collection from "./Collection";
import Comment from "./Comment";
import Document from "./Document";
import Event from "./Event";
import Revision from "./Revision";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";

let baseDomain;

@Scopes(() => ({
  withTeam: {
    include: [
      {
        association: "team",
      },
    ],
  },
  withDocument: {
    include: [
      {
        association: "document",
      },
    ],
  },
  withComment: {
    include: [
      {
        association: "comment",
      },
    ],
  },
  withActor: {
    include: [
      {
        association: "actor",
      },
    ],
  },
  withUser: {
    include: [
      {
        association: "user",
      },
    ],
  },
}))
@DefaultScope(() => ({
  include: [
    {
      association: "document",
      required: false,
    },
    {
      association: "comment",
      required: false,
    },
    {
      association: "actor",
      required: false,
    },
  ],
}))
@Table({
  tableName: "notifications",
  modelName: "notification",
  updatedAt: false,
})
@Fix
class Notification extends Model<
  InferAttributes<Notification>,
  Partial<InferCreationAttributes<Notification>>
> {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @AllowNull
  @Column
  emailedAt?: Date | null;

  @AllowNull
  @Column
  viewedAt: Date | null;

  @AllowNull
  @Column
  archivedAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @Column(DataType.STRING)
  event: NotificationEventType;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "actorId")
  actor: User;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  actorId: string;

  @BelongsTo(() => Comment, "commentId")
  comment: Comment;

  @AllowNull
  @ForeignKey(() => Comment)
  @Column(DataType.UUID)
  commentId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @AllowNull
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Revision, "revisionId")
  revision: Revision;

  @AllowNull
  @ForeignKey(() => Revision)
  @Column(DataType.UUID)
  revisionId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @AllowNull
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @AllowNull
  @Column(DataType.UUID)
  membershipId: string;

  @AfterCreate
  static async createEvent(
    model: Notification,
    options: SaveOptions<InferAttributes<Notification>>
  ) {
    const params = {
      name: "notifications.create",
      userId: model.userId,
      modelId: model.id,
      teamId: model.teamId,
      commentId: model.commentId,
      documentId: model.documentId,
      collectionId: model.collectionId,
      actorId: model.actorId,
      membershipId: model.membershipId,
    };

    if (options.transaction) {
      options.transaction.afterCommit(() => void Event.schedule(params));
      return;
    }
    await Event.schedule(params);
  }

  /**
   * Returns a token that can be used to mark this notification as read
   * without being logged in.
   *
   * @returns A string token
   */
  public get pixelToken() {
    const hash = crypto.createHash("sha256");
    hash.update(`${this.id}-${env.SECRET_KEY}`);
    return hash.digest("hex");
  }

  /**
   * Returns a URL that can be used to mark this notification as read
   * without being logged in.
   *
   * @returns A URL
   */
  public get pixelUrl() {
    return `${env.URL}/api/notifications.pixel?token=${this.pixelToken}&id=${this.id}`;
  }

  /**
   * Returns the message id for the email.
   *
   * @param name Username part of the email address.
   * @returns Email message id.
   */
  public static emailMessageId(name: string) {
    baseDomain ||= getBaseDomain();
    return `<${name}@${baseDomain}>`;
  }

  /**
   * Returns the message reference id which will be used to setup the thread chain in email clients.
   *
   * @param notification Notification for which to determine the reference id.
   * @returns Reference id as an array.
   */
  public static async emailReferences(
    notification: Notification
  ): Promise<string[] | undefined> {
    let name: string | undefined;

    switch (notification.event) {
      case NotificationEventType.PublishDocument:
      case NotificationEventType.UpdateDocument:
        name = `${notification.documentId}-updates`;
        break;
      case NotificationEventType.MentionedInDocument:
      case NotificationEventType.MentionedInComment:
        name = `${notification.documentId}-mentions`;
        break;
      case NotificationEventType.CreateComment: {
        const comment = await Comment.findByPk(notification.commentId);
        name = `${comment?.parentCommentId ?? comment?.id}-comments`;
        break;
      }
    }

    return name ? [this.emailMessageId(name)] : undefined;
  }
}

export default Notification;
