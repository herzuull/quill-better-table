import Quill from 'quill'
import Delta from 'quill-delta'
import TableColumnTool from './modules/table-column-tool'
import TableSelection from './modules/table-selection'
import TableOperationMenu from './modules/table-operation-menu'

const Module = Quill.import('core/module')

import {
  TableCol,
  TableColGroup,
  TableCellLine,
  TableCell,
  TableRow,
  TableBody,
  TableContainer,
  TableViewWrapper,
  rowId,
  cellId
} from './formats/table';

class BetterTable extends Module {
  static register() {
    Quill.register(TableCol, true);
    Quill.register(TableColGroup, true);
    Quill.register(TableCellLine, true);
    Quill.register(TableCell, true);
    Quill.register(TableRow, true);
    Quill.register(TableBody, true);
    Quill.register(TableContainer, true);
    Quill.register(TableViewWrapper, true);
  }

  constructor(quill, options) {
    super(quill, options);

    this.quill.root.addEventListener('click', (evt) => {
      if (!evt.path || evt.path.length <= 0) return

      const tableNode = evt.path.filter(node => {
        return node.tagName &&
          node.tagName.toUpperCase() === 'TABLE' &&
          node.classList.contains('quill-better-table')
      })[0]

      if (tableNode) {
        // current table clicked
        if (this.table === tableNode) return
        // other table clicked
        if (this.table) this.hideTableTools()
        this.showTableTools(tableNode, quill, options)
      } else if (this.table) {
        // other clicked
        this.hideTableTools()
      }
    }, false)

    // handle right click on quill-better-table
    this.quill.root.addEventListener('contextmenu', (evt) => {
      if (!this.table) return true
      evt.preventDefault()
      if (!evt.path || evt.path.length <= 0) return

      const tableNode = evt.path.filter(node => {
        return node.tagName &&
          node.tagName.toUpperCase() === 'TABLE' &&
          node.classList.contains('quill-better-table')
      })[0]

      const rowNode = evt.path.filter(node => {
        return node.tagName &&
          node.tagName.toUpperCase() === 'TR' &&
          node.getAttribute('data-row')
      })[0]

      const cellNode = evt.path.filter(node => {
        return node.tagName &&
          node.tagName.toUpperCase() === 'TD' &&
          node.getAttribute('data-row')
      })[0]

      let isTargetCellSelected = this.tableSelection.selectedTds
        .map(tableCell => tableCell.domNode)
        .includes(cellNode)

      if (this.tableSelection.selectedTds.length <= 0 ||
        !isTargetCellSelected) {
        this.tableSelection.setSelection(
          cellNode.getBoundingClientRect(),
          cellNode.getBoundingClientRect()
        )
      }

      if (this.tableOperationMenu)
        this.tableOperationMenu = this.tableOperationMenu.destroy()

      if (tableNode) {
        this.tableOperationMenu = new TableOperationMenu({
          table: tableNode,
          row: rowNode,
          cell: cellNode,
          left: evt.pageX,
          top: evt.pageY
        }, quill, options)
      }
    }, false)

  }

  getTable(range = this.quill.getSelection()) {
    if (range == null) return [null, null, null, -1];
    const [cellLine, offset] = this.quill.getLine(range.index);
    if (cellLine == null || cellLine.statics.blotName !== TableCellLine.blotName) {
      return [null, null, null, -1];
    }
    const cell = cellLine.tableCell();
    const row = cell.row();
    const table = row.table();
    return [table, row, cell, offset];
  }

  insertTable(rows, columns) {
    const range = this.quill.getSelection(true)
    if (range == null) return
    let currentBlot = this.quill.getLeaf(range.index)[0]
    let nextBlot = this.quill.getLeaf(range.index + 1)[0]
    let delta = new Delta().retain(range.index)

    delta.insert('\n')
    // insert table column
    delta = new Array(columns).fill('\n').reduce((memo, text) => {
      memo.insert(text, { 'table-col': true })
      return memo
    }, delta)
    // insert table cell line with empty line
    delta = new Array(rows).fill(0).reduce(memo => {
      let tableRowId = rowId()
      return new Array(columns).fill('\n').reduce((memo, text) => {
        memo.insert(text, { 'table-cell-line': {row: tableRowId, cell: cellId()} });
        return memo
      }, memo)
    }, delta)

    this.quill.updateContents(delta, Quill.sources.USER)
    this.quill.setSelection(range.index + 1, Quill.sources.SILENT)
  }

  showTableTools (table, quill, options) {
    this.table = table
    this.columnTool = new TableColumnTool(table, quill, options)
    this.tableSelection = new TableSelection(table, quill, options)
  }

  hideTableTools () {
    this.columnTool.destroy()
    this.tableSelection.destroy()
    this.tableOperationMenu && this.tableOperationMenu.destroy()
    this.columnTool = null
    this.tableSelection = null
    this.tableOperationMenu = null
    this.table = null
  }
}

export default BetterTable;