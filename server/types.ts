import { ParameterizedContext, DefaultContext } from "koa";
import { IRouterParamContext } from "koa-router";
import { InferAttributes, Model, Transaction } from "sequelize";
import { z } from "zod";
import {
  CollectionSort,
  NavigationNode,
  Client,
  CollectionPermission,
  JSONValue,
  UnfurlResourceType,
  ProsemirrorData,
} from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";
import { AccountProvisionerResult } from "./commands/accountProvisioner";
import type {
  ApiKey,
  Attachment,
  AuthenticationProvider,
  FileOperation,
  Revision,
  Team,
  User,
  UserMembership,
  WebhookSubscription,
  Pin,
  Star,
  Document,
  Collection,
  Group,
  Integration,
  Comment,
  Subscription,
  View,
  Notification,
  Share,
  GroupMembership,
} from "./models";

export enum AuthenticationType {
  API = "api",
  APP = "app",
}

export type AuthenticationResult = AccountProvisionerResult & {
  client: Client;
};

export type Authentication = {
  user: User;
  token?: string;
  type?: AuthenticationType;
};

export type Pagination = {
  limit: number;
  offset: number;
  nextPath: string;
};

export type AppState = {
  auth: Authentication | Record<string, never>;
  transaction: Transaction;
  pagination: Pagination;
};

export type AppContext = ParameterizedContext<AppState, DefaultContext>;

export type BaseReq = z.infer<typeof BaseSchema>;

export type BaseRes = unknown;

export interface APIContext<ReqT = BaseReq, ResT = BaseRes>
  extends ParameterizedContext<
    AppState,
    DefaultContext & IRouterParamContext<AppState>,
    ResT
  > {
  /** Typed and validated version of request, consisting of validated body, query, etc. */
  input: ReqT;

  /** The current request's context, which is passed to database mutations. */
  context: {
    transaction?: Transaction;
    auth: Authentication;
    ip?: string;
  };
}

type BaseEvent<T extends Model> = {
  teamId: string;
  actorId: string;
  ip: string | null;
  authType?: AuthenticationType | null;
  changes?: {
    attributes: Partial<InferAttributes<T>>;
    previous: Partial<InferAttributes<T>>;
  } | null;
};

export type ApiKeyEvent = BaseEvent<ApiKey> & {
  name: "api_keys.create" | "api_keys.delete";
  modelId: string;
  data: {
    name: string;
  };
};

export type AttachmentEvent = BaseEvent<Attachment> &
  (
    | {
        name: "attachments.create";
        modelId: string;
        data: {
          name: string;
          source?: "import";
        };
      }
    | {
        name: "attachments.update";
        modelId: string;
      }
    | {
        name: "attachments.delete";
        modelId: string;
        data: {
          name: string;
        };
      }
  );

export type AuthenticationProviderEvent = BaseEvent<AuthenticationProvider> & {
  name: "authenticationProviders.update";
  modelId: string;
  data: {
    enabled: boolean;
  };
};

export type UserEvent = BaseEvent<User> &
  (
    | {
        name:
          | "users.signin"
          | "users.signout"
          | "users.update"
          | "users.suspend"
          | "users.activate"
          | "users.delete";
        userId: string;
      }
    | {
        name: "users.create" | "users.promote" | "users.demote";
        userId: string;
        data: {
          name: string;
        };
      }
    | {
        name: "users.invite";
        userId: string;
        data: {
          email: string;
          name: string;
        };
      }
  );

export type UserMembershipEvent = BaseEvent<UserMembership> & {
  name: "userMemberships.update";
  modelId: string;
  userId: string;
  documentId: string;
  data: {
    index: string | null;
  };
};

export type DocumentEvent = BaseEvent<Document> &
  (
    | {
        name:
          | "documents.create"
          | "documents.publish"
          | "documents.unpublish"
          | "documents.delete"
          | "documents.permanent_delete"
          | "documents.archive"
          | "documents.restore";
        documentId: string;
        collectionId: string;
        data: {
          title: string;
          source?: "import";
        };
      }
    | {
        name: "documents.unarchive";
        documentId: string;
        collectionId: string;
        data: {
          title: string;
          /** Id of collection from which the document is unarchived */
          sourceCollectionId: string;
        };
      }
    | {
        name: "documents.move";
        documentId: string;
        collectionId: string;
        data: {
          collectionIds: string[];
          documentIds: string[];
        };
      }
    | {
        name:
          | "documents.update"
          | "documents.update.delayed"
          | "documents.update.debounced";
        documentId: string;
        collectionId: string;
        createdAt: string;
        data: {
          title: string;
          autosave: boolean;
          done: boolean;
        };
      }
    | {
        name: "documents.title_change";
        documentId: string;
        collectionId: string;
        createdAt: string;
        data: {
          title: string;
          previousTitle: string;
        };
      }
  );

export type EmptyTrashEvent = {
  name: "documents.empty_trash";
  teamId: string;
  actorId: string;
};

export type RevisionEvent = BaseEvent<Revision> & {
  name: "revisions.create";
  documentId: string;
  collectionId: string;
  modelId: string;
};

export type FileOperationEvent = BaseEvent<FileOperation> & {
  name:
    | "fileOperations.create"
    | "fileOperations.update"
    | "fileOperations.delete";
  modelId: string;
  data: Partial<FileOperation>;
};

export type CollectionUserEvent = BaseEvent<UserMembership> & {
  name: "collections.add_user" | "collections.remove_user";
  userId: string;
  modelId: string;
  collectionId: string;
  data: {
    isNew?: boolean;
  };
};

export type CollectionGroupEvent = BaseEvent<GroupMembership> & {
  name: "collections.add_group" | "collections.remove_group";
  collectionId: string;
  modelId: string;
  data: { membershipId: string };
};

export type DocumentUserEvent = BaseEvent<UserMembership> & {
  name: "documents.add_user" | "documents.remove_user";
  userId: string;
  modelId: string;
  documentId: string;
  data: {
    isNew?: boolean;
  };
};

export type DocumentGroupEvent = BaseEvent<GroupMembership> & {
  name: "documents.add_group" | "documents.remove_group";
  documentId: string;
  modelId: string;
  data: {
    isNew?: boolean;
    membershipId: string;
  };
};

export type CollectionEvent = BaseEvent<Collection> &
  (
    | {
        name: "collections.create";
        collectionId: string;
        data: {
          name: string;
          source?: "import";
        };
      }
    | {
        name:
          | "collections.update"
          | "collections.delete"
          | "collections.archive"
          | "collections.restore";
        collectionId: string;
        data: {
          name: string;
          archivedAt: string;
        };
      }
    | {
        name: "collections.move";
        collectionId: string;
        data: {
          index: string;
        };
      }
    | {
        name: "collections.permission_changed";
        collectionId: string;
        data: {
          privacyChanged: boolean;
          sharingChanged: boolean;
        };
      }
  );

export type GroupUserEvent = BaseEvent<UserMembership> & {
  name: "groups.add_user" | "groups.remove_user";
  userId: string;
  modelId: string;
};

export type GroupEvent = BaseEvent<Group> &
  (
    | GroupUserEvent
    | {
        name: "groups.create" | "groups.delete" | "groups.update";
        modelId: string;
      }
  );

export type IntegrationEvent = BaseEvent<Integration> & {
  name: "integrations.create" | "integrations.update" | "integrations.delete";
  modelId: string;
};

export type TeamEvent = BaseEvent<Team> & {
  name: "teams.create" | "teams.update" | "teams.delete" | "teams.destroy";
};

export type PinEvent = BaseEvent<Pin> & {
  name: "pins.create" | "pins.update" | "pins.delete";
  modelId: string;
  documentId: string;
  collectionId?: string;
};

export type CommentUpdateEvent = BaseEvent<Comment> & {
  name: "comments.update";
  modelId: string;
  documentId: string;
  actorId: string;
  data?: {
    newMentionIds: string[];
  };
};

export type CommentReactionEvent = BaseEvent<Comment> & {
  name: "comments.add_reaction" | "comments.remove_reaction";
  modelId: string;
  documentId: string;
  data: {
    emoji: string;
  };
};

export type CommentEvent =
  | (BaseEvent<Comment> & {
      name: "comments.create";
      modelId: string;
      documentId: string;
      actorId: string;
    })
  | CommentUpdateEvent
  | (BaseEvent<Comment> & {
      name: "comments.delete";
      modelId: string;
      documentId: string;
      actorId: string;
      collectionId: string;
    })
  | CommentReactionEvent;

export type StarEvent = BaseEvent<Star> & {
  name: "stars.create" | "stars.update" | "stars.delete";
  modelId: string;
  documentId: string;
  userId: string;
};

export type ShareEvent = BaseEvent<Share> & {
  name: "shares.create" | "shares.update" | "shares.revoke";
  modelId: string;
  documentId: string;
  collectionId?: string;
};

export type SubscriptionEvent = BaseEvent<Subscription> & {
  name: "subscriptions.create" | "subscriptions.delete";
  modelId: string;
  userId: string;
  documentId: string | null;
};

export type ViewEvent = BaseEvent<View> & {
  name: "views.create";
  documentId: string;
  collectionId: string;
  modelId: string;
  data: {
    title: string;
  };
};

export type WebhookDeliveryStatus = "pending" | "success" | "failed";

export type WebhookSubscriptionEvent = BaseEvent<WebhookSubscription> & {
  name:
    | "webhookSubscriptions.create"
    | "webhookSubscriptions.delete"
    | "webhookSubscriptions.update";
  modelId: string;
  data: {
    name: string;
    url: string;
    events: string[];
  };
};

export type NotificationEvent = BaseEvent<Notification> & {
  name: "notifications.create" | "notifications.update";
  modelId: string;
  teamId: string;
  userId: string;
  actorId: string;
  commentId?: string;
  documentId?: string;
  collectionId?: string;
  membershipId?: string;
};

export type Event =
  | ApiKeyEvent
  | AttachmentEvent
  | AuthenticationProviderEvent
  | DocumentEvent
  | DocumentUserEvent
  | DocumentGroupEvent
  | PinEvent
  | CommentEvent
  | StarEvent
  | CollectionEvent
  | CollectionUserEvent
  | CollectionGroupEvent
  | FileOperationEvent
  | IntegrationEvent
  | GroupEvent
  | RevisionEvent
  | ShareEvent
  | SubscriptionEvent
  | TeamEvent
  | UserEvent
  | UserMembershipEvent
  | ViewEvent
  | WebhookSubscriptionEvent
  | NotificationEvent
  | EmptyTrashEvent;

export type NotificationMetadata = {
  notificationId?: string;
};

export type JSONExportMetadata = {
  /** The version of the export, allows updated structure in the future. */
  exportVersion: number;
  /** The version of the application that created the export. */
  version: string;
  /** The date the export was created. */
  createdAt: string;
  /** The ID of the user that created the export. */
  createdById: string;
  /** The email of the user that created the export. */
  createdByEmail: string | null;
};

export type DocumentJSONExport = {
  id: string;
  urlId: string;
  title: string;
  /**
   * For backward compatibility, maintain the `emoji` field.
   * Future exports will use the `icon` field.
   * */
  emoji?: string | null;
  icon: string | null;
  color: string | null;
  data: Record<string, any>;
  createdById: string;
  createdByName: string;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  fullWidth: boolean;
  template: boolean;
  parentDocumentId: string | null;
};

export type AttachmentJSONExport = {
  id: string;
  documentId: string | null;
  contentType: string;
  name: string;
  size: number;
  key: string;
};

export type CollectionJSONExport = {
  collection: {
    id: string;
    urlId: string;
    name: string;
    data?: ProsemirrorData | null;
    description?: ProsemirrorData | null;
    permission?: CollectionPermission | null;
    color?: string | null;
    icon?: string | null;
    sort: CollectionSort;
    documentStructure: NavigationNode[] | null;
  };
  documents: {
    [id: string]: DocumentJSONExport;
  };
  attachments: {
    [id: string]: AttachmentJSONExport;
  };
};

export type Unfurl = { [x: string]: JSONValue; type: UnfurlResourceType };

export type UnfurlSignature = (
  url: string,
  actor?: User
) => Promise<Unfurl | void>;

export type UninstallSignature = (integration: Integration) => Promise<void>;

export type Replace<T, K extends keyof T, N extends string> = {
  [P in keyof T as P extends K ? N : P]: T[P extends K ? K : P];
};
