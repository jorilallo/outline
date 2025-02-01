/* eslint-disable lines-between-class-members */
import find from "lodash/find";
import findIndex from "lodash/findIndex";
import remove from "lodash/remove";
import uniq from "lodash/uniq";
import {
  Identifier,
  Transaction,
  FindOptions,
  NonNullFindOptions,
  InferAttributes,
  InferCreationAttributes,
  EmptyResultError,
} from "sequelize";
import {
  Sequelize,
  Table,
  Column,
  Unique,
  IsIn,
  Default,
  BeforeValidate,
  BeforeSave,
  AfterCreate,
  HasMany,
  BelongsToMany,
  BelongsTo,
  ForeignKey,
  Scopes,
  DataType,
  Length as SimpleLength,
  BeforeDestroy,
  AllowNull,
} from "sequelize-typescript";
import isUUID from "validator/lib/isUUID";
import type { CollectionSort, ProsemirrorData } from "@shared/types";
import { CollectionPermission, NavigationNode } from "@shared/types";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { sortNavigationNodes } from "@shared/utils/collections";
import slugify from "@shared/utils/slugify";
import { CollectionValidation } from "@shared/validations";
import { ValidationError } from "@server/errors";
import { generateUrlId } from "@server/utils/url";
import Document from "./Document";
import FileOperation from "./FileOperation";
import Group from "./Group";
import GroupMembership from "./GroupMembership";
import GroupUser from "./GroupUser";
import Team from "./Team";
import User from "./User";
import UserMembership from "./UserMembership";
import ArchivableModel from "./base/ArchivableModel";
import Fix from "./decorators/Fix";
import { DocumentHelper } from "./helpers/DocumentHelper";
import IsHexColor from "./validators/IsHexColor";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

type AdditionalFindOptions = {
  rejectOnEmpty?: boolean | Error;
};

@Scopes(() => ({
  withAllMemberships: {
    include: [
      {
        model: UserMembership,
        as: "memberships",
        required: false,
      },
      {
        model: GroupMembership,
        as: "groupMemberships",
        required: false,
        // use of "separate" property: sequelize breaks when there are
        // nested "includes" with alternating values for "required"
        // see https://github.com/sequelize/sequelize/issues/9869
        separate: true,
        // include for groups that are members of this collection,
        // of which userId is a member of, resulting in:
        // GroupMembership [inner join] Group [inner join] GroupUser [where] userId
        include: [
          {
            model: Group,
            as: "group",
            required: true,
            include: [
              {
                model: GroupUser,
                as: "groupUsers",
                required: true,
              },
            ],
          },
        ],
      },
    ],
  },
  withUser: () => ({
    include: [
      {
        model: User,
        required: true,
        as: "user",
      },
    ],
  }),
  withArchivedBy: () => ({
    include: [
      {
        association: "archivedBy",
      },
    ],
  }),
  withMembership: (userId: string) => {
    if (!userId) {
      return {};
    }

    return {
      include: [
        {
          association: "memberships",
          where: {
            userId,
          },
          required: false,
        },
        {
          model: GroupMembership,
          as: "groupMemberships",
          required: false,
          // use of "separate" property: sequelize breaks when there are
          // nested "includes" with alternating values for "required"
          // see https://github.com/sequelize/sequelize/issues/9869
          separate: true,
          // include for groups that are members of this collection,
          // of which userId is a member of, resulting in:
          // CollectionGroup [inner join] Group [inner join] GroupUser [where] userId
          include: [
            {
              model: Group,
              as: "group",
              required: true,
              include: [
                {
                  model: GroupUser,
                  as: "groupUsers",
                  required: true,
                  where: {
                    userId,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  },
}))
@Table({ tableName: "collections", modelName: "collection" })
@Fix
class Collection extends ArchivableModel<
  InferAttributes<Collection>,
  Partial<InferCreationAttributes<Collection>>
> {
  @SimpleLength({
    min: 10,
    max: 10,
    msg: `urlId must be 10 characters`,
  })
  @Unique
  @Column
  urlId: string;

  @NotContainsUrl
  @Length({
    max: CollectionValidation.maxNameLength,
    msg: `name must be ${CollectionValidation.maxNameLength} characters or less`,
  })
  @Column
  name: string;

  /**
   * The content of the collection as Markdown.
   *
   * @deprecated Use `content` instead, or `DocumentHelper.toMarkdown` if exporting lossy markdown.
   * This column will be removed in a future migration.
   */
  @Length({
    max: CollectionValidation.maxDescriptionLength,
    msg: `description must be ${CollectionValidation.maxDescriptionLength} characters or less`,
  })
  @Column
  description: string | null;

  /**
   * The content of the collection as JSON, this is a snapshot at the last time the state was saved.
   */
  @Column(DataType.JSONB)
  content: ProsemirrorData | null;

  /** An icon (or) emoji to use as the collection icon. */
  @Length({
    max: 50,
    msg: `icon must be 50 characters or less`,
  })
  @Column
  icon: string | null;

  /** The color of the icon. */
  @IsHexColor
  @Column
  color: string | null;

  @Length({
    max: 256,
    msg: `index must be 256 characters or less`,
  })
  @Column
  index: string | null;

  @IsIn([Object.values(CollectionPermission)])
  @Column(DataType.STRING)
  permission: CollectionPermission | null;

  @Default(false)
  @Column
  maintainerApprovalRequired: boolean;

  @Column(DataType.JSONB)
  documentStructure: NavigationNode[] | null;

  @Default(true)
  @Column
  sharing: boolean;

  @Default({ field: "title", direction: "asc" })
  @Column({
    type: DataType.JSONB,
    validate: {
      isSort(value: CollectionSort) {
        if (
          typeof value !== "object" ||
          !value.direction ||
          !value.field ||
          Object.keys(value).length !== 2
        ) {
          throw new Error("Sort must be an object with field,direction");
        }

        if (!["asc", "desc"].includes(value.direction)) {
          throw new Error("Sort direction must be one of asc,desc");
        }

        if (!["title", "index"].includes(value.field)) {
          throw new Error("Sort field must be one of title,index");
        }
      },
    },
  })
  sort: CollectionSort;

  // getters

  /**
   * The frontend path to this collection.
   *
   * @deprecated Use `path` instead.
   */
  get url(): string {
    return this.path;
  }

  /** The frontend path to this collection. */
  get path(): string {
    if (!this.name) {
      return `/collection/untitled-${this.urlId}`;
    }
    return `/collection/${slugify(this.name)}-${this.urlId}`;
  }

  /**
   * Whether this collection is considered active or not. A collection is active if
   * it has not been archived or deleted.
   *
   * @returns boolean
   */
  get isActive(): boolean {
    return !this.archivedAt && !this.deletedAt;
  }

  // hooks

  @BeforeValidate
  static async onBeforeValidate(model: Collection) {
    model.urlId = model.urlId || generateUrlId();
  }

  @BeforeSave
  static async onBeforeSave(model: Collection) {
    if (!model.content) {
      model.content = await DocumentHelper.toJSON(model);
    }
  }

  @BeforeDestroy
  static async checkLastCollection(model: Collection) {
    const total = await this.count({
      where: {
        teamId: model.teamId,
      },
    });
    if (total === 1) {
      throw ValidationError("Cannot delete last collection");
    }
  }

  @AfterCreate
  static async onAfterCreate(
    model: Collection,
    options: { transaction: Transaction }
  ) {
    return UserMembership.findOrCreate({
      where: {
        collectionId: model.id,
        userId: model.createdById,
      },
      defaults: {
        permission: CollectionPermission.Admin,
        createdById: model.createdById,
      },
      transaction: options.transaction,
      hooks: false,
    });
  }

  // associations

  @BelongsTo(() => FileOperation, "importId")
  import: FileOperation | null;

  @ForeignKey(() => FileOperation)
  @Column(DataType.UUID)
  importId: string | null;

  @BelongsTo(() => User, "archivedById")
  archivedBy?: User | null;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  archivedById?: string | null;

  @HasMany(() => Document, "collectionId")
  documents: Document[];

  @HasMany(() => UserMembership, "collectionId")
  memberships: UserMembership[];

  @HasMany(() => GroupMembership, "collectionId")
  groupMemberships: GroupMembership[];

  @BelongsToMany(() => User, () => UserMembership)
  users: User[];

  @BelongsToMany(() => Group, () => GroupMembership)
  groups: Group[];

  @BelongsTo(() => User, "createdById")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  static DEFAULT_SORT: { field: "title" | "index"; direction: "asc" | "desc" } =
    {
      field: "index",
      direction: "asc",
    };

  /**
   * Returns an array of unique userIds that are members of a collection,
   * either via group or direct membership.
   *
   * @param collectionId
   * @returns userIds
   */
  static async membershipUserIds(collectionId: string) {
    const collection = await this.scope("withAllMemberships").findByPk(
      collectionId
    );
    if (!collection) {
      return [];
    }

    const groupMemberships = collection.groupMemberships
      .map((gm) => gm.group.groupUsers)
      .flat();
    const membershipUserIds = [
      ...groupMemberships,
      ...collection.memberships,
    ].map((membership) => membership.userId);
    return uniq(membershipUserIds);
  }

  /**
   * Overrides the standard findByPk behavior to allow also querying by urlId
   *
   * @param id uuid or urlId
   * @param options FindOptions
   * @returns A promise resolving to a collection instance or null
   */
  static async findByPk(
    id: Identifier,
    options?: NonNullFindOptions<Collection> & AdditionalFindOptions
  ): Promise<Collection>;
  static async findByPk(
    id: Identifier,
    options?: FindOptions<Collection> & AdditionalFindOptions
  ): Promise<Collection | null>;
  static async findByPk(
    id: Identifier,
    options: FindOptions<Collection> & AdditionalFindOptions = {}
  ): Promise<Collection | null> {
    if (typeof id !== "string") {
      return null;
    }

    if (isUUID(id)) {
      const collection = await this.findOne({
        where: {
          id,
        },
        ...options,
        rejectOnEmpty: false,
      });

      if (!collection && options.rejectOnEmpty) {
        throw new EmptyResultError(`Collection doesn't exist with id: ${id}`);
      }

      return collection;
    }

    const match = id.match(UrlHelper.SLUG_URL_REGEX);
    if (match) {
      const collection = await this.findOne({
        where: {
          urlId: match[1],
        },
        ...options,
        rejectOnEmpty: false,
      });

      if (!collection && options.rejectOnEmpty) {
        throw new EmptyResultError(`Collection doesn't exist with id: ${id}`);
      }

      return collection;
    }

    return null;
  }

  /**
   * Find the first collection that the specified user has access to.
   *
   * @param user User to find the collection for
   * @param options Additional options for the query
   * @returns collection First collection in the sidebar order
   */
  static async findFirstCollectionForUser(
    user: User,
    options: FindOptions = {}
  ) {
    const id = await user.collectionIds();
    return this.findOne({
      where: {
        teamId: user.teamId,
        id,
      },
      order: [
        // using LC_COLLATE:"C" because we need byte order to drive the sorting
        Sequelize.literal('"collection"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
      ...options,
    });
  }

  /**
   * Convenience method to return if a collection is considered private.
   * This means that a membership is required to view it rather than just being
   * a workspace member.
   *
   * @returns boolean
   */
  get isPrivate() {
    return !this.permission;
  }

  getDocumentTree = (documentId: string): NavigationNode | null => {
    if (!this.documentStructure) {
      return null;
    }

    let result!: NavigationNode | undefined;

    const loopChildren = (documents: NavigationNode[]) => {
      if (result) {
        return;
      }

      documents.forEach((document) => {
        if (result) {
          return;
        }

        if (document.id === documentId) {
          result = document;
        } else {
          loopChildren(document.children);
        }
      });
    };

    // Technically, sorting the children is presenter-layer work...
    // but the only place it's used passes straight into an API response
    // so the extra indirection is not worthwhile
    loopChildren(this.documentStructure);

    // if the document is a draft loopChildren will not find it in the structure
    if (!result) {
      return null;
    }

    return {
      ...result,
      children: sortNavigationNodes(result.children, this.sort),
    };
  };

  deleteDocument = async function (document: Document, options?: FindOptions) {
    await this.removeDocumentInStructure(document, options);

    // Helper to destroy all child documents for a document
    const loopChildren = async (
      documentId: string,
      opts?: FindOptions<Document>
    ) => {
      const childDocuments = await Document.findAll({
        where: {
          parentDocumentId: documentId,
        },
      });

      for (const child of childDocuments) {
        await loopChildren(child.id, opts);
        await child.destroy(opts);
      }
    };

    await loopChildren(document.id, options);
    await document.destroy(options);
  };

  removeDocumentInStructure = async function (
    document: Document,
    options?: FindOptions & {
      save?: boolean;
    }
  ) {
    if (!this.documentStructure) {
      return;
    }

    let result: [NavigationNode, number] | undefined;

    const removeFromChildren = async (
      children: NavigationNode[],
      id: string
    ) => {
      children = await Promise.all(
        children.map(async (childDocument) => ({
          ...childDocument,
          children: await removeFromChildren(childDocument.children, id),
        }))
      );
      const match = find(children, {
        id,
      });

      if (match) {
        if (!result) {
          result = [
            match,
            findIndex(children, {
              id,
            }),
          ];
        }

        remove(children, {
          id,
        });
      }

      return children;
    };

    this.documentStructure = await removeFromChildren(
      this.documentStructure,
      document.id
    );

    // Sequelize doesn't seem to set the value with splice on JSONB field
    // https://github.com/sequelize/sequelize/blob/e1446837196c07b8ff0c23359b958d68af40fd6d/src/model.js#L3937
    this.changed("documentStructure", true);

    if (options?.save !== false) {
      await this.save({
        ...options,
        fields: ["documentStructure"],
      });
    }

    return result;
  };

  getDocumentParents = function (documentId: string): string[] | void {
    let result!: string[];

    const loopChildren = (documents: NavigationNode[], path: string[] = []) => {
      if (result) {
        return;
      }

      documents.forEach((document) => {
        if (document.id === documentId) {
          result = path;
        } else {
          loopChildren(document.children, [...path, document.id]);
        }
      });
    };

    if (this.documentStructure) {
      loopChildren(this.documentStructure);
    }

    return result;
  };

  /**
   * Update document's title and url in the documentStructure
   */
  updateDocument = async function (
    updatedDocument: Document,
    options?: { transaction?: Transaction | null | undefined }
  ) {
    if (!this.documentStructure) {
      return;
    }

    const { id } = updatedDocument;

    const updateChildren = (documents: NavigationNode[]) =>
      Promise.all(
        documents.map(async (document) => {
          if (document.id === id) {
            document = {
              ...(await updatedDocument.toNavigationNode(options)),
              children: document.children,
            };
          } else {
            document.children = await updateChildren(document.children);
          }

          return document;
        })
      );

    this.documentStructure = await updateChildren(this.documentStructure);
    // Sequelize doesn't seem to set the value with splice on JSONB field
    // https://github.com/sequelize/sequelize/blob/e1446837196c07b8ff0c23359b958d68af40fd6d/src/model.js#L3937
    this.changed("documentStructure", true);
    await this.save({
      fields: ["documentStructure"],
      ...options,
    });

    return this;
  };

  addDocumentToStructure = async function (
    document: Document,
    index?: number,
    options: FindOptions & {
      save?: boolean;
      documentJson?: NavigationNode;
      includeArchived?: boolean;
    } = {}
  ) {
    if (!this.documentStructure) {
      this.documentStructure = [];
    }

    if (this.getDocumentTree(document.id)) {
      return this;
    }

    // If moving existing document with children, use existing structure
    const documentJson = {
      ...(await document.toNavigationNode(options)),
      ...options.documentJson,
    };

    if (!document.parentDocumentId) {
      // Note: Index is supported on DB level but it's being ignored
      // by the API presentation until we build product support for it.
      this.documentStructure.splice(
        index !== undefined ? index : this.documentStructure.length,
        0,
        documentJson
      );
    } else {
      // Recursively place document
      const placeDocument = (documentList: NavigationNode[]) =>
        documentList.map((childDocument) => {
          if (document.parentDocumentId === childDocument.id) {
            childDocument.children.splice(
              index !== undefined ? index : childDocument.children.length,
              0,
              documentJson
            );
          } else {
            childDocument.children = placeDocument(childDocument.children);
          }

          return childDocument;
        });

      this.documentStructure = placeDocument(this.documentStructure);
    }

    // Sequelize doesn't seem to set the value with splice on JSONB field
    // https://github.com/sequelize/sequelize/blob/e1446837196c07b8ff0c23359b958d68af40fd6d/src/model.js#L3937
    this.changed("documentStructure", true);

    if (options?.save !== false) {
      await this.save({
        ...options,
        fields: ["documentStructure"],
      });
    }

    return this;
  };
}

export default Collection;
