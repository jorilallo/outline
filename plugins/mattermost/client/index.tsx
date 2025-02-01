import React from "react";
import { UserRole } from "@shared/types";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import MattermostIcon from "./Icon";

PluginManager.add({
  ...config,
  type: Hook.Settings,
  value: {
    group: "Integrations",
    icon: MattermostIcon,
    component: React.lazy(() => import("./Settings")),
    enabled: (_, user) => [UserRole.Admin].includes(user.role),
  },
});
