import { Fragment, Node, NodeType } from "prosemirror-model";
import {
  Command,
  EditorState,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import {
  CellSelection,
  addRow,
  selectedRect,
  tableNodeTypes,
} from "prosemirror-tables";
import { getCellsInColumn } from "../queries/table";

export function createTable(
  state: EditorState,
  rowsCount: number,
  colsCount: number,
  withHeaderRow = true,
  cellContent?: Node
) {
  const types = tableNodeTypes(state.schema);
  const headerCells: Node[] = [];
  const cells: Node[] = [];
  const rows: Node[] = [];

  const createCell = (
    cellType: NodeType,
    cellContent: Fragment | Node | readonly Node[] | null | undefined
  ) =>
    cellContent
      ? cellType.createChecked(null, cellContent)
      : cellType.createAndFill();

  for (let index = 0; index < colsCount; index += 1) {
    const cell = createCell(types.cell, cellContent);

    if (cell) {
      cells.push(cell);
    }

    if (withHeaderRow) {
      const headerCell = createCell(types.header_cell, cellContent);

      if (headerCell) {
        headerCells.push(headerCell);
      }
    }
  }

  for (let index = 0; index < rowsCount; index += 1) {
    rows.push(
      types.row.createChecked(
        null,
        withHeaderRow && index === 0 ? headerCells : cells
      )
    );
  }

  return types.table.createChecked(null, rows);
}

export function addRowAfterAndMoveSelection({
  index,
}: {
  index?: number;
} = {}): Command {
  return (state, dispatch) => {
    if (dispatch) {
      const rect = selectedRect(state);
      const indexAfter = index !== undefined ? index + 1 : rect.bottom;
      const tr = addRow(state.tr, rect, indexAfter);
      const cells = getCellsInColumn(0)(state);

      if (index !== undefined) {
        const pos = cells[Math.min(cells.length - 1, indexAfter)];
        const $pos = tr.doc.resolve(pos);
        dispatch(tr.setSelection(TextSelection.near($pos)));
      } else {
        const $pos = tr.doc.resolve(rect.tableStart + rect.table.nodeSize);
        dispatch(tr.setSelection(TextSelection.near($pos)));
      }
    }

    return true;
  };
}

export function setColumnAttr({
  index,
  alignment,
}: {
  index: number;
  alignment: string;
}): Command {
  return (state, dispatch) => {
    if (dispatch) {
      const cells = getCellsInColumn(index)(state) || [];
      let transaction = state.tr;
      cells.forEach((pos) => {
        transaction = transaction.setNodeMarkup(pos, undefined, {
          alignment,
        });
      });
      dispatch(transaction);
    }
    return true;
  };
}

export function selectRow(index: number) {
  return (state: EditorState): Transaction => {
    const rect = selectedRect(state);
    const pos = rect.map.positionAt(index, 0, rect.table);
    const $pos = state.doc.resolve(rect.tableStart + pos);
    const rowSelection = CellSelection.rowSelection($pos);
    return state.tr.setSelection(rowSelection);
  };
}

export function selectColumn(index: number) {
  return (state: EditorState): Transaction => {
    const rect = selectedRect(state);
    const pos = rect.map.positionAt(0, index, rect.table);
    const $pos = state.doc.resolve(rect.tableStart + pos);
    const colSelection = CellSelection.colSelection($pos);
    return state.tr.setSelection(colSelection);
  };
}

export function selectTable(state: EditorState): Transaction {
  const rect = selectedRect(state);
  const map = rect.map.map;
  const $anchor = state.doc.resolve(rect.tableStart + map[0]);
  const $head = state.doc.resolve(rect.tableStart + map[map.length - 1]);
  const tableSelection = new CellSelection($anchor, $head);
  return state.tr.setSelection(tableSelection);
}
