import { NodeSpec } from "prosemirror-model";
import Node from "./Node";

export default class ToggleBlock extends Node {
  get name() {
    return "toggle_block";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      group: "block",
      toDOM: () => ["div", { class: "toggle-block" }, 0],
    };
  }
}
