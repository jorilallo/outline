// @flow
import { rootDocumentActions } from "./definitions/documents";
import { rootNavigationActions } from "./definitions/navigation";
import { rootSettingsActions } from "./definitions/settings";

export default [
  ...rootNavigationActions,
  ...rootSettingsActions,
  ...rootDocumentActions,
];
