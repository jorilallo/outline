import { observer } from "mobx-react";
import {
  TableOfContentsIcon,
  EditIcon,
  PlusIcon,
  MoonIcon,
  MoreIcon,
  SunIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Document from "models/Document";
import { Action, Separator } from "components/Actions";
import Badge from "components/Badge";
import Button from "components/Button";
import Collaborators from "components/Collaborators";
import DocumentBreadcrumb from "components/DocumentBreadcrumb";
import Header from "components/Header";
import Tooltip from "components/Tooltip";
import PublicBreadcrumb from "./PublicBreadcrumb";
import ShareButton from "./ShareButton";
import useCurrentTeam from "hooks/useCurrentTeam";
import useMobile from "hooks/useMobile";
import useStores from "hooks/useStores";
import DocumentMenu from "menus/DocumentMenu";
import NewChildDocumentMenu from "menus/NewChildDocumentMenu";
import TableOfContentsMenu from "menus/TableOfContentsMenu";
import TemplatesMenu from "menus/TemplatesMenu";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { NavigationNode } from "types";
import "types";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/keyboard' or its corresp... Remove this comment to see the full error message
import { metaDisplay } from "utils/keyboard";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { newDocumentPath, editDocumentUrl } from "utils/routeHelpers";

type Props = {
  document: Document;
  sharedTree: NavigationNode | null | undefined;
  shareId: string | null | undefined;
  isDraft: boolean;
  isEditing: boolean;
  isRevision: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  publishingIsDisabled: boolean;
  savingIsDisabled: boolean;
  onSelectTemplate: (template: Document) => void;
  onDiscard: () => void;
  onSave: (arg0: {
    done?: boolean;
    publish?: boolean;
    autosave?: boolean;
  }) => void;
  headings: {
    title: string;
    level: number;
    id: string;
  }[];
};

function DocumentHeader({
  document,
  shareId,
  isEditing,
  isDraft,
  isPublishing,
  isRevision,
  isSaving,
  savingIsDisabled,
  publishingIsDisabled,
  sharedTree,
  onSelectTemplate,
  onSave,
  headings,
}: Props) {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { ui, policies } = useStores();
  const { resolvedTheme } = ui;
  const isMobile = useMobile();
  const handleSave = React.useCallback(() => {
    onSave({
      done: true,
    });
  }, [onSave]);
  const handlePublish = React.useCallback(() => {
    onSave({
      done: true,
      publish: true,
    });
  }, [onSave]);
  const isNew = document.isNewDocument;
  const isTemplate = document.isTemplate;
  const can = policies.abilities(document.id);
  const canToggleEmbeds = team?.documentEmbeds;
  const canEdit = can.update && !isEditing;
  const toc = (
    <Tooltip
      tooltip={ui.tocVisible ? t("Hide contents") : t("Show contents")}
      shortcut="ctrl+alt+h"
      delay={250}
      placement="bottom"
    >
      <Button
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ onClick: any; icon: Element; iconColor: st... Remove this comment to see the full error message
        onClick={
          ui.tocVisible ? ui.hideTableOfContents : ui.showTableOfContents
        }
        icon={<TableOfContentsIcon />}
        iconColor="currentColor"
        borderOnHover
        neutral
      />
    </Tooltip>
  );
  const editAction = (
    <Action>
      <Tooltip
        tooltip={t("Edit {{noun}}", {
          noun: document.noun,
        })}
        shortcut="e"
        delay={500}
        placement="bottom"
      >
        <Button
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: HTMLCollection; as: <S = unknown... Remove this comment to see the full error message
          as={Link}
          icon={<EditIcon />}
          to={editDocumentUrl(document)}
          neutral
        >
          {t("Edit")}
        </Button>
      </Tooltip>
    </Action>
  );
  const appearanceAction = (
    <Action>
      <Tooltip
        tooltip={
          resolvedTheme === "light" ? t("Switch to dark") : t("Switch to light")
        }
        delay={500}
        placement="bottom"
      >
        <Button
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ icon: Element; onClick: () => any; neutral... Remove this comment to see the full error message
          icon={resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}
          onClick={() =>
            ui.setTheme(resolvedTheme === "light" ? "dark" : "light")
          }
          neutral
          borderOnHover
        />
      </Tooltip>
    </Action>
  );

  if (shareId) {
    return (
      <Header
        title={document.title}
        breadcrumb={
          <PublicBreadcrumb
            documentId={document.id}
            shareId={shareId}
            sharedTree={sharedTree}
          >
            {toc}
          </PublicBreadcrumb>
        }
        actions={
          <>
            {appearanceAction}
            {canEdit ? editAction : <div />}
          </>
        }
      />
    );
  }

  return (
    <>
      <Header
        breadcrumb={
          // @ts-expect-error ts-migrate(2741) FIXME: Property 'onlyText' is missing in type '{ children... Remove this comment to see the full error message
          <DocumentBreadcrumb document={document}>
            {!isEditing && toc}
          </DocumentBreadcrumb>
        }
        title={
          <>
            {document.title}{" "}
            {document.isArchived && <Badge>{t("Archived")}</Badge>}
          </>
        }
        actions={
          <>
            {isMobile && (
              <TocWrapper>
                <TableOfContentsMenu headings={headings} />
              </TocWrapper>
            )}
            {!isPublishing && isSaving && !team.collaborativeEditing && (
              <Status>{t("Saving")}…</Status>
            )}
            <Collaborators document={document} />
            {isEditing && !isTemplate && isNew && (
              <Action>
                <TemplatesMenu
                  document={document}
                  onSelectTemplate={onSelectTemplate}
                />
              </Action>
            )}
            {!isEditing && (!isMobile || !isTemplate) && (
              <Action>
                <ShareButton document={document} />
              </Action>
            )}
            {isEditing && (
              <>
                <Action>
                  <Tooltip
                    tooltip={t("Save")}
                    shortcut={`${metaDisplay}+enter`}
                    delay={500}
                    placement="bottom"
                  >
                    <Button
                      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: HTMLCollection; onClick: () => v... Remove this comment to see the full error message
                      onClick={handleSave}
                      disabled={savingIsDisabled}
                      neutral={isDraft}
                    >
                      {isDraft ? t("Save Draft") : t("Done Editing")}
                    </Button>
                  </Tooltip>
                </Action>
              </>
            )}
            {canEdit && !team.collaborativeEditing && editAction}
            {canEdit && can.createChildDocument && !isMobile && (
              <Action>
                <NewChildDocumentMenu
                  document={document}
                  label={(props) => (
                    <Tooltip
                      tooltip={t("New document")}
                      shortcut="n"
                      delay={500}
                      placement="bottom"
                    >
                      <Button icon={<PlusIcon />} {...props} neutral>
                        {t("New doc")}
                      </Button>
                    </Tooltip>
                  )}
                />
              </Action>
            )}
            {canEdit && isTemplate && !isDraft && !isRevision && (
              <Action>
                <Button
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: HTMLCollection; icon: Element; a... Remove this comment to see the full error message
                  icon={<PlusIcon />}
                  as={Link}
                  to={newDocumentPath(document.collectionId, {
                    templateId: document.id,
                  })}
                  primary
                >
                  {t("New from template")}
                </Button>
              </Action>
            )}
            {can.update && isDraft && !isRevision && (
              <Action>
                <Tooltip
                  tooltip={t("Publish")}
                  shortcut={`${metaDisplay}+shift+p`}
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    onClick={handlePublish}
                    disabled={publishingIsDisabled}
                  >
                    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string | HTMLCollection' is not assignable t... Remove this comment to see the full error message
                    {isPublishing ? `${t("Publishing")}…` : t("Publish")}
                  </Button>
                </Tooltip>
              </Action>
            )}
            {!isEditing && (
              <>
                <Separator />
                <Action>
                  // @ts-expect-error ts-migrate(2741) FIXME: Property 'className' is missing in type '{ documen... Remove this comment to see the full error message
                  <DocumentMenu
                    document={document}
                    isRevision={isRevision}
                    label={(props) => (
                      <Button
                        icon={<MoreIcon />}
                        iconColor="currentColor"
                        {...props}
                        borderOnHover
                        neutral
                      />
                    )}
                    showToggleEmbeds={canToggleEmbeds}
                    showPrint
                  />
                </Action>
              </>
            )}
          </>
        }
      />
    </>
  );
}

const Status = styled(Action)`
  padding-left: 0;
  padding-right: 4px;
  color: ${(props) => props.theme.slate};
`;
const TocWrapper = styled(Action)`
  position: absolute;
  left: 42px;
`;

export default observer(DocumentHeader);
