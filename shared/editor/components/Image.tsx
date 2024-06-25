import { DownloadIcon } from "outline-icons";
import type { EditorView } from "prosemirror-view";
import * as React from "react";
import styled from "styled-components";
import { s } from "../../styles";
import { sanitizeUrl } from "../../utils/urls";
import { ComponentProps } from "../types";
import { ImageZoom } from "./ImageZoom";
import { ResizeLeft, ResizeRight } from "./ResizeHandle";
import useDragResize from "./hooks/useDragResize";

type Props = ComponentProps & {
  /** Callback triggered when the image is clicked */
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Callback triggered when the download button is clicked */
  onDownload?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Callback triggered when the image is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
  /** The editor view */
  view: EditorView;
  children?: React.ReactElement;
};

const Image = (props: Props) => {
  const { isSelected, node, isEditable, onChangeSize } = props;
  const { src, layoutClass } = node.attrs;
  const className = layoutClass ? `image image-${layoutClass}` : "image";
  const [loaded, setLoaded] = React.useState(false);
  const [naturalWidth, setNaturalWidth] = React.useState(node.attrs.width);
  const [naturalHeight, setNaturalHeight] = React.useState(node.attrs.height);
  const ref = React.useRef<HTMLDivElement>(null);
  const { width, height, setSize, handlePointerDown, dragging } = useDragResize(
    {
      width: node.attrs.width ?? naturalWidth,
      height: node.attrs.height ?? naturalHeight,
      naturalWidth,
      naturalHeight,
      gridSnap: 5,
      onChangeSize,
      ref,
    }
  );

  const isFullWidth = layoutClass === "full-width";
  const isResizable = !!props.onChangeSize;

  React.useEffect(() => {
    if (node.attrs.width && node.attrs.width !== width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
  }, [node.attrs.width]);

  const widthStyle = isFullWidth
    ? { width: "var(--container-width)" }
    : { width: width || "auto" };

  return (
    <div contentEditable={false} className={className} ref={ref}>
      <ImageWrapper
        isFullWidth={isFullWidth}
        className={isSelected || dragging ? "ProseMirror-selectednode" : ""}
        onClick={dragging ? undefined : props.onClick}
        style={widthStyle}
      >
        {!dragging && width > 60 && props.onDownload && (
          <Button onClick={props.onDownload}>
            <DownloadIcon />
          </Button>
        )}
        <ImageZoom caption={props.node.attrs.alt}>
          <img
            style={{
              ...widthStyle,
              display: loaded ? "block" : "none",
            }}
            src={sanitizeUrl(src) ?? ""}
            onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
              // For some SVG's Firefox does not provide the naturalWidth, in this
              // rare case we need to provide a default so that the image can be
              // seen and is not sized to 0px
              let nw = (ev.target as HTMLImageElement).naturalWidth || 300;
              let nh = (ev.target as HTMLImageElement).naturalHeight;

              // If the natural image width is greater than nwMax
              // cap it at nwMax to make it more manageable
              const nwMax = 400;
              if (nw > nwMax) {
                const ratio = nwMax / nw;
                const calcHeight = nh * ratio;

                nw = nwMax;
                nh = calcHeight;
              }

              setNaturalWidth(nw);
              setNaturalHeight(nh);
              setLoaded(true);

              if (!node.attrs.width) {
                setSize((state) => ({
                  ...state,
                  width: nw,
                }));
              }
            }}
          />
          {!loaded && width && height && (
            <img
              style={{
                ...widthStyle,
                display: "block",
              }}
              src={`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                getPlaceholder(width, height)
              )}`}
            />
          )}
        </ImageZoom>
        {isEditable && !isFullWidth && isResizable && (
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
      </ImageWrapper>
      {isFullWidth && props.children
        ? React.cloneElement(props.children, { style: widthStyle })
        : props.children}
    </div>
  );
};

function getPlaceholder(width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" />`;
}

const Button = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  border: 0;
  margin: 0;
  padding: 0;
  border-radius: 4px;
  background: ${s("background")};
  color: ${s("textSecondary")};
  width: 24px;
  height: 24px;
  display: inline-block;
  cursor: var(--pointer);
  opacity: 0;
  transition: opacity 150ms ease-in-out;

  &:active {
    transform: scale(0.98);
  }

  &:hover {
    color: ${s("text")};
    opacity: 1;
  }
`;

const ImageWrapper = styled.div<{ isFullWidth: boolean }>`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: ${(props) => (props.isFullWidth ? "initial" : "100%")};
  transition-property: width, height;
  transition-duration: ${(props) => (props.isFullWidth ? "0ms" : "150ms")};
  transition-timing-function: ease-in-out;
  overflow: hidden;

  img {
    transition-property: width, height;
    transition-duration: ${(props) => (props.isFullWidth ? "0ms" : "150ms")};
    transition-timing-function: ease-in-out;
  }

  &:hover {
    ${Button} {
      opacity: 0.9;
    }

    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }
`;

export default Image;
