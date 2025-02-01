import { zodResolver } from "@hookform/resolvers/zod";
import invariant from "invariant";
import { observer } from "mobx-react";
import React from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { client } from "~/utils/ApiClient";
import { BadRequestError } from "~/utils/errors";
import { UserTeams } from "../../../shared/types";
import { server as zodServer, Server } from "../../utils/zod";

type Props = {
  server: Server;
  setServer: (data: Server) => void;
  setUserTeams: (userTeams: UserTeams) => void;
};

const ServerForm = ({ server, setServer, setUserTeams }: Props) => {
  const { t } = useTranslation();

  const { register, formState, handleSubmit } = useForm<Server>({
    mode: "all",
    defaultValues: {
      url: server.url,
      apiKey: server.apiKey,
    },
    resolver: zodResolver(zodServer),
  });

  const fetchUserAndTeams = React.useCallback(async (data: Server) => {
    setServer(data);
    try {
      const res = await client.post("/mattermost.user_teams", {
        url: data.url,
        apiKey: data.apiKey,
      });
      invariant(res?.data, "Data should be available");
      setUserTeams(res.data);
    } catch (err) {
      if (err instanceof BadRequestError) {
        toast.error(t("Invalid API key"));
      } else {
        toast.error(t("Server error - please check the url"));
      }
    }
  }, []);

  return (
    <form onSubmit={handleSubmit(fetchUserAndTeams)}>
      <Text as="p" type="secondary">
        <Trans>
          Provide the URL where the Mattermost server is hosted and the API key
          of the account which will be used to perform actions on Mattermost.
        </Trans>
      </Text>
      <Input
        type="text"
        label={t("Server URL")}
        placeholder={t("Server URL")}
        autoComplete="off"
        autoFocus
        {...register("url")}
      />
      <Input
        type="text"
        label={t("API key")}
        placeholder={t("API key")}
        autoComplete="off"
        autoFocus
        {...register("apiKey")}
      />
      <Flex justify="flex-end">
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isValid}
        >
          {formState.isSubmitting
            ? `${t("Fetching teams")}…`
            : t("Choose team")}
        </Button>
      </Flex>
    </form>
  );
};

export default observer(ServerForm);
