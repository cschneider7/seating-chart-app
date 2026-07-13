import { RestrictToWindow } from "@dnd-kit/dom/modifiers"
import { DragDropProvider } from "@dnd-kit/react"
import { Plus } from "lucide-react"
import { useMemo, useReducer, useState } from "react"
import {
  RosterPanel,
  SeatingChartCanvas,
} from "~/components/seating-chart-canvas"
import { Button } from "~/components/ui/button"
import { getClassroom, getClassroomTables, getStudents } from "~/lib/db"
import type { Route } from "./+types/classroom"
import {
  createTable,
  getUnassignedStudents,
  seatingChartReducer,
  type SeatingChartActionData,
} from "./seating-chart.state"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader({ params }: Route.ClientLoaderArgs) {
  const [classroom, tables, allStudents] = await Promise.all([
    getClassroom(params.classroomId),
    getClassroomTables(params.classroomId),
    getStudents(),
  ])
  const students = allStudents.filter((s) => s.classroom_id === classroom.id)
  return { classroom, students, tables }
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classroom, students, tables } = loaderData

  const [editMode, setEditMode] = useState(false)

  const [state, dispatch] = useReducer(seatingChartReducer, {
    classroomId: classroom.id,
    tables: tables,
    assignments: {},
  })

  const studentsById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  )
  const unassigned = useMemo(
    () => getUnassignedStudents(students, state.assignments),
    [students, state.assignments]
  )

  function handleSave() {
    // TODO
    dispatch({ type: "COMMIT_CHANGES" })
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
          <Button onClick={handleSave}>Save</Button>
        )}
        <Button
          variant="secondary"
          disabled={!editMode}
          onClick={() => dispatch({ type: "ADD_TABLE" })}
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
            tables={state.tables}
            studentsById={studentsById}
            assignments={state.assignments}
            editMode={editMode}
            dispatch={dispatch}
          />
        </div>
      </DragDropProvider>
    </div>
  )
}
