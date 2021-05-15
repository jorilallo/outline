// @flow
import { sortBy } from "lodash";
import { observer } from "mobx-react";
import { PlusIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import Invite from "scenes/Invite";
import { Action } from "components/Actions";
import Button from "components/Button";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import InputSearch from "components/InputSearch";
import Modal from "components/Modal";
import Scene from "components/Scene";
import PeopleTable from "./components/PeopleTable";
import StatusFilter from "./components/StatusFilter";
import useCurrentTeam from "hooks/useCurrentTeam";
import useQuery from "hooks/useQuery";
import useStores from "hooks/useStores";

function People(props) {
  const location = useLocation();
  const history = useHistory();
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const team = useCurrentTeam();
  const { users, policies } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const [data, setData] = React.useState([]);
  const can = policies.abilities(team.id);
  const query = params.get("query") || "";
  const filter = params.get("filter") || "";

  React.useEffect(() => {
    users.fetchCounts(team.id);
  }, [users, team]);

  const fetchData = React.useCallback(
    async ({ offset, sort, limit, direction }) => {
      const data = await users.fetchPage({
        offset,
        limit,
        sort,
        direction,
        query,
        includeSuspended: true,
      });

      if (!filter) {
        setData(
          data.filter((u) => users.active.map((u) => u.id).includes(u.id))
        );
      } else if (filter === "all") {
        setData(
          data.filter((u) => users.orderedData.map((u) => u.id).includes(u.id))
        );
      } else if (filter === "admins") {
        setData(
          data.filter((u) => users.admins.map((u) => u.id).includes(u.id))
        );
      } else if (filter === "suspended") {
        setData(
          data.filter((u) => users.suspended.map((u) => u.id).includes(u.id))
        );
      } else if (filter === "invited") {
        setData(
          data.filter((u) => users.invited.map((u) => u.id).includes(u.id))
        );
      } else if (filter === "viewers") {
        setData(
          data.filter((u) => users.viewers.map((u) => u.id).includes(u.id))
        );
      } else {
        setData(data);
      }
    },
    [query, filter, users]
  );

  const handleInviteModalOpen = React.useCallback(() => {
    setInviteModalOpen(true);
  }, []);

  const handleInviteModalClose = React.useCallback(() => {
    setInviteModalOpen(false);
  }, []);

  const handleFilter = React.useCallback(
    (filter) => {
      if (filter) {
        params.set("filter", filter);
      } else {
        params.delete("filter");
      }
      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleSearch = React.useCallback(
    (event) => {
      const { value } = event.target;
      if (value) {
        params.set("query", event.target.value);
      } else {
        params.delete("query");
      }
      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  return (
    <Scene
      title={t("Members")}
      icon={<UserIcon color="currentColor" />}
      actions={
        <>
          {can.inviteUser && (
            <Action>
              <Button
                type="button"
                data-on="click"
                data-event-category="invite"
                data-event-action="peoplePage"
                onClick={handleInviteModalOpen}
                icon={<PlusIcon />}
              >
                {t("Invite people")}…
              </Button>
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Members")}</Heading>
      <HelpText>
        <Trans>
          Everyone that has signed into Outline appears here. It’s possible that
          there are other users who have access through {team.signinMethods} but
          haven’t signed in yet.
        </Trans>
      </HelpText>
      <Flex gap={8}>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
        <StatusFilter activeKey={filter} onSelect={handleFilter} />
      </Flex>
      <PeopleTable
        data={data}
        fetchData={fetchData}
        pageCount={1}
        canUpdate={can.update}
      />
      {can.inviteUser && (
        <Modal
          title={t("Invite people")}
          onRequestClose={handleInviteModalClose}
          isOpen={inviteModalOpen}
        >
          <Invite onSubmit={handleInviteModalClose} />
        </Modal>
      )}
    </Scene>
  );
}

export default observer(People);
