import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { TFunction, withTranslation } from "react-i18next";

import styled from "styled-components";
import User from "models/User";
import Avatar from "components/Avatar";
import Tooltip from "components/Tooltip";
import UserProfile from "../../scenes/UserProfile";

type Props = {
  user: User;
  isPresent: boolean;
  isEditing: boolean;
  isCurrentUser: boolean;
  profileOnClick: boolean;
  t: TFunction;
};

@observer
class AvatarWithPresence extends React.Component<Props> {
  @observable
  isOpen = false;

  handleOpenProfile = () => {
    this.isOpen = true;
  };

  handleCloseProfile = () => {
    this.isOpen = false;
  };

  render() {
    const { user, isPresent, isEditing, isCurrentUser, t } = this.props;
    const action = isPresent
      ? isEditing
        ? t("currently editing")
        : t("currently viewing")
      : t("previously edited");
    return (
      <>
        <Tooltip
          tooltip={
            <Centered>
              <strong>{user.name}</strong> {isCurrentUser && `(${t("You")})`}
              {action && (
                <>
                  <br />
                  {action}
                </>
              )}
            </Centered>
          }
          placement="bottom"
        >
          <AvatarWrapper isPresent={isPresent}>
            <Avatar
              src={user.avatarUrl}
              onClick={
                this.props.profileOnClick === false
                  ? undefined
                  : this.handleOpenProfile
              }
              size={32}
            />
          </AvatarWrapper>
        </Tooltip>
        <UserProfile
          user={user}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ user: User; isOpen: boolean; onRequestClos... Remove this comment to see the full error message
          isOpen={this.isOpen}
          onRequestClose={this.handleCloseProfile}
        />
      </>
    );
  }
}

const Centered = styled.div`
  text-align: center;
`;
const AvatarWrapper = styled.div<{ isPresent: boolean }>`
  opacity: ${(props) => (props.isPresent ? 1 : 0.5)};
  transition: opacity 250ms ease-in-out;
`;

// @ts-expect-error ts-migrate(2344) FIXME: Type 'AvatarWithPresence' does not satisfy the con... Remove this comment to see the full error message
export default withTranslation()<AvatarWithPresence>(AvatarWithPresence);
