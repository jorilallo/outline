import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { m } from "framer-motion";
import { observer } from "mobx-react";
import { CloseIcon, DocumentIcon, ClockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Document from "~/models/Document";
import Pin from "~/models/Pin";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import CollectionIcon from "./CollectionIcon";
import EmojiIcon from "./EmojiIcon";
import Squircle from "./Squircle";
import Text from "./Text";
import Tooltip from "./Tooltip";

type Props = {
  /** The pin record */
  pin: Pin | undefined;
  /** The document related to the pin */
  document: Document;
  /** Whether the user has permission to delete or reorder the pin */
  canUpdatePin?: boolean;
  /** Whether this pin can be reordered by dragging */
  isDraggable?: boolean;
};

function DocumentCard(props: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const theme = useTheme();
  const { document, pin, canUpdatePin, isDraggable } = props;
  const collection = collections.get(document.collectionId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.document.id,
    disabled: !isDraggable || !canUpdatePin,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleUnpin = React.useCallback(
    (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      pin?.delete();
    },
    [pin]
  );

  return (
    <Reorderable
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      {...attributes}
      {...listeners}
    >
      <AnimatePresence
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: {
            type: "spring",
            bounce: 0.6,
          },
        }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <DocumentLink
          dir={document.dir}
          $isDragging={isDragging}
          to={{
            pathname: document.url,
            state: {
              title: document.titleWithDefault,
            },
          }}
        >
          <Content justify="space-between" column>
            <Fold
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.5 19.5H6C2.96243 19.5 0.5 17.0376 0.5 14V0.5H0.792893L19.5 19.2071V19.5Z" />
            </Fold>

            {document.emoji ? (
              <Squircle color={theme.slateLight}>
                <EmojiIcon emoji={document.emoji} size={26} />
              </Squircle>
            ) : (
              <Squircle color={collection?.color}>
                {collection?.icon &&
                collection?.icon !== "collection" &&
                !pin?.collectionId ? (
                  <CollectionIcon collection={collection} color="white" />
                ) : (
                  <DocumentIcon color="white" />
                )}
              </Squircle>
            )}
            <div>
              <Heading dir={document.dir}>
                {document.emoji
                  ? document.titleWithDefault.replace(document.emoji, "")
                  : document.titleWithDefault}
              </Heading>
              <DocumentMeta size="xsmall">
                <ClockIcon color="currentColor" size={18} />{" "}
                <Time
                  dateTime={document.updatedAt}
                  tooltipDelay={500}
                  addSuffix
                  shorten
                />
              </DocumentMeta>
            </div>
          </Content>
          {canUpdatePin && (
            <Actions dir={document.dir} gap={4}>
              {!isDragging && pin && (
                <Tooltip tooltip={t("Unpin")}>
                  <PinButton onClick={handleUnpin} aria-label={t("Unpin")}>
                    <CloseIcon color="currentColor" />
                  </PinButton>
                </Tooltip>
              )}
            </Actions>
          )}
        </DocumentLink>
      </AnimatePresence>
    </Reorderable>
  );
}

const AnimatePresence = styled(m.div)`
  width: 100%;
  height: 100%;
`;

const Fold = styled.svg`
  fill: ${(props) => props.theme.background};
  stroke: ${(props) => props.theme.inputBorder};
  background: ${(props) => props.theme.background};

  position: absolute;
  top: -1px;
  right: -2px;
`;

const PinButton = styled(NudeButton)`
  color: ${(props) => props.theme.textTertiary};

  &:hover,
  &:active {
    color: ${(props) => props.theme.text};
  }
`;

const Actions = styled(Flex)`
  position: absolute;
  top: 4px;
  right: ${(props) => (props.dir === "rtl" ? "auto" : "4px")};
  left: ${(props) => (props.dir === "rtl" ? "4px" : "auto")};
  opacity: 0;
  color: ${(props) => props.theme.textTertiary};

  // move actions above content
  z-index: 2;
`;

const Reorderable = styled.div<{ $isDragging: boolean }>`
  position: relative;
  user-select: none;
  touch-action: none;
  width: 170px;
  height: 180px;
  transition: box-shadow 200ms ease;

  // move above other cards when dragging
  z-index: ${(props) => (props.$isDragging ? 1 : "inherit")};
  box-shadow: ${(props) =>
    props.$isDragging ? "0 0 20px rgba(0,0,0,0.3);" : "0 0 0 rgba(0,0,0,0)"};

  &:hover ${Actions} {
    opacity: 1;
  }
`;

const Content = styled(Flex)`
  min-width: 0;
  height: 100%;
`;

const DocumentMeta = styled(Text)`
  display: flex;
  align-items: center;
  gap: 2px;
  color: ${(props) => props.theme.textTertiary};
  margin: 0 0 0 -2px;
`;

const DocumentLink = styled(Link)<{
  $isDragging?: boolean;
}>`
  position: relative;
  display: block;
  padding: 12px;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: ${(props) => props.theme.background};
  transition: transform 50ms ease-in-out;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-bottom-width: 2px;
  border-right-width: 2px;
  pointer-events: ${(props) => (props.$isDragging ? "none" : "auto")};

  ${Actions} {
    opacity: 0;
  }

  &:hover,
  &:active,
  &:focus,
  &:focus-within {
    transform: scale(1.09) rotate(-2deg);
    z-index: 1;

    ${Fold} {
      display: none;
    }

    ${Actions} {
      opacity: 1;
    }
  }
`;

const Heading = styled.h3`
  margin-top: 0;
  margin-bottom: 0.35em;
  line-height: 22px;
  max-height: 66px; // 3*line-height
  overflow: hidden;

  color: ${(props) => props.theme.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

export default observer(DocumentCard);
