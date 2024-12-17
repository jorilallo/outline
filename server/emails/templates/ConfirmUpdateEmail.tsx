import * as React from "react";
import env from "@server/env";
import BaseEmail, { EmailMessageCategory, EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
  code: string;
};

/**
 * Email sent to a user when they request to change their email.
 */
export default class ConfirmUpdateEmail extends BaseEmail<Props> {
  protected get category() {
    return EmailMessageCategory.Authentication;
  }

  protected subject() {
    return `Your email update request`;
  }

  protected preview() {
    return `Here’s your email change confirmation.`;
  }

  protected renderAsText({ code }: Props): string {
    return `
You requested to update your ${env.APP_NAME} account email. Please
follow the link below to confirm the change.

  ${this.updateLink(code)}

  `;
  }

  protected render({ code }: Props) {
    return (
      <EmailTemplate previewText={this.preview()}>
        <Header />

        <Body>
          <Heading>Your email update request</Heading>
          <p>
            You requested to update your {env.APP_NAME} account email. Please
            click below to confirm the change.
          </p>
          <EmptySpace height={5} />
          <p>
            <Button href={this.updateLink(code)}>Confirm Change</Button>
          </p>
        </Body>

        <Footer />
      </EmailTemplate>
    );
  }

  private updateLink(code: string): string {
    return `${env.URL}/api/users.updateEmail?code=${code}`;
  }
}