import { Token } from "markdown-it";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { NodeSelection, TextSelection } from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { sanitizeUrl } from "../../utils/urls";
import toggleWrap from "../commands/toggleWrap";
import AudioComponent from "../components/Audio";
import Caption from "../components/Caption";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/links";
import { ComponentProps } from "../types";
import Node from "./Node";

export default class Audio extends Node {
  get name() {
    return "audio";
  }

  get rulePlugins() {
    return [attachmentsRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        id: {
          default: null,
        },
        src: {
          default: null,
        },
        title: {},
      },
      group: "block",
      selectable: true,
      draggable: false,
      defining: true,
      atom: true,
      parseDOM: [
        {
          priority: 100,
          tag: "audio",
          getAttrs: (dom: HTMLAudioElement) => ({
            id: dom.id,
            title: dom.getAttribute("title"),
            src: dom.getAttribute("src"),
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: "audio",
        },
        [
          "audio",
          {
            id: node.attrs.id,
            src: sanitizeUrl(node.attrs.src),
            controls: true,
          },
          String(node.attrs.title),
        ],
      ],
      toPlainText: (node) => node.attrs.title,
    };
  }

  handleSelect =
    ({ getPos }: { getPos: () => number }) =>
    () => {
      const { view } = this.editor;
      const $pos = view.state.doc.resolve(getPos());
      const transaction = view.state.tr.setSelection(new NodeSelection($pos));
      view.dispatch(transaction);
    };

  handleCaptionKeyDown =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (event: React.KeyboardEvent<HTMLParagraphElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();

        const { view } = this.editor;
        const $pos = view.state.doc.resolve(getPos() + node.nodeSize);
        view.dispatch(
          view.state.tr.setSelection(TextSelection.near($pos)).scrollIntoView()
        );
        view.focus();
        return;
      }

      if (event.key === "Backspace" && event.currentTarget.innerText === "") {
        event.preventDefault();
        event.stopPropagation();
        const { view } = this.editor;
        const $pos = view.state.doc.resolve(getPos());
        const tr = view.state.tr.setSelection(new NodeSelection($pos));
        view.dispatch(tr);
        view.focus();
        return;
      }
    };

  handleCaptionBlur =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (event: React.FocusEvent<HTMLParagraphElement>) => {
      const caption = event.currentTarget.innerText;
      if (caption === node.attrs.title) {
        return;
      }

      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        title: caption,
      });
      view.dispatch(transaction);
    };

  component = (props: ComponentProps) => (
    <AudioComponent {...props}>
      <Caption
        onBlur={this.handleCaptionBlur(props)}
        onKeyDown={this.handleCaptionKeyDown(props)}
        isSelected={props.isSelected}
        placeholder={this.options.dictionary.audioCaptionPlaceholder}
      >
        {props.node.attrs.title}
      </Caption>
    </AudioComponent>
  );

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, Primitive>) => toggleWrap(type, attrs);
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    state.write(`[${node.attrs.title}](${node.attrs.src})\n\n`);
    state.ensureNewLine();
  }

  parseMarkdown() {
    return {
      node: "audio",
      getAttrs: (tok: Token) => ({
        src: tok.attrGet("src"),
        title: tok.attrGet("title"),
      }),
    };
  }
}
