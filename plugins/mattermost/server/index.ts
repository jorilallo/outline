import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import api from "./api/mattermost";

PluginManager.add({
  ...config,
  type: Hook.API,
  value: api,
});
