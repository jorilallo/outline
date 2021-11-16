import { debounce } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withTranslation } from "react-i18next";
import { TFunction } from "react-i18next";
import styled from "styled-components";
import AuthStore from "stores/AuthStore";
import CollectionGroupMembershipsStore from "stores/CollectionGroupMembershipsStore";
import GroupsStore from "stores/GroupsStore";
import ToastsStore from "stores/ToastsStore";
import Collection from "models/Collection";
import Group from "models/Group";
import GroupNew from "scenes/GroupNew";
import Button from "components/Button";
import ButtonLink from "components/ButtonLink";
import Empty from "components/Empty";
import Flex from "components/Flex";
import GroupListItem from "components/GroupListItem";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";

type Props = {
  toasts: ToastsStore;
  auth: AuthStore;
  collection: Collection;
  collectionGroupMemberships: CollectionGroupMembershipsStore;
  groups: GroupsStore;
  onSubmit: () => void;
  t: TFunction;
};

@observer
class AddGroupsToCollection extends React.Component<Props> {
  @observable
  newGroupModalOpen = false;

  @observable
  query = "";

  handleNewGroupModalOpen = () => {
    this.newGroupModalOpen = true;
  };

  handleNewGroupModalClose = () => {
    this.newGroupModalOpen = false;
  };

  handleFilter = (ev: React.SyntheticEvent) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'EventTarg... Remove this comment to see the full error message
    this.query = ev.target.value;
    this.debouncedFetch();
  };

  debouncedFetch = debounce(() => {
    this.props.groups.fetchPage({
      query: this.query,
    });
  }, 250);

  handleAddGroup = (group: Group) => {
    const { t } = this.props;

    try {
      this.props.collectionGroupMemberships.create({
        collectionId: this.props.collection.id,
        groupId: group.id,
        permission: "read_write",
      });
      this.props.toasts.showToast(
        t("{{ groupName }} was added to the collection", {
          groupName: group.name,
        }),
        {
          type: "success",
        }
      );
    } catch (err) {
      this.props.toasts.showToast(t("Could not add user"), {
        type: "error",
      });
      console.error(err);
    }
  };

  render() {
    const { groups, collection, auth, t } = this.props;
    const { user, team } = auth;
    if (!user || !team) return null;
    return (
      <Flex column>
        <HelpText>
          {t("Can’t find the group you’re looking for?")}{" "}
          <ButtonLink onClick={this.handleNewGroupModalOpen}>
            {t("Create a group")}
          </ButtonLink>
          .
        </HelpText>

        <Input
          type="search"
          placeholder={`${t("Search by group name")}…`}
          value={this.query}
          onChange={this.handleFilter}
          label={t("Search groups")}
          labelHidden
          flex
        />
        <PaginatedList
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ empty: Element; items: any[]; fetch: ((par... Remove this comment to see the full error message
          empty={
            this.query ? (
              <Empty>{t("No groups matching your search")}</Empty>
            ) : (
              <Empty>{t("No groups left to add")}</Empty>
            )
          }
          items={groups.notInCollection(collection.id, this.query)}
          fetch={this.query ? undefined : groups.fetchPage}
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'item' implicitly has an 'any' type.
          renderItem={(item) => (
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            <GroupListItem
              key={item.id}
              group={item}
              showFacepile
              renderActions={() => (
                <ButtonWrap>
                  <Button onClick={() => this.handleAddGroup(item)} neutral>
                    {t("Add")}
                  </Button>
                </ButtonWrap>
              )}
            />
          )}
        />
        <Modal
          title={t("Create a group")}
          onRequestClose={this.handleNewGroupModalClose}
          isOpen={this.newGroupModalOpen}
        >
          <GroupNew onSubmit={this.handleNewGroupModalClose} />
        </Modal>
      </Flex>
    );
  }
}

const ButtonWrap = styled.div`
  margin-left: 6px;
`;

// @ts-expect-error ts-migrate(2344) FIXME: Type 'AddGroupsToCollection' does not satisfy the ... Remove this comment to see the full error message
export default withTranslation()<AddGroupsToCollection>(
  inject(
    "auth",
    "groups",
    "collectionGroupMemberships",
    "toasts"
  )(AddGroupsToCollection)
);
