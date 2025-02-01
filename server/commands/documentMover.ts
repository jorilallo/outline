import invariant from "invariant";
import { Transaction } from "sequelize";
import { createContext } from "@server/context";
import { traceFunction } from "@server/logging/tracing";
import {
  User,
  Document,
  Collection,
  Pin,
  Event,
  UserMembership,
  GroupMembership,
} from "@server/models";

type Props = {
  /** User attempting to move the document */
  user: User;
  /** Document which is being moved */
  document: Document;
  /** Destination collection to which the document is moved */
  collectionId: string | null;
  /** ID of parent under which the document is moved */
  parentDocumentId?: string | null;
  /** Position of moved document within document structure */
  index?: number;
  /** The IP address of the user moving the document */
  ip: string;
  /** The database transaction to run within */
  transaction?: Transaction;
};

type Result = {
  collections: Collection[];
  documents: Document[];
  collectionChanged: boolean;
};

async function documentMover({
  user,
  document,
  collectionId = null,
  parentDocumentId = null,
  // convert undefined to null so parentId comparison treats them as equal
  index,
  ip,
  transaction,
}: Props): Promise<Result> {
  const collectionChanged = collectionId !== document.collectionId;
  const previousCollectionId = document.collectionId;
  const result: Result = {
    collections: [],
    documents: [],
    collectionChanged,
  };

  if (document.template && !collectionChanged) {
    return result;
  }

  if (document.template) {
    document.collectionId = collectionId;
    document.parentDocumentId = null;
    document.lastModifiedById = user.id;
    document.updatedBy = user;
    await document.save({ transaction });
    result.documents.push(document);
  } else {
    // Load the current and the next collection upfront and lock them
    const collection = await Collection.findByPk(document.collectionId!, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
      paranoid: false,
    });

    let newCollection = collection;
    if (collectionChanged) {
      if (collectionId) {
        newCollection = await Collection.findByPk(collectionId, {
          transaction,
          lock: Transaction.LOCK.UPDATE,
        });
      } else {
        newCollection = null;
      }
    }

    if (document.publishedAt) {
      // Remove the document from the current collection
      const response = await collection?.removeDocumentInStructure(document, {
        transaction,
        save: collectionChanged,
      });

      let documentJson = response?.[0];
      const fromIndex = response?.[1] || 0;

      if (!documentJson) {
        documentJson = await document.toNavigationNode({ transaction });
      }

      // if we're reordering from within the same parent
      // the original and destination collection are the same,
      // so when the initial item is removed above, the list will reduce by 1.
      // We need to compensate for this when reordering
      const toIndex =
        index !== undefined &&
        document.parentDocumentId === parentDocumentId &&
        document.collectionId === collectionId &&
        fromIndex < index
          ? index - 1
          : index;

      // Update the properties on the document record, this must be done after
      // the toIndex is calculated above
      document.collectionId = collectionId;
      document.parentDocumentId = parentDocumentId;
      document.lastModifiedById = user.id;
      document.updatedBy = user;

      if (newCollection) {
        // Add the document and it's tree to the new collection
        await newCollection.addDocumentToStructure(document, toIndex, {
          documentJson,
          transaction,
        });
      }
    } else {
      document.collectionId = collectionId;
      document.parentDocumentId = parentDocumentId;
      document.lastModifiedById = user.id;
      document.updatedBy = user;
    }

    if (collection && document.publishedAt) {
      result.collections.push(collection);
    }

    // If the collection has changed then we also need to update the properties
    // on all of the documents children to reflect the new collectionId
    if (collectionChanged) {
      // Efficiently find the ID's of all the documents that are children of
      // the moved document and update in one query
      const childDocumentIds = await document.findAllChildDocumentIds();

      if (collectionId) {
        // Reload the collection to get relationship data
        newCollection = await Collection.scope({
          method: ["withMembership", user.id],
        }).findByPk(collectionId, {
          transaction,
        });
        invariant(newCollection, "Collection not found");

        result.collections.push(newCollection);

        await Document.update(
          {
            collectionId: newCollection.id,
          },
          {
            transaction,
            where: {
              id: childDocumentIds,
            },
          }
        );
      } else if (!document.isArchived) {
        // skip archived documents since they can be detached when the collection is deleted
        // document will be moved to drafts
        document.publishedAt = null;

        // point children's parent to moved document's parent
        await Document.update(
          {
            parentDocumentId: document.parentDocumentId,
          },
          {
            transaction,
            where: {
              id: childDocumentIds,
            },
          }
        );
      }

      // We must reload from the database to get the relationship data
      const documents = await Document.findAll({
        where: {
          id: childDocumentIds,
        },
        transaction,
      });

      document.collection = newCollection;
      result.documents.push(
        ...documents.map((document) => {
          if (newCollection) {
            document.collection = newCollection;
          }
          return document;
        })
      );

      // If the document was pinned to the collection then we also need to
      // automatically remove the pin to prevent a confusing situation where
      // a document is pinned from another collection. Use the command to ensure
      // the correct events are emitted.
      const pin = await Pin.findOne({
        where: {
          documentId: document.id,
          collectionId: previousCollectionId,
        },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      await pin?.destroyWithCtx(
        createContext({
          user,
          ip,
          transaction,
        })
      );
    }
  }

  await document.save({ transaction });
  result.documents.push(document);

  // If there are any sourced memberships for this document, we need to go to the source
  // memberships and recalculate the membership for the user or group.
  const [
    userMemberships,
    parentDocumentUserMemberships,
    groupMemberships,
    parentDocumentGroupMemberships,
  ] = await Promise.all([
    UserMembership.findRootMembershipsForDocument(document.id, undefined, {
      transaction,
    }),
    parentDocumentId
      ? UserMembership.findRootMembershipsForDocument(
          parentDocumentId,
          undefined,
          { transaction }
        )
      : [],
    GroupMembership.findRootMembershipsForDocument(document.id, undefined, {
      transaction,
    }),
    parentDocumentId
      ? GroupMembership.findRootMembershipsForDocument(
          parentDocumentId,
          undefined,
          { transaction }
        )
      : [],
  ]);

  await recalculateUserMemberships(userMemberships, transaction);
  await recalculateUserMemberships(parentDocumentUserMemberships, transaction);
  await recalculateGroupMemberships(groupMemberships, transaction);
  await recalculateGroupMemberships(
    parentDocumentGroupMemberships,
    transaction
  );

  await Event.create(
    {
      name: "documents.move",
      actorId: user.id,
      documentId: document.id,
      collectionId,
      teamId: document.teamId,
      data: {
        title: document.title,
        collectionIds: result.collections.map((c) => c.id),
        documentIds: result.documents.map((d) => d.id),
      },
      ip,
    },
    {
      transaction,
    }
  );

  // we need to send all updated models back to the client
  return result;
}

async function recalculateUserMemberships(
  memberships: UserMembership[],
  transaction?: Transaction
) {
  for (const membership of memberships) {
    await UserMembership.createSourcedMemberships(membership, { transaction });
  }
}

async function recalculateGroupMemberships(
  memberships: GroupMembership[],
  transaction?: Transaction
) {
  for (const membership of memberships) {
    await GroupMembership.createSourcedMemberships(membership, { transaction });
  }
}

export default traceFunction({
  spanName: "documentMover",
})(documentMover);
