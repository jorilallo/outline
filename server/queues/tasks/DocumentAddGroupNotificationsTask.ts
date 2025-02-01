import { Op } from "sequelize";
import { DocumentPermission } from "@shared/types";
import Logger from "@server/logging/Logger";
import { GroupUser } from "@server/models";
import { DocumentGroupEvent, DocumentUserEvent } from "@server/types";
import BaseTask, { TaskPriority } from "./BaseTask";
import DocumentAddUserNotificationsTask from "./DocumentAddUserNotificationsTask";

export default class DocumentAddGroupNotificationsTask extends BaseTask<DocumentGroupEvent> {
  public async perform(event: DocumentGroupEvent) {
    const permission = event.changes?.attributes.permission as
      | DocumentPermission
      | undefined;

    if (!permission) {
      Logger.debug(
        "task",
        `Suppressing notification for group ${event.modelId} as permission not available`,
        event.data
      );
    }

    const addUserTaskData: DocumentUserEvent["data"] = {
      title: "",
      isNew: event.data.isNew,
      permission,
    };

    await GroupUser.findAllInBatches<GroupUser>(
      {
        where: {
          groupId: event.modelId,
          userId: {
            [Op.ne]: event.actorId,
          },
        },
        batchLimit: 10,
      },
      async (groupUsers) => {
        await Promise.all(
          groupUsers.map(async (groupUser) => {
            await DocumentAddUserNotificationsTask.schedule({
              ...event,
              modelId: event.data.membershipId,
              userId: groupUser.userId,
              data: addUserTaskData,
            });
          })
        );
      }
    );
  }

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
