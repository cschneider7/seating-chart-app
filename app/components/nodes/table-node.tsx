import {
  NodeToolbar,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { GripVerticalIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { BaseNode, BaseNodeContent } from "~/components/base-node"
import { Button } from "~/components/ui/button"
import {
  MAX_TABLE_DIMENSION,
  getSeatId,
  getSeatPosition,
  getTableNodeSize,
  type SeatingChartNode,
  type SeatingChartSeatNode,
  type TableNodeData,
} from "~/lib/seating-chart-utils"

function withTableDims(
  nodes: SeatingChartNode[],
  tableId: string,
  rows: number,
  cols: number
): SeatingChartNode[] {
  return nodes.map((n) =>
    n.id === tableId && n.type === "table"
      ? { ...n, data: { ...n.data, rows, cols } }
      : n
  )
}

export function TableNode({
  id,
  data,
}: NodeProps<Node<TableNodeData, "table">>) {
  const { setNodes } = useReactFlow<SeatingChartNode>()

  function handleRemoveTable() {
    setNodes((nds) => {
      const seatIds = new Set(
        nds
          .filter((n) => n.type === "seat" && n.parentId === id)
          .map((n) => n.id)
      )
      return nds.filter((n) => {
        if (n.id === id) return false
        if (n.type === "seat" && n.parentId === id) return false
        if (n.type === "student" && n.parentId && seatIds.has(n.parentId))
          return false
        return true
      })
    })
  }

  function handleAddRow() {
    if (data.rows >= MAX_TABLE_DIMENSION) return
    const newRow = data.rows
    setNodes((nds) => {
      const newSeats: SeatingChartSeatNode[] = Array.from(
        { length: data.cols },
        (_, col) => ({
          id: getSeatId(id, newRow, col),
          type: "seat",
          position: getSeatPosition(newRow, col),
          parentId: id,
          draggable: false,
          selectable: false,
          deletable: false,
          data: { row: newRow, col },
        })
      )
      return [...withTableDims(nds, id, data.rows + 1, data.cols), ...newSeats]
    })
  }

  function handleRemoveRow() {
    if (data.rows <= 1) return
    const removedRow = data.rows - 1
    setNodes((nds) => {
      const removedSeatIds = new Set(
        nds
          .filter(
            (n) =>
              n.type === "seat" &&
              n.parentId === id &&
              n.data.row === removedRow
          )
          .map((n) => n.id)
      )
      return withTableDims(nds, id, data.rows - 1, data.cols).filter((n) => {
        if (n.type === "seat" && removedSeatIds.has(n.id)) return false
        if (
          n.type === "student" &&
          n.parentId &&
          removedSeatIds.has(n.parentId)
        )
          return false
        return true
      })
    })
  }

  function handleAddColumn() {
    if (data.cols >= MAX_TABLE_DIMENSION) return
    const newCol = data.cols
    setNodes((nds) => {
      const newSeats: SeatingChartSeatNode[] = Array.from(
        { length: data.rows },
        (_, row) => ({
          id: getSeatId(id, row, newCol),
          type: "seat",
          position: getSeatPosition(row, newCol),
          parentId: id,
          draggable: false,
          selectable: false,
          deletable: false,
          data: { row, col: newCol },
        })
      )
      return [...withTableDims(nds, id, data.rows, data.cols + 1), ...newSeats]
    })
  }

  function handleRemoveColumn() {
    if (data.cols <= 1) return
    const removedCol = data.cols - 1
    setNodes((nds) => {
      const removedSeatIds = new Set(
        nds
          .filter(
            (n) =>
              n.type === "seat" &&
              n.parentId === id &&
              n.data.col === removedCol
          )
          .map((n) => n.id)
      )
      return withTableDims(nds, id, data.rows, data.cols - 1).filter((n) => {
        if (n.type === "seat" && removedSeatIds.has(n.id)) return false
        if (
          n.type === "student" &&
          n.parentId &&
          removedSeatIds.has(n.parentId)
        )
          return false
        return true
      })
    })
  }

  const { width, height } = getTableNodeSize(data.rows, data.cols)

  return (
    <div>
      <BaseNode style={{ width, height }}>
        <BaseNodeContent>
          <div className="absolute -top-5 left-0 flex items-center text-xs">
            <GripVerticalIcon size={11} />
            <span>Table {data.table_number + 1}</span>
          </div>
        </BaseNodeContent>
      </BaseNode>
      <NodeToolbar
        position={Position.Bottom}
        className="nodrag flex items-center gap-1 rounded-md border bg-card p-1 text-xs shadow-md"
      >
        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={data.rows <= 1}
            onClick={handleRemoveRow}
          >
            <MinusIcon />
          </Button>
          <span className="px-1">Rows</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={data.rows >= MAX_TABLE_DIMENSION}
            onClick={handleAddRow}
          >
            <PlusIcon />
          </Button>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={data.cols <= 1}
            onClick={handleRemoveColumn}
          >
            <MinusIcon />
          </Button>
          <span className="px-1">Cols</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={data.cols >= MAX_TABLE_DIMENSION}
            onClick={handleAddColumn}
          >
            <PlusIcon />
          </Button>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="xs"
          onClick={handleRemoveTable}
        >
          <Trash2Icon data-icon="inline-start" />
          <span>Delete</span>
        </Button>
      </NodeToolbar>
    </div>
  )
}
