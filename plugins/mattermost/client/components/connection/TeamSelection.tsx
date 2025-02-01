import { observer } from "mobx-react";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { IntegrationService, IntegrationType } from "@shared/types";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import InputSelect, { Option } from "~/components/InputSelect";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { Team, UserTeams } from "../../../shared/types";
import { Server } from "../../utils/zod";

type Props = {
  server: Server;
  userTeams: UserTeams;
  onSave: () => void;
  onBack: () => void;
};

const TeamSelection = ({ server, userTeams, onSave, onBack }: Props) => {
  const { user, teams } = userTeams;

  const { t } = useTranslation();
  const { integrations } = useStores();
  const [saving, setSaving] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team>(teams[0]);

  const handleSave = React.useCallback(async () => {
    try {
      setSaving(true);
      await integrations.save({
        type: IntegrationType.LinkedAccount,
        service: IntegrationService.Mattermost,
        settings: {
          url: server.url,
          team: selectedTeam,
          user,
        },
        accessToken: server.apiKey,
      });
      toast.success(t("Mattermost connection successful"));
      onSave();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [selectedTeam]);

  return (
    <Flex column gap={12}>
      <div>
        <Text as="h3">
          <Trans>Account details</Trans>
        </Text>
        <Text as="p" type="secondary">
          <Trans>
            Please ensure that this account has access to create{" "}
            <Text weight="bold" type="secondary">
              incoming webhooks
            </Text>{" "}
            and{" "}
            <Text weight="bold" type="secondary">
              custom slash commands
            </Text>
            .
          </Trans>
        </Text>
      </div>
      <Flex justify="space-between">
        <UserDataItem title={t("Username")} value={user.name} />
        <UserDataItem title={t("Email")} value={user.email} />
      </Flex>
      <SelectTeam
        teams={teams}
        selectedTeam={selectedTeam}
        onSelect={setSelectedTeam}
      />
      <Flex justify="flex-end" gap={12} style={{ marginTop: "12px" }}>
        <Button neutral onClick={onBack}>
          {t("Back")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </Flex>
    </Flex>
  );
};

const UserDataItem = ({ title, value }: { title: string; value: string }) => (
  <Flex column gap={4}>
    <Text weight="bold">{title}</Text>
    <Text type="secondary">{value}</Text>
  </Flex>
);

const SelectTeam = ({
  teams,
  selectedTeam,
  onSelect,
}: {
  teams: Team[];
  selectedTeam: Team;
  onSelect: (team: Team) => void;
}) => {
  const { t } = useTranslation();

  const options: Option[] = teams.map((team) => ({
    label: team.name,
    value: team.id,
  }));

  const handleChange = React.useCallback(
    (teamId: string) => {
      const team = teams.find((tm) => tm.id === teamId);
      if (team) {
        onSelect(team);
      }
    },
    [teams]
  );

  return (
    <InputSelect
      label={t("Team")}
      ariaLabel={t("Team")}
      options={options}
      value={selectedTeam.id}
      onChange={handleChange}
    />
  );
};

export default observer(TeamSelection);
