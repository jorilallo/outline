import FuzzySearch from "fuzzy-search";
import { uniq } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { Outline } from "~/components/Input";
import InputSearch from "~/components/InputSearch";
import PublishLocation from "~/components/PublishLocation";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { flattenTree, ancestors } from "~/utils/tree";

type Props = {
  document: Document;
  visible: boolean;
};

function PublishPopover({ document, visible }: Props) {
  const [searchTerm, setSearchTerm] = React.useState<string>();
  const [selectedLocation, setLocation] = React.useState<any>();
  const { collections } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const listRef = React.useRef<List>(null);

  React.useEffect(() => {
    if (visible && selectedLocation) {
      listRef.current?.scrollToItem(selectedLocation.index);
    }
  });

  const searchIndex = React.useMemo(() => {
    const data = flattenTree(collections.tree.root).slice(1);

    return new FuzzySearch(data, ["data.title"], {
      caseSensitive: false,
    });
  }, [collections.tree]);

  React.useEffect(() => {
    if (searchTerm) {
      setLocation(null);
    }
  }, [searchTerm]);

  const results = React.useMemo(() => {
    const onlyShowCollections = document.isTemplate;
    let results: any = [];

    if (collections.isLoaded) {
      if (searchTerm) {
        results = searchIndex.search(searchTerm);
      } else {
        results = searchIndex.haystack;
      }
    }

    if (onlyShowCollections) {
      results = results.filter(
        (result: any) => result.data.type === "collection"
      );
    }

    // Include parents as well, required for displaying search results in a tree-like view
    const resultsTree = uniq(
      results.reduce((acc: any[], curr: any) => acc.concat(ancestors(curr)), [])
    );

    return resultsTree;
  }, [document, collections, searchTerm, searchIndex]);

  const handleSearch = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(ev.target.value);
  };

  const handleSelect = (res: any) => {
    setLocation(res);
  };

  const handlePublish = React.useCallback(async () => {
    if (!selectedLocation) {
      return;
    }
    try {
      document.collectionId = selectedLocation.data.collectionId;
      await document.save({ publish: true });
      if (selectedLocation.data.type === "document") {
        await document.move(
          selectedLocation.data.collectionId,
          selectedLocation.data.id
        );
      }
      showToast(t("Document published"), {
        type: "success",
      });
    } catch (err) {
      showToast(t("Couldn’t publish the document, try again?"), {
        type: "error",
      });
    }
  }, [selectedLocation, document, showToast, t]);

  const row = ({
    index,
    data,
    style,
  }: {
    index: number;
    data: any[];
    style: React.CSSProperties;
  }) => {
    const result = data[index];
    result.data.collection = collections.get(result.data.collectionId);
    result.index = index;
    return (
      <PublishLocation
        style={style}
        location={result}
        onSelect={handleSelect}
        selected={
          selectedLocation && result.data.id === selectedLocation.data.id
        }
      ></PublishLocation>
    );
  };

  const data = results;

  if (!document || !collections.isLoaded) {
    return null;
  }

  return (
    <Flex column>
      <PublishLocationSearch
        type="search"
        onChange={handleSearch}
        placeholder={`${t("Search collections & documents")}…`}
        required
        autoFocus
      />
      <Results>
        <AutoSizer>
          {({ width, height }: { width: number; height: number }) => (
            <Flex role="listbox" column>
              <List
                ref={listRef}
                key={data.length}
                width={width}
                height={height}
                itemData={data}
                itemCount={data.length}
                itemSize={32}
                itemKey={(index, results: any) => results[index].data.id}
              >
                {row}
              </List>
            </Flex>
          )}
        </AutoSizer>
      </Results>
      <Footer justify="space-between" align="center">
        {selectedLocation ? (
          <SelectedLocation>
            <Trans
              defaults="Publish under <strong>{{location}}</strong>"
              values={{
                location: selectedLocation.data.title,
              }}
            />
          </SelectedLocation>
        ) : (
          <SelectedLocation type="tertiary">
            {t("Choose a location to publish")}
          </SelectedLocation>
        )}
        <Button disabled={!selectedLocation} onClick={handlePublish}>
          Publish
        </Button>
      </Footer>
    </Flex>
  );
}

const PublishLocationSearch = styled(InputSearch)`
  ${Outline} {
    border-radius: 16px;
  }
  margin-bottom: 16px;
  margin-top: 16px;
  padding-left: 24px;
  padding-right: 24px;
`;

const Results = styled.div`
  padding-left: 24px;
  padding-right: 24px;
  height: 40vh;
  border-top: 0;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  margin-right: -24px;
`;

const Footer = styled(Flex)`
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.textTertiary};
  height: 64px;
  border-top: 1px solid ${(props) => props.theme.horizontalRule};
  border-radius: 0 0 6px 6px;
  width: 100%;
  padding-left: 24px;
  padding-right: 24px;
`;

const SelectedLocation = styled(Text)`
  margin-bottom: 0;
`;

export default observer(PublishPopover);
