// @flow
import React, { PureComponent } from 'react';
import copy from 'copy-to-clipboard';

type Props = {
  text: string,
  children?: React.Element<any>,
  onClick?: () => void,
  onCopy: () => void,
};

class CopyToClipboard extends PureComponent {
  props: Props;

  onClick = (ev: SyntheticEvent) => {
    const { text, onCopy, children } = this.props;
    const elem = React.Children.only(children);
    copy(text, {
      debug: __DEV__,
    });

    if (onCopy) onCopy();

    if (elem && elem.props && typeof elem.props.onClick === 'function') {
      elem.props.onClick(ev);
    }
  };

  render() {
    const { text: _text, onCopy: _onCopy, children, ...rest } = this.props;
    const elem = React.Children.only(children);
    return React.cloneElement(elem, { ...rest, onClick: this.onClick });
  }
}

export default CopyToClipboard;
