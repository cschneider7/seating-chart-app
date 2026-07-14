import { RestrictToWindow } from "@dnd-kit/dom/modifiers"
import { DragDropProvider } from "@dnd-kit/react"
import { Plus } from "lucide-react"
import { useMemo, useReducer, useState } from "react"
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
  createTable,
  getSeatId,
  getUnassignedStudents,
  seatingChartReducer,
  type SeatAssignments,
  type SeatingChartActionData,
  type SeatingChartState,
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
  const data: SeatingChartState = await request.json()

  const chart: z.infer<typeof seatingChartSchema> = {
    tables: data.tables.map((table) => ({
      x_pos: table.x_pos,
      y_pos: table.y_pos,
      seats: Array.from(
        { length: table.seat_count },
        (_, seatIndex) =>
          data.assignments[getSeatId(table.id, seatIndex)] ?? null
      ),
    })),
  }

  await updateSeatingChart(params.classroomId, chart)

  return { ok: true }
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classroom, students, tables, assignments } = loaderData

  const [editMode, setEditMode] = useState(false)

  const initialChart = {
    tables: tables,
    assignments: assignments,
  }
  const [chart, dispatch] = useReducer(seatingChartReducer, initialChart)
  const fetcher = useFetcher()

  const studentsById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  )
  const unassigned = useMemo(
    () => getUnassignedStudents(students, chart.assignments),
    [students, chart.assignments]
  )

  function handleSave() {
    fetcher.submit(chart, { method: "post", encType: "application/json" })
    setEditMode(!editMode)
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="shrink-0">
        <h2>Period {classroom.period}</h2>
        <h3>{classroom.subject}</h3>
      </div>
      <div className="flex shrink-0 justify-end gap-2 pb-2">
        {!editMode ? (
          <Button variant="secondary" onClick={() => setEditMode(!editMode)}>
            Edit
          </Button>
        ) : (
          <Button disabled={fetcher.state !== "idle"} onClick={handleSave}>
            {fetcher.state !== "idle" && <Spinner />}
            Save
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={!editMode}
          onClick={() =>
            dispatch({ type: "ADD_TABLE", classroomId: classroom.id })
          }
        >
          <Plus />
          <span>Add table</span>
        </Button>
        <Button
          disabled={!editMode}
          variant="destructive"
          onClick={() => dispatch({ type: "UNASSIGN_ALL" })}
        >
          Reset
        </Button>
      </div>
      <DragDropProvider<SeatingChartActionData>
        onDragEnd={(event) => {
          if (event.canceled) {
            return
          }

          const { source, target } = event.operation
          if (!source?.data) {
            return
          }

          const sourceData = source.data
          if (sourceData.kind === "table") {
            const { x, y } = event.operation.transform
            dispatch({
              type: "MOVE_TABLE_BY",
              tableId: sourceData.tableId,
              deltaX: x,
              deltaY: y,
            })
          } else if (sourceData.kind === "student") {
            const targetData = target?.data
            if (targetData?.kind === "seat") {
              dispatch({
                type: "ASSIGN_STUDENT",
                studentId: sourceData.studentId,
                seatId: targetData.seatId,
              })
            } else {
              dispatch({
                type: "UNASSIGN_STUDENT",
                studentId: sourceData.studentId,
              })
            }
          }
        }}
        modifiers={[RestrictToWindow]}
      >
        <div className="flex min-h-0 w-full flex-1 gap-4">
          <RosterPanel students={unassigned} editMode={editMode} />
          <SeatingChartCanvas
            tables={chart.tables}
            studentsById={studentsById}
            assignments={chart.assignments}
            editMode={editMode}
            dispatch={dispatch}
          />
        </div>
      </DragDropProvider>
    </div>
  )
}
