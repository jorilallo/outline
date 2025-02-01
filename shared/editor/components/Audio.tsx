import * as React from "react";
import styled, { css } from "styled-components";
import { sanitizeUrl } from "../../utils/urls";
import { ComponentProps } from "../types";

type Props = ComponentProps & {
  children?: React.ReactElement;
};

export default function Audio(props: Props) {
  const { isSelected, node, children } = props;
  const ref = React.useRef<HTMLDivElement>(null);

  return (
    <div contentEditable={false} ref={ref}>
      <AudioWrapper className={isSelected ? "ProseMirror-selectednode" : ""}>
        <StyledAudio
          src={sanitizeUrl(node.attrs.src)}
          title={node.attrs.title}
          controls
        />
      </AudioWrapper>
      {children}
    </div>
  );
}

export const audioStyle = css`
  width: 100%;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text} !important;
  margin: -2px;
  padding: 2px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px ${(props) => props.theme.divider};
`;

const StyledAudio = styled.audio`
  ${audioStyle}
`;

const AudioWrapper = styled.div`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  cursor: default;
  border-radius: 8px;
  user-select: none;
  max-width: 100%;
  overflow: hidden;
`;
