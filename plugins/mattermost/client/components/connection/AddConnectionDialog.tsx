import { observer } from "mobx-react";
import React, { useRef, useState } from "react";
import { UserTeams } from "../../../shared/types";
import { Server } from "../../utils/zod";
import ServerForm from "./ServerForm";
import TeamSelection from "./TeamSelection";

type Props = {
  onSubmit: () => void;
};

const AddConnectionDialog = ({ onSubmit }: Props) => {
  const [userTeams, setUserTeams] = useState<UserTeams>();
  const serverRef = useRef<Server>({
    url: "",
    apiKey: "",
  });

  return userTeams ? (
    <TeamSelection
      server={serverRef.current}
      userTeams={userTeams}
      onSave={onSubmit}
      onBack={() => setUserTeams(undefined)}
    />
  ) : (
    <ServerForm
      server={serverRef.current}
      setServer={(data: Server) => (serverRef.current = data)}
      setUserTeams={setUserTeams}
    />
  );
};

export default observer(AddConnectionDialog);
