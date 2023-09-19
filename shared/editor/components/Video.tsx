import * as React from "react";
import styled from "styled-components";
import { ComponentProps } from "../types";
import { ResizeLeft, ResizeRight } from "./ResizeHandle";
import useComponentSize from "./hooks/useComponentSize";
import useDragResize from "./hooks/useDragResize";

type Props = ComponentProps & {
  /** Callback triggered when the video is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
  isSelected: boolean;
};

export default function Video(props: Props) {
  const { isSelected, node, isEditable, onChangeSize } = props;
  const [naturalWidth] = React.useState(node.attrs.width);
  const [naturalHeight] = React.useState(node.attrs.height);
  const documentBounds = useComponentSize(props.view.dom);
  const isResizable = !!onChangeSize;

  const { width, height, setSize, handlePointerDown, dragging } = useDragResize(
    {
      width: node.attrs.width ?? naturalWidth,
      height: node.attrs.height ?? naturalHeight,
      minWidth: documentBounds.width * 0.1,
      maxWidth: documentBounds.width,
      naturalWidth,
      naturalHeight,
      gridWidth: documentBounds.width / 10,
      onChangeSize,
    }
  );

  React.useEffect(() => {
    if (node.attrs.width && node.attrs.width !== width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
  }, [node.attrs.width]);

  return (
    <VideoWrapper
      className={isSelected ? "ProseMirror-selectednode" : ""}
      style={{ width: width || "auto" }}
    >
      <StyledVideo
        src={node.attrs.src}
        title={node.attrs.title}
        width={width}
        height={height}
        controls
      />
      {isEditable && isResizable && (
        <>
          <ResizeLeft
            onPointerDown={handlePointerDown("left")}
            $dragging={!!dragging}
          />
          <ResizeRight
            onPointerDown={handlePointerDown("right")}
            $dragging={!!dragging}
          />
        </>
      )}
    </VideoWrapper>
  );
}

const StyledVideo = styled.video`
  max-width: 840px;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text} !important;
  margin: -2px;
  padding: 2px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px ${(props) => props.theme.divider};
`;

const VideoWrapper = styled.div`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  white-space: nowrap;
  cursor: default;
  border-radius: 8px;
  user-select: none;
  max-width: 100%;

  transition-property: width, height;
  transition-duration: 150ms;
  transition-timing-function: ease-in-out;

  video {
    transition-property: width, height;
    transition-duration: 150ms;
    transition-timing-function: ease-in-out;
  }

  &:hover {
    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }
`;
