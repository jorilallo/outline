import path from "path";
import i18n from "i18next";
import backend from "i18next-fs-backend";
import { languages } from "@shared/i18n";
import { unicodeBCP47toCLDR, unicodeCLDRtoBCP47 } from "@shared/utils/date";
import env from "@server/env";
import { User } from "@server/models";

export function opts(user?: User | null) {
  return {
    lng: unicodeCLDRtoBCP47(user?.language ?? env.DEFAULT_LANGUAGE),
  };
}

export function initI18n() {
  const lng = unicodeCLDRtoBCP47(env.DEFAULT_LANGUAGE);
  i18n.use(backend).init({
    compatibilityJSON: "v3",
    backend: {
      loadPath: (language: string) => {
        return path.resolve(
          path.join(
            __dirname,
            "..",
            "..",
            "shared",
            "i18n",
            "locales",
            unicodeBCP47toCLDR(language),
            "translation.json"
          )
        );
      },
    },
    preload: languages.map(unicodeCLDRtoBCP47),
    interpolation: {
      escapeValue: false,
    },
    lng,
    fallbackLng: lng,
    keySeparator: false,
    returnNull: false,
  });
  return i18n;
}
