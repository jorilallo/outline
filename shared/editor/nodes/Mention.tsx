import { Token } from "markdown-it";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command, TextSelection } from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { MentionType } from "../../types";
import { MentionDocument, MentionUser } from "../components/Mentions";
import Extension from "../lib/Extension";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import mentionRule from "../rules/mention";
import { ComponentProps } from "../types";

export default class Mention extends Extension {
  get type() {
    return "node";
  }

  get name() {
    return "mention";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        type: {},
        label: {},
        modelId: {},
        actorId: {
          default: undefined,
        },
        id: {
          default: undefined,
        },
      },
      inline: true,
      content: "text*",
      marks: "",
      group: "inline",
      atom: true,
      parseDOM: [
        {
          tag: `.${this.name}`,
          preserveWhitespace: "full",
          priority: 100,
          getAttrs: (dom: HTMLElement) => {
            const type = dom.dataset.type;
            const modelId = dom.dataset.id;
            if (!type || !modelId) {
              return false;
            }

            return {
              type,
              modelId,
              actorId: dom.dataset.actorId,
              label: dom.innerText,
              id: dom.id,
            };
          },
        },
      ],
      toDOM: (node) => [
        node.attrs.type === MentionType.User ? "span" : "a",
        {
          class: `${node.type.name} use-hover-preview`,
          id: node.attrs.id,
          href:
            node.attrs.type === MentionType.User
              ? undefined
              : `/doc/${node.attrs.modelId}`,
          "data-type": node.attrs.type,
          "data-id": node.attrs.modelId,
          "data-actorId": node.attrs.actorId,
          "data-url": `mention://${node.attrs.id}/${node.attrs.type}/${node.attrs.modelId}`,
        },
        String(node.attrs.label),
      ],
      toPlainText: (node) => `@${node.attrs.label}`,
    };
  }

  component = (props: ComponentProps) => {
    switch (props.node.attrs.type) {
      case MentionType.User:
        return <MentionUser {...props} />;
      case MentionType.Document:
        return <MentionDocument {...props} />;
      default:
        return null;
    }
  };

  get rulePlugins() {
    return [mentionRule];
  }

  commands({ type }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, Primitive>): Command =>
      (state, dispatch) => {
        const { selection } = state;
        const position =
          selection instanceof TextSelection
            ? selection.$cursor?.pos
            : selection.$to.pos;
        if (position === undefined) {
          return false;
        }

        const node = type.create(attrs);
        const transaction = state.tr.insert(position, node);
        dispatch?.(transaction);
        return true;
      };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    const mType = node.attrs.type;
    const mId = node.attrs.modelId;
    const label = node.attrs.label;
    const id = node.attrs.id;

    state.write(`@[${label}](mention://${id}/${mType}/${mId})`);
  }

  parseMarkdown() {
    return {
      node: "mention",
      getAttrs: (tok: Token) => ({
        id: tok.attrGet("id"),
        type: tok.attrGet("type"),
        modelId: tok.attrGet("modelId"),
        label: tok.content,
      }),
    };
  }
}
