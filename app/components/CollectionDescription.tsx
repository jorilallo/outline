import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import Collection from "~/models/Collection";
import Editor from "~/components/Editor";
import LoadingIndicator from "~/components/LoadingIndicator";
import { withUIExtensions } from "~/editor/extensions";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import Text from "./Text";

const extensions = withUIExtensions(richExtensions);

type Props = {
  collection: Collection;
};

function CollectionDescription({ collection }: Props) {
  const { collections } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(collection);

  const handleSave = React.useMemo(
    () =>
      debounce(async (getValue) => {
        try {
          await collection.save({
            data: getValue(false),
          });
        } catch (err) {
          toast.error(t("Sorry, an error occurred saving the collection"));
          throw err;
        }
      }, 1000),
    [collection, t]
  );

  const childRef = React.useRef<HTMLDivElement>(null);
  const childOffsetHeight = childRef.current?.offsetHeight || 0;
  const editorStyle = React.useMemo(
    () => ({
      padding: "0 32px",
      margin: "0 -32px",
      paddingBottom: `calc(50vh - ${childOffsetHeight}px)`,
    }),
    [childOffsetHeight]
  );

  return (
    <>
      {collections.isSaving && <LoadingIndicator />}
      {(collection.hasDescription || can.update) && (
        <React.Suspense fallback={<Placeholder>Loading…</Placeholder>}>
          <Editor
            defaultValue={collection.data}
            onChange={handleSave}
            placeholder={`${t("Add a description")}…`}
            extensions={extensions}
            maxLength={1000}
            canUpdate={can.update}
            readOnly={!can.update}
            editorStyle={editorStyle}
            embedsDisabled
          />
          <div ref={childRef} />
        </React.Suspense>
      )}
    </>
  );
}

const Placeholder = styled(Text)`
  color: ${s("placeholder")};
  cursor: text;
  min-height: 27px;
`;

export default observer(CollectionDescription);
