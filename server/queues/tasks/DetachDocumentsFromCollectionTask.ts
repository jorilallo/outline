import { Op, WhereOptions } from "sequelize";
import documentMover from "@server/commands/documentMover";
import { Collection, Document, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import BaseTask from "./BaseTask";

type Props = {
  collectionId: string;
  actorId: string;
  ip: string;
};

export default class DetachDocumentsFromCollectionTask extends BaseTask<Props> {
  async perform(props: Props) {
    const [collection, actor] = await Promise.all([
      Collection.findByPk(props.collectionId, {
        paranoid: false,
      }),
      User.findByPk(props.actorId),
    ]);

    if (
      !actor ||
      !collection ||
      !(collection.deletedAt || collection.archivedAt)
    ) {
      return;
    }

    // Detach drafts and archived documents when an unarchived collection is deleted; otherwise detach drafts only.
    const whereOpts: WhereOptions<Document> =
      collection.isDeleted && !collection.isArchived
        ? {
            [Op.or]: [
              { publishedAt: { [Op.is]: null } },
              { archivedAt: { [Op.ne]: null } },
            ],
          }
        : {
            publishedAt: { [Op.is]: null },
          };

    const documents = await Document.scope("withDrafts").findAll({
      where: {
        collectionId: props.collectionId,
        template: false,
        ...whereOpts,
      },
      paranoid: false,
    });

    return sequelize.transaction(async (transaction) => {
      for (const document of documents) {
        await documentMover({
          document,
          user: actor,
          ip: props.ip,
          collectionId: null,
          transaction,
        });
      }
    });
  }
}
