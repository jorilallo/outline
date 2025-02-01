import * as React from "react";
import { DocumentPermission } from "@shared/types";
import { Document, GroupMembership, UserMembership } from "@server/models";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  documentId: string;
  membershipId?: string;
  actorName: string;
  teamUrl: string;
};

type BeforeSend = {
  document: Document;
  membership: UserMembership | GroupMembership;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when someone adds them to a document.
 */
export default class DocumentSharedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ documentId, membershipId }: InputProps) {
    if (!membershipId) {
      return false;
    }

    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const membership =
      (await UserMembership.findByPk(membershipId)) ??
      (await GroupMembership.findByPk(membershipId));

    if (!membership) {
      return false;
    }

    return { document, membership };
  }

  protected subject({ actorName, document }: Props) {
    return `${actorName} shared “${document.titleWithDefault}” with you`;
  }

  protected preview({ actorName }: Props): string {
    return `${actorName} shared a document`;
  }

  protected fromName({ actorName }: Props) {
    return actorName;
  }

  protected renderAsText({ actorName, teamUrl, document }: Props): string {
    return `
${actorName} shared “${document.titleWithDefault}” with you.

View Document: ${teamUrl}${document.path}
`;
  }

  protected render(props: Props) {
    const { document, membership, actorName, teamUrl } = props;
    const documentUrl = `${teamUrl}${document.path}?ref=notification-email`;

    const permission =
      membership.permission === DocumentPermission.Read ? "view" : "edit";

    return (
      <EmailTemplate
        previewText={this.preview(props)}
        goToAction={{ url: documentUrl, name: "View Document" }}
      >
        <Header />

        <Body>
          <Heading>{document.titleWithDefault}</Heading>
          <p>
            {actorName} invited you to {permission} the{" "}
            <a href={documentUrl}>{document.titleWithDefault}</a> document.
          </p>
          <p>
            <Button href={documentUrl}>View Document</Button>
          </p>
        </Body>
      </EmailTemplate>
    );
  }
}
