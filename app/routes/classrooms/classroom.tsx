import { useNodesState } from "@xyflow/react"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useFetcher } from "react-router"
import {
  RosterPanel,
  SeatingChartCanvas,
} from "~/components/seating-chart-canvas"
import { Button } from "~/components/ui/button"
import { Spinner } from "~/components/ui/spinner"
import {
  getClassroom,
  getClassroomSeatingChart,
  getStudents,
  updateClassroomSeatingChart,
} from "~/lib/api"
import type { SeatingChart } from "~/lib/schemas"
import {
  buildInitialNodes,
  buildSeatingChartPayload,
  createCanvasTable,
  getSeatId,
  getSeatPosition,
  getUnassignedStudents,
  SEAT_NODE_SIZE,
  SEATS_PER_TABLE,
  type SeatingChartSeatNode,
  type SeatingChartTableNode,
} from "../../lib/seating-chart-utils"
import type { Route } from "./+types/classroom"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader({ params }: Route.ClientLoaderArgs) {
  const [classroom, seatingChart, allStudents] = await Promise.all([
    getClassroom(params.classroomId),
    getClassroomSeatingChart(params.classroomId),
    getStudents(),
  ])
  const students = allStudents.filter((s) => s.classroom_id === classroom.id)
  return { classroom, students, seatingChart }
}

export async function action({ params, request }: Route.ActionArgs) {
  const chart: SeatingChart = await request.json()

  await updateClassroomSeatingChart(params.classroomId, chart)

  return { ok: true }
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classroom, students, seatingChart } = loaderData

  const [locked, setLocked] = useState(true)

  const studentsById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  )

  const initialNodes = useMemo(
    () => buildInitialNodes(classroom.id, seatingChart, studentsById),
    []
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)

  const fetcher = useFetcher()

  const unassigned = useMemo(
    () => getUnassignedStudents(students, nodes),
    [students, nodes]
  )

  function handleSave() {
    setNodes((nds) =>
      nds.map((n) => (n.selected ? { ...n, selected: false } : n))
    )
    const payload = buildSeatingChartPayload(nodes)
    fetcher.submit(payload, { method: "post", encType: "application/json" })
    setLocked(true)
  }

  function handleCancel() {
    setNodes(buildInitialNodes(classroom.id, seatingChart, studentsById))
    setLocked(true)
  }

  function handleAddTable() {
    const tableNumber = nodes.filter((n) => n.type === "table").length
    const table = createCanvasTable(tableNumber, classroom.id)

    const tableNode: SeatingChartTableNode = {
      id: table.id,
      type: "table",
      position: { x: table.x_pos, y: table.y_pos },
      data: { table_number: tableNumber },
    }
    const seatNodes: SeatingChartSeatNode[] = Array.from(
      { length: SEATS_PER_TABLE },
      (_, seatIndex) => ({
        id: getSeatId(table.id, seatIndex),
        type: "seat",
        position: getSeatPosition(seatIndex),
        width: SEAT_NODE_SIZE,
        height: SEAT_NODE_SIZE,
        parentId: table.id,
        draggable: false,
        selectable: false,
        deletable: false,
        data: { seatIndex },
      })
    )

    // Regrouping (rather than appending) keeps every seat/table parent
    // ahead of its children in the array, even if an existing free student
    // is later dragged onto one of these newly-added seats.
    setNodes((nds) => {
      const next = [...nds, tableNode, ...seatNodes]
      return [
        ...next.filter((n) => n.type === "table"),
        ...next.filter((n) => n.type === "seat"),
        ...next.filter((n) => n.type === "student"),
      ]
    })
  }

  function handleUnassignAll() {
    setNodes((nds) => nds.filter((n) => n.type !== "student"))
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="shrink-0">
        <h2>Period {classroom.period}</h2>
        <h3>{classroom.subject}</h3>
      </div>
      <div className="flex shrink-0 justify-end gap-2 pb-2">
        {locked ? (
          <Button variant="secondary" onClick={() => setLocked(false)}>
            Edit
          </Button>
        ) : (
          <>
            <Button
              disabled={fetcher.state !== "idle"}
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button disabled={fetcher.state !== "idle"} onClick={handleSave}>
              {fetcher.state !== "idle" && <Spinner />}
              Save
            </Button>
          </>
        )}
        <Button variant="secondary" disabled={locked} onClick={handleAddTable}>
          <Plus />
          <span>Add table</span>
        </Button>
        <Button
          disabled={locked}
          variant="destructive"
          onClick={handleUnassignAll}
        >
          Unassign All
        </Button>
      </div>
      <div className="flex min-h-0 w-full flex-1 gap-4">
        <RosterPanel students={unassigned} locked={locked} />
        <SeatingChartCanvas
          nodes={nodes}
          onNodesChange={onNodesChange}
          setNodes={setNodes}
          locked={locked}
          studentsById={studentsById}
        />
      </div>
    </div>
  )
}
