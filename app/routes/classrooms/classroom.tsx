import { useEdgesState, useNodesState } from "@xyflow/react"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useFetcher } from "react-router"
import * as z from "zod"
import {
  RosterPanel,
  SeatingChartCanvas,
} from "~/components/seating-chart-canvas"
import { Button } from "~/components/ui/button"
import { Spinner } from "~/components/ui/spinner"
import {
  getClassroom,
  getClassroomTables,
  getSeatingChartAssignments,
  getStudents,
  updateSeatingChart,
} from "~/lib/db"
import type { seatingChartSchema } from "~/lib/schemas"
import type { Route } from "./+types/classroom"
import {
  buildInitialNodesAndEdges,
  createTable,
  deriveSeatingChartPayload,
  getSeatId,
  getUnassignedStudents,
  type SeatAssignments,
} from "./seating-chart.state"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader({ params }: Route.ClientLoaderArgs) {
  const [classroom, tables, allStudents, seatAssignments] = await Promise.all([
    getClassroom(params.classroomId),
    getClassroomTables(params.classroomId),
    getStudents(),
    getSeatingChartAssignments(params.classroomId),
  ])
  const students = allStudents.filter((s) => s.classroom_id === classroom.id)
  const assignments: SeatAssignments = Object.fromEntries(
    seatAssignments.map(({ table_id, position, student_id }) => [
      getSeatId(table_id, position),
      student_id,
    ])
  )
  return { classroom, students, tables, assignments }
}

export async function action({ params, request }: Route.ActionArgs) {
  const chart: z.infer<typeof seatingChartSchema> = await request.json()

  await updateSeatingChart(params.classroomId, chart)

  return { ok: true }
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classroom, students, tables, assignments } = loaderData

  const [locked, setLocked] = useState(true)

  const studentsById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  )

  const initial = useMemo(
    () => buildInitialNodesAndEdges(tables, assignments, studentsById),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  const fetcher = useFetcher()

  const unassigned = useMemo(
    () => getUnassignedStudents(students, nodes),
    [students, nodes]
  )

  function handleSave() {
    const payload = deriveSeatingChartPayload(nodes, edges)
    fetcher.submit(payload, { method: "post", encType: "application/json" })
    setLocked(true)
  }

  function handleCancel() {
    const reverted = buildInitialNodesAndEdges(tables, assignments, studentsById)
    setNodes(reverted.nodes)
    setEdges(reverted.edges)
    setLocked(true)
  }

  function handleAddTable() {
    const tableCount = nodes.filter((n) => n.type === "table").length
    const table = createTable(tableCount, classroom.id)
    setNodes((nds) => [
      ...nds,
      {
        id: table.id,
        type: "table",
        position: { x: table.x_pos, y: table.y_pos },
        data: { table },
      },
    ])
  }

  function handleUnassignAll() {
    setEdges([])
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
        <Button
          variant="secondary"
          disabled={locked}
          onClick={handleAddTable}
        >
          <Plus />
          <span>Add table</span>
        </Button>
        <Button disabled={locked} variant="destructive" onClick={handleUnassignAll}>
          Unassign All
        </Button>
      </div>
      <div className="flex min-h-0 w-full flex-1 gap-4">
        <RosterPanel students={unassigned} locked={locked} />
        <SeatingChartCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          setNodes={setNodes}
          setEdges={setEdges}
          locked={locked}
          studentsById={studentsById}
        />
      </div>
    </div>
  )
}
