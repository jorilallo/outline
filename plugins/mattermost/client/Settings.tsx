import { observer } from "mobx-react";
import React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { IntegrationService, IntegrationType } from "@shared/types";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useStores from "~/hooks/useStores";
import MattermostIcon from "./Icon";
import AddConnectionDialog from "./components/connection/AddConnectionDialog";

const MatterMost = () => {
  const { t } = useTranslation();
  const { dialogs, integrations } = useStores();

  const appName = env.APP_NAME;

  const linkedAccountIntegration = integrations.find({
    service: IntegrationService.Mattermost,
    type: IntegrationType.LinkedAccount,
  });

  const handleConnect = React.useCallback(() => {
    dialogs.openModal({
      title: t("Connect to Mattermost"),
      content: <AddConnectionDialog onSubmit={dialogs.closeAllModals} />,
    });
  }, [dialogs]);

  const handleDisconnect = React.useCallback(async () => {
    if (linkedAccountIntegration) {
      await linkedAccountIntegration.delete();
      toast.success(t("Mattermost connection removed"));
    }
  }, [linkedAccountIntegration]);

  React.useEffect(() => {
    void integrations.fetchPage({
      service: IntegrationService.Mattermost,
      limit: 100,
    });
  }, [integrations]);

  return (
    <Scene title="Mattermost" icon={<MattermostIcon />}>
      <Heading>Mattermost</Heading>

      <SettingRow
        name="link"
        label={t("Account")}
        description={
          <Trans>
            Link your {{ appName }} account to Mattermost to enable posting
            document updates, searching and previewing the documents you have
            access to, directly within chat.
          </Trans>
        }
      >
        <Flex align="flex-end" column>
          {linkedAccountIntegration ? (
            <ConnectedButton
              onClick={handleDisconnect}
              confirmationMessage={<DisconnectMessage />}
            />
          ) : (
            <Button neutral onClick={handleConnect}>
              {t("Connect")}
            </Button>
          )}
        </Flex>
      </SettingRow>
    </Scene>
  );
};

const DisconnectMessage = () => (
  <>
    <Text type="secondary">
      <Trans>Disconnecting your account will prevent</Trans>
    </Text>
    <ul>
      <li>
        <Text type="secondary">
          <Trans>searching for documents from Mattermost.</Trans>
        </Text>
      </li>
      <li>
        <Text type="secondary">
          <Trans>posting document updates to Mattermost.</Trans>
        </Text>
      </li>
    </ul>
    <Text type="secondary">
      <Trans>Are you sure?</Trans>
    </Text>
  </>
);

export default observer(MatterMost);
