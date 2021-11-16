import { observer } from "mobx-react";
import queryString from "query-string";
import * as React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation, useRouteMatch } from "react-router-dom";
import CenteredContent from "components/CenteredContent";
import Flex from "components/Flex";
import PlaceholderDocument from "components/PlaceholderDocument";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { editDocumentUrl } from "utils/routeHelpers";

function DocumentNew() {
  const history = useHistory();
  const location = useLocation();
  const match = useRouteMatch();
  const { t } = useTranslation();
  const { documents, collections } = useStores();
  const { showToast } = useToasts();
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type '{}'.
  const id = match.params.id || "";
  useEffect(() => {
    async function createDocument() {
      const params = queryString.parse(location.search);

      try {
        const collection = await collections.fetch(id);
        const document = await documents.create({
          collectionId: collection.id,
          parentDocumentId: params.parentDocumentId,
          templateId: params.templateId,
          template: params.template,
          title: "",
          text: "",
        });
        history.replace(editDocumentUrl(document));
      } catch (err) {
        showToast(t("Couldn’t create the document, try again?"), {
          type: "error",
        });
        history.goBack();
      }
    }

    createDocument();
  });
  return (
    <Flex column auto>
      <CenteredContent>
        <PlaceholderDocument />
      </CenteredContent>
    </Flex>
  );
}

export default observer(DocumentNew);
