import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Group from "models/Group";
import User from "models/User";
import Button from "components/Button";
import Empty from "components/Empty";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import Subheading from "components/Subheading";
import AddPeopleToGroup from "./AddPeopleToGroup";
import GroupMemberListItem from "./components/GroupMemberListItem";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

type Props = {
  group: Group;
};

function GroupMembers({ group }: Props) {
  const [addModalOpen, setAddModalOpen] = React.useState();
  const { users, groupMemberships, policies } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const can = policies.abilities(group.id);

  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'state' implicitly has an 'any' type.
  const handleAddModal = (state) => {
    setAddModalOpen(state);
  };

  const handleRemoveUser = async (user: User) => {
    try {
      await groupMemberships.delete({
        groupId: group.id,
        userId: user.id,
      });
      showToast(
        t(`{{userName}} was removed from the group`, {
          userName: user.name,
        }),
        {
          type: "success",
        }
      );
    } catch (err) {
      showToast(t("Could not remove user"), {
        type: "error",
      });
    }
  };

  return (
    <Flex column>
      {can.update ? (
        <>
          <HelpText>
            <Trans
              defaults="Add and remove team members in the <em>{{groupName}}</em> group. Adding people to the group will give them access to any collections this group has been added to."
              values={{
                groupName: group.name,
              }}
              components={{
                em: <strong />,
              }}
            />
          </HelpText>
          <span>
            <Button
              type="button"
              onClick={() => handleAddModal(true)}
              icon={<PlusIcon />}
              neutral
            >
              {t("Add people")}…
            </Button>
          </span>
        </>
      ) : (
        <HelpText>
          <Trans
            defaults="Listing team members in the <em>{{groupName}}</em> group."
            values={{
              groupName: group.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </HelpText>
      )}

      <Subheading>
        <Trans>Members</Trans>
      </Subheading>
      <PaginatedList
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ items: any; fetch: any; options: { id: str... Remove this comment to see the full error message
        items={users.inGroup(group.id)}
        fetch={groupMemberships.fetchPage}
        options={{
          id: group.id,
        }}
        empty={<Empty>{t("This group has no members.")}</Empty>}
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'item' implicitly has an 'any' type.
        renderItem={(item) => (
          <GroupMemberListItem
            key={item.id}
            user={item}
            onRemove={can.update ? () => handleRemoveUser(item) : undefined}
          />
        )}
      />
      {can.update && (
        <Modal
          title={t(`Add people to {{groupName}}`, {
            groupName: group.name,
          })}
          onRequestClose={() => handleAddModal(false)}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'undefined' is not assignable to type 'boolea... Remove this comment to see the full error message
          isOpen={addModalOpen}
        >
          <AddPeopleToGroup
            // @ts-expect-error ts-migrate(2322) FIXME: Type '{ group: Group; onSubmit: () => void; }' is ... Remove this comment to see the full error message
            group={group}
            onSubmit={() => handleAddModal(false)}
          />
        </Modal>
      )}
    </Flex>
  );
}

export default observer(GroupMembers);
