// @flow
import * as React from 'react';
import invariant from 'invariant';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { PortalWithState } from 'react-portal';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';
import { fadeAndScaleIn } from 'shared/styles/animations';

let previousClosePortal;

type Children =
  | React.Node
  | ((options: { closePortal: () => void }) => React.Node);

type Props = {
  label: React.Node,
  onOpen?: () => void,
  onClose?: () => void,
  children?: Children,
  className?: string,
  style?: Object,
  position?: 'left' | 'right' | 'center',
};

@observer
class DropdownMenu extends React.Component<Props> {
  @observable top: ?number;
  @observable bottom: ?number;
  @observable right: ?number;
  @observable left: ?number;
  @observable position: 'left' | 'right' | 'center';
  @observable fixed: ?boolean;
  @observable bodyRect: ClientRect;
  @observable labelRect: ClientRect;
  @observable dropdownRef: { current: null | HTMLElement } = React.createRef();

  handleOpen = (
    openPortal: (SyntheticEvent<>) => void,
    closePortal: () => void
  ) => {
    return (ev: SyntheticMouseEvent<HTMLElement>) => {
      ev.preventDefault();
      const currentTarget = ev.currentTarget;
      invariant(document.body, 'why you not here');

      if (currentTarget instanceof HTMLDivElement) {
        this.bodyRect = document.body.getBoundingClientRect();
        this.labelRect = currentTarget.getBoundingClientRect();
        this.top = this.labelRect.bottom - this.bodyRect.top;
        this.bottom = undefined;
        this.position = this.props.position || 'left';

        if (currentTarget.parentElement) {
          const triggerParentStyle = getComputedStyle(
            currentTarget.parentElement
          );

          if (triggerParentStyle.position === 'static') {
            this.fixed = true;
            this.top = this.labelRect.bottom;
          }
        }

        this.initPosition();

        // attempt to keep only one flyout menu open at once
        if (previousClosePortal) {
          previousClosePortal();
        }
        previousClosePortal = closePortal;
        openPortal(ev);
      }
    };
  };

  initPosition() {
    if (this.position === 'left') {
      this.right =
        this.bodyRect.width - this.labelRect.left - this.labelRect.width;
    } else if (this.position === 'center') {
      this.left = this.labelRect.left + this.labelRect.width / 2;
    } else {
      this.left = this.labelRect.left;
    }
  }

  onOpen(originalFunction?: () => void) {
    if (typeof originalFunction === 'function') {
      originalFunction();
    }
    this.fitOnTheScreen();
  }

  fitOnTheScreen() {
    if (!this.dropdownRef || !this.dropdownRef.current) return;
    const el = this.dropdownRef.current;

    const sticksOutPastBottomEdge =
      el.clientHeight + this.top > window.innerHeight;
    if (sticksOutPastBottomEdge) {
      this.top = undefined;
      this.bottom = this.fixed ? 0 : -1 * window.pageYOffset;
    } else {
      this.bottom = undefined;
    }

    if (this.position === 'left' || this.position === 'right') {
      const totalWidth =
        Math.sign(this.position === 'left' ? -1 : 1) * el.offsetLeft +
        el.scrollWidth;
      const isVisible = totalWidth < window.innerWidth;

      if (!isVisible) {
        if (this.position === 'right') {
          this.position = 'left';
          this.left = undefined;
        } else if (this.position === 'left') {
          this.position = 'right';
          this.right = undefined;
        }
      }
    }

    this.initPosition();
    this.forceUpdate();
  }

  render() {
    const { className, label, children } = this.props;

    return (
      <div className={className}>
        <PortalWithState
          onOpen={this.onOpen.bind(this, this.props.onOpen)}
          onClose={this.props.onClose}
          closeOnOutsideClick
          closeOnEsc
        >
          {({ closePortal, openPortal, portal }) => (
            <React.Fragment>
              <Label onClick={this.handleOpen(openPortal, closePortal)}>
                {label}
              </Label>
              {portal(
                <Position
                  ref={this.dropdownRef}
                  position={this.position}
                  fixed={this.fixed}
                  top={this.top}
                  bottom={this.bottom}
                  left={this.left}
                  right={this.right}
                >
                  <Menu
                    onClick={
                      typeof children === 'function'
                        ? undefined
                        : ev => {
                            ev.stopPropagation();
                            closePortal();
                          }
                    }
                    style={this.props.style}
                  >
                    {typeof children === 'function'
                      ? children({ closePortal })
                      : children}
                  </Menu>
                </Position>
              )}
            </React.Fragment>
          )}
        </PortalWithState>
      </div>
    );
  }
}

const Label = styled(Flex).attrs({
  justify: 'center',
  align: 'center',
})`
  z-index: 1000;
  cursor: pointer;
`;

const Position = styled.div`
  position: ${({ fixed }) => (fixed ? 'fixed' : 'absolute')};
  display: flex;
  ${({ left }) => (left !== undefined ? `left: ${left}px` : '')};
  ${({ right }) => (right !== undefined ? `right: ${right}px` : '')};
  ${({ top }) => (top !== undefined ? `top: ${top}px` : '')};
  ${({ bottom }) => (bottom !== undefined ? `bottom: ${bottom}px` : '')};
  max-height: 75%;
  z-index: 1000;
  transform: ${props =>
    props.position === 'center' ? 'translateX(-50%)' : 'initial'};
`;

const Menu = styled.div`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: ${props => (props.left !== undefined ? '25%' : '75%')} 0;
  background: ${props => props.theme.menuBackground};
  border-radius: 2px;
  padding: 0.5em 0;
  min-width: 180px;
  overflow: hidden;
  overflow-y: auto;
  box-shadow: ${props => props.theme.menuShadow};

  @media print {
    display: none;
  }
`;

export default DropdownMenu;
