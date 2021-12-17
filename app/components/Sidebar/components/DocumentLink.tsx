import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useDrag, useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import { sortNavigationNodes } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import DocumentMenu from "~/menus/DocumentMenu";
import { NavigationNode } from "~/types";
import { newDocumentPath } from "~/utils/routeHelpers";
import Disclosure from "./Disclosure";
import DropCursor from "./DropCursor";
import DropToImport from "./DropToImport";
import EditableTitle from "./EditableTitle";
import SidebarLink, { DragObject } from "./SidebarLink";

type Props = {
  node: NavigationNode;
  canUpdate: boolean;
  collection?: Collection;
  activeDocument: Document | null | undefined;
  prefetchDocument: (documentId: string) => Promise<Document | void>;
  isDraft?: boolean;
  depth: number;
  index: number;
  parentId?: string;
};

function DocumentLink(
  {
    node,
    canUpdate,
    collection,
    activeDocument,
    prefetchDocument,
    isDraft,
    depth,
    index,
    parentId,
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { documents, policies } = useStores();
  const { t } = useTranslation();
  const isActiveDocument = activeDocument && activeDocument.id === node.id;
  const hasChildDocuments =
    !!node.children.length || activeDocument?.parentDocumentId === node.id;
  const document = documents.get(node.id);
  const { fetchChildDocuments } = documents;
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (isActiveDocument && hasChildDocuments) {
      fetchChildDocuments(node.id);
    }
  }, [fetchChildDocuments, node, hasChildDocuments, isActiveDocument]);

  const pathToNode = React.useMemo(
    () =>
      collection && collection.pathToDocument(node.id).map((entry) => entry.id),
    [collection, node]
  );

  const showChildren = React.useMemo(() => {
    return !!(
      hasChildDocuments &&
      activeDocument &&
      collection &&
      (collection
        .pathToDocument(activeDocument.id)
        .map((entry) => entry.id)
        .includes(node.id) ||
        isActiveDocument)
    );
  }, [hasChildDocuments, activeDocument, isActiveDocument, node, collection]);
  const [expanded, setExpanded] = React.useState(showChildren);

  React.useEffect(() => {
    if (showChildren) {
      setExpanded(showChildren);
    }
  }, [showChildren]);

  // when the last child document is removed,
  // also close the local folder state to closed
  React.useEffect(() => {
    if (expanded && !hasChildDocuments) {
      setExpanded(false);
    }
  }, [expanded, hasChildDocuments]);

  const handleDisclosureClick = React.useCallback(
    (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded(!expanded);
    },
    [expanded]
  );

  const handleMouseEnter = React.useCallback(() => {
    prefetchDocument(node.id);
  }, [prefetchDocument, node]);

  const handleTitleChange = React.useCallback(
    async (title: string) => {
      if (!document) return;
      await documents.update(
        {
          id: document.id,
          text: document.text,
          title,
        },
        {
          lastRevision: document.revision,
        }
      );
    },
    [documents, document]
  );
  const [menuOpen, handleMenuOpen, handleMenuClose] = useBoolean();
  const isMoving = documents.movingDocumentId === node.id;
  const manualSort = collection?.sort.field === "index";

  // Draggable
  const [{ isDragging }, drag] = useDrag({
    type: "document",
    item: () => ({
      ...node,
      depth,
      active: isActiveDocument,
      collectionId: collection?.id || "",
    }),
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => {
      return (
        !isDraft &&
        (policies.abilities(node.id).move ||
          policies.abilities(node.id).archive ||
          policies.abilities(node.id).delete)
      );
    },
  });

  const hoverExpanding = React.useRef<ReturnType<typeof setTimeout>>();

  // We set a timeout when the user first starts hovering over the document link,
  // to trigger expansion of children. Clear this timeout when they stop hovering.
  const resetHoverExpanding = React.useCallback(() => {
    if (hoverExpanding.current) {
      clearTimeout(hoverExpanding.current);
      hoverExpanding.current = undefined;
    }
  }, []);

  // Drop to re-parent
  const [{ isOverReparent, canDropToReparent }, dropToReparent] = useDrop({
    accept: "document",
    drop: (item: DragObject, monitor) => {
      if (monitor.didDrop()) return;
      if (!collection) return;
      documents.move(item.id, collection.id, node.id);
    },
    canDrop: (_item, monitor) =>
      !isDraft &&
      !!pathToNode &&
      !pathToNode.includes(monitor.getItem<DragObject>().id),
    hover: (item, monitor) => {
      // Enables expansion of document children when hovering over the document
      // for more than half a second.
      if (
        hasChildDocuments &&
        monitor.canDrop() &&
        monitor.isOver({
          shallow: true,
        })
      ) {
        if (!hoverExpanding.current) {
          hoverExpanding.current = setTimeout(() => {
            hoverExpanding.current = undefined;

            if (
              monitor.isOver({
                shallow: true,
              })
            ) {
              setExpanded(true);
            }
          }, 500);
        }
      }
    },
    collect: (monitor) => ({
      isOverReparent: !!monitor.isOver({
        shallow: true,
      }),
      canDropToReparent: monitor.canDrop(),
    }),
  });

  // Drop to reorder
  const [{ isOverReorder, isDraggingAnyDocument }, dropToReorder] = useDrop({
    accept: "document",
    drop: (item: DragObject) => {
      if (!collection) return;
      if (item.id === node.id) return;

      if (expanded) {
        documents.move(item.id, collection.id, node.id, 0);
        return;
      }

      documents.move(item.id, collection.id, parentId, index + 1);
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
      isDraggingAnyDocument: !!monitor.canDrop(),
    }),
  });

  const nodeChildren = React.useMemo(() => {
    if (
      collection &&
      activeDocument?.isDraft &&
      activeDocument?.isActive &&
      activeDocument?.parentDocumentId === node.id
    ) {
      return sortNavigationNodes(
        [activeDocument?.asNavigationNode, ...node.children],
        collection.sort
      );
    }

    return node.children;
  }, [
    activeDocument?.isActive,
    activeDocument?.isDraft,
    activeDocument?.parentDocumentId,
    activeDocument?.asNavigationNode,
    collection,
    node,
  ]);

  const handleTitleEditing = React.useCallback((isEditing: boolean) => {
    setIsEditing(isEditing);
  }, []);

  const title =
    (activeDocument?.id === node.id ? activeDocument.title : node.title) ||
    t("Untitled");

  const can = policies.abilities(node.id);

  return (
    <>
      <Relative onDragLeave={resetHoverExpanding}>
        <Draggable
          key={node.id}
          ref={drag}
          $isDragging={isDragging}
          $isMoving={isMoving}
        >
          <div ref={dropToReparent}>
            <DropToImport documentId={node.id} activeClassName="activeDropZone">
              <SidebarLink
                onMouseEnter={handleMouseEnter}
                to={{
                  pathname: node.url,
                  state: {
                    title: node.title,
                  },
                }}
                label={
                  <>
                    {hasChildDocuments && (
                      <Disclosure
                        expanded={expanded && !isDragging}
                        onClick={handleDisclosureClick}
                      />
                    )}
                    <EditableTitle
                      title={title}
                      onSubmit={handleTitleChange}
                      onEditing={handleTitleEditing}
                      canUpdate={canUpdate}
                      maxLength={MAX_TITLE_LENGTH}
                    />
                  </>
                }
                isActive={(match, location) =>
                  !!match && location.search !== "?starred"
                }
                isActiveDrop={isOverReparent && canDropToReparent}
                depth={depth}
                exact={false}
                showActions={menuOpen}
                scrollIntoViewIfNeeded={!document?.isStarred}
                isDraft={isDraft}
                ref={ref}
                menu={
                  document &&
                  !isMoving &&
                  !isEditing &&
                  !isDraggingAnyDocument ? (
                    <Fade>
                      {can.createChildDocument && (
                        <NudeButton
                          aria-label={t("New nested document")}
                          as={Link}
                          to={newDocumentPath(document.collectionId, {
                            parentDocumentId: document.id,
                          })}
                        >
                          <PlusIcon />
                        </NudeButton>
                      )}
                      <DocumentMenu
                        document={document}
                        onOpen={handleMenuOpen}
                        onClose={handleMenuClose}
                      />
                    </Fade>
                  ) : undefined
                }
              />
            </DropToImport>
          </div>
        </Draggable>
        {manualSort && isDraggingAnyDocument && (
          <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
        )}
      </Relative>
      {expanded &&
        !isDragging &&
        nodeChildren.map((childNode, index) => (
          <ObservedDocumentLink
            key={childNode.id}
            collection={collection}
            node={childNode}
            activeDocument={activeDocument}
            prefetchDocument={prefetchDocument}
            isDraft={childNode.isDraft}
            depth={depth + 1}
            canUpdate={canUpdate}
            index={index}
            parentId={node.id}
          />
        ))}
    </>
  );
}

const Relative = styled.div`
  position: relative;
`;

const Draggable = styled.div<{ $isDragging?: boolean; $isMoving?: boolean }>`
  opacity: ${(props) => (props.$isDragging || props.$isMoving ? 0.5 : 1)};
  pointer-events: ${(props) => (props.$isMoving ? "none" : "all")};
`;

const ObservedDocumentLink = observer(React.forwardRef(DocumentLink));

export default ObservedDocumentLink;
