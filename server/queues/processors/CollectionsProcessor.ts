import teamUpdater from "@server/commands/teamUpdater";
import { Team, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import { Event as TEvent, CollectionEvent } from "@server/types";
import DetachDocumentsFromCollectionTask from "../tasks/DetachDocumentsFromCollectionTask";
import BaseProcessor from "./BaseProcessor";

export default class CollectionsProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = [
    "collections.delete",
    "collections.archive",
  ];

  async perform(event: CollectionEvent) {
    await DetachDocumentsFromCollectionTask.schedule({
      collectionId: event.collectionId,
      actorId: event.actorId,
      ip: event.ip,
    });

    await sequelize.transaction(async (transaction) => {
      const team = await Team.findByPk(event.teamId, {
        rejectOnEmpty: true,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (team?.defaultCollectionId === event.collectionId) {
        const user = await User.findByPk(event.actorId, {
          rejectOnEmpty: true,
          paranoid: false,
          transaction,
        });

        await teamUpdater({
          params: { defaultCollectionId: null },
          user,
          team,
          transaction,
          ip: event.ip,
        });
      }
    });
  }
}
