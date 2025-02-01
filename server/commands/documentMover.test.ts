import Pin from "@server/models/Pin";
import { sequelize } from "@server/storage/database";
import {
  buildDocument,
  buildCollection,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import documentMover from "./documentMover";

describe("documentMover", () => {
  const ip = "127.0.0.1";

  it("should move within a collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const response = await documentMover({
      user,
      document,
      collectionId: collection.id,
      ip,
    });
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
  });

  it("should succeed when not in source collection documentStructure", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: "content",
    });
    const response = await documentMover({
      user,
      document,
      collectionId: collection.id,
      parentDocumentId: undefined,
      index: 0,
      ip,
    });
    expect(response.collections[0].documentStructure![0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
    expect(response.documents[0].collection?.id).toEqual(collection.id);
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
  });

  it("should move with children", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);
    const response = await documentMover({
      user,
      document,
      collectionId: collection.id,
      parentDocumentId: undefined,
      index: 0,
      ip,
    });
    expect(response.collections[0].documentStructure![0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
    expect(response.documents[0].collection?.id).toEqual(collection.id);
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
  });

  it("should move with children to another collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const newCollection = await buildCollection({
      teamId: collection.teamId,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);
    const response = await documentMover({
      user,
      document,
      collectionId: newCollection.id,
      parentDocumentId: undefined,
      index: 0,
      ip,
    });
    // check document ids where updated
    await newDocument.reload();
    expect(newDocument.collectionId).toBe(newCollection.id);

    // check collection structure updated
    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections[1].id).toBe(newCollection.id);
    expect(response.collections[1].documentStructure![0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(2);
    expect(response.documents.length).toEqual(2);

    expect(response.documents[0].collection?.id).toEqual(newCollection.id);
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
    expect(response.documents[1].collection?.id).toEqual(newCollection.id);
    expect(response.documents[1].updatedBy.id).toEqual(user.id);
  });

  it("should remove associated collection pin if moved to another collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const newCollection = await buildCollection({
      teamId: collection.teamId,
    });
    await Pin.create({
      createdById: user.id,
      collectionId: collection.id,
      documentId: document.id,
      teamId: collection.teamId,
    });

    const response = await sequelize.transaction(async (transaction) =>
      documentMover({
        user,
        document,
        collectionId: newCollection.id,
        parentDocumentId: undefined,
        index: 0,
        ip,
        transaction,
      })
    );

    const pinCount = await Pin.count({
      where: {
        teamId: collection.teamId,
      },
    });
    expect(pinCount).toBe(0);

    // check collection structure updated
    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections[1].id).toBe(newCollection.id);
    expect(response.collections.length).toEqual(2);
    expect(response.documents.length).toEqual(1);

    expect(response.documents[0].collection?.id).toEqual(newCollection.id);
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
  });

  it("should detach document from collection and move it to drafts", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });

    const response = await sequelize.transaction(async (transaction) =>
      documentMover({
        user,
        document,
        collectionId: null,
        index: 0,
        ip,
        transaction,
      })
    );

    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);

    expect(response.documents[0].collection).toBeNull();
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
    expect(response.documents[0].publishedAt).toBeNull();
  });

  it("should detach archived document when collection is deleted", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
      deletedAt: new Date(),
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
      archivedAt: new Date(),
    });

    const response = await sequelize.transaction(async (transaction) =>
      documentMover({
        user,
        document,
        collectionId: null,
        index: 0,
        ip,
        transaction,
      })
    );

    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);

    expect(response.documents[0].collection).toBeNull();
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
    expect(response.documents[0].publishedAt).toBeTruthy();
    expect(response.documents[0].archivedAt).toBeTruthy();
    expect(response.documents[0].deletedAt).toBeNull();
  });
});
