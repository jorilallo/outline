import { faker } from "@faker-js/faker";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import {
  buildUser,
  buildTeam,
  buildCollection,
  buildGroup,
  buildGroupUser,
  buildDocument,
} from "@server/test/factories";
import GroupMembership from "./GroupMembership";
import UserMembership from "./UserMembership";

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date("2018-01-02T00:00:00.000Z"));
});

afterAll(() => {
  jest.useRealTimers();
});

describe("user model", () => {
  describe("create", () => {
    it("should not allow URLs in name", async () => {
      await expect(
        buildUser({
          name: "www.google.com",
        })
      ).rejects.toThrow();

      await expect(
        buildUser({
          name: "My name https://malicious.com",
        })
      ).rejects.toThrow();

      await expect(
        buildUser({
          name: "wwwww",
        })
      ).resolves.toBeDefined();
    });
  });

  describe("destroy", () => {
    it("should clear PII", async () => {
      const user = await buildUser();
      await user.destroy();
      expect(user.email).toBe(null);
      expect(user.name).toBe("Unknown");
    });
  });

  describe("getJwtToken", () => {
    it("should set JWT secret", async () => {
      const user = await buildUser();
      expect(user.getJwtToken()).toBeTruthy();
    });
  });

  describe("availableTeams", () => {
    it("should return teams where another user with the same email exists", async () => {
      const email = faker.internet.email().toLowerCase();
      const user = await buildUser({
        email,
      });
      const anotherUser = await buildUser({ email });

      const response = await user.availableTeams();
      expect(response.length).toEqual(2);
      expect(response[0].id).toEqual(user.teamId);
      expect(response[1].id).toEqual(anotherUser.teamId);
    });
  });

  describe("collectionIds", () => {
    it("should return read_write collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.ReadWrite,
      });
      const response = await user.collectionIds();
      expect(response.length).toEqual(1);
      expect(response[0]).toEqual(collection.id);
    });
    it("should return read collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.Read,
      });
      const response = await user.collectionIds();
      expect(response.length).toEqual(1);
      expect(response[0]).toEqual(collection.id);
    });
    it("should not return private collections", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const response = await user.collectionIds();
      expect(response.length).toEqual(0);
    });
    it("should not return private collection with membership", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const collection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      await UserMembership.create({
        createdById: user.id,
        collectionId: collection.id,
        userId: user.id,
        permission: CollectionPermission.Read,
      });
      const response = await user.collectionIds();
      expect(response.length).toEqual(1);
      expect(response[0]).toEqual(collection.id);
    });
  });

  describe("hasHigherDocumentPermission", () => {
    it("should return true when user has higher access level", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });
      const group = await buildGroup();
      await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const hasHigherPermission = await user.hasHigherDocumentPermission({
        documentId: document.id,
        permission: DocumentPermission.Read,
      });

      expect(hasHigherPermission).toBe(true);
    });

    it("should return true when user has the same access level", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });
      const group = await buildGroup();
      await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const hasHigherPermission = await user.hasHigherDocumentPermission({
        documentId: document.id,
        permission: DocumentPermission.ReadWrite,
      });

      expect(hasHigherPermission).toBe(true);
    });

    it("should return false when user has lower access level", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });
      const group = await buildGroup();
      await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const hasHigherPermission = await user.hasHigherDocumentPermission({
        documentId: document.id,
        permission: DocumentPermission.Admin,
      });

      expect(hasHigherPermission).toBe(false);
    });

    it("should return false when user does not have access", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });

      const hasHigherPermission = await user.hasHigherDocumentPermission({
        documentId: document.id,
        permission: DocumentPermission.Admin,
      });

      expect(hasHigherPermission).toBe(false);
    });
  });

  describe("getDocumentPermission", () => {
    it("should return the highest provided permission", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });
      const group = await buildGroup();
      await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const permission = await user.getDocumentPermission(document.id);

      expect(permission).toEqual(DocumentPermission.ReadWrite);
    });

    it("should return the highest provided permission with skipped membership", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });
      const group = await buildGroup();
      const [, , groupMembership] = await Promise.all([
        await buildGroupUser({
          groupId: group.id,
          userId: user.id,
          teamId: user.teamId,
        }),
        await UserMembership.create({
          createdById: user.id,
          documentId: document.id,
          userId: user.id,
          permission: DocumentPermission.Read,
        }),
        await GroupMembership.create({
          createdById: user.id,
          documentId: document.id,
          groupId: group.id,
          permission: DocumentPermission.ReadWrite,
        }),
      ]);

      const permission = await user.getDocumentPermission(
        document.id,
        groupMembership.id
      );

      expect(permission).toEqual(DocumentPermission.Read);
    });

    it("should return undefined when user does not have access", async () => {
      const user = await buildUser();
      const document = await buildDocument({ teamId: user.teamId });

      const permission = await user.getDocumentPermission(document.id);

      expect(permission).toBeUndefined();
    });
  });
});
