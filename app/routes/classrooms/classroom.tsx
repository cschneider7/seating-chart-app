import { SnapModifier } from "@dnd-kit/abstract/modifiers"
import { RestrictToWindow } from "@dnd-kit/dom/modifiers"
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react"
import {
  Container,
  GripVerticalIcon,
  MinusIcon,
  Plus,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useMemo, useReducer, useRef, type Dispatch } from "react"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Item, ItemContent, ItemHeader, ItemTitle } from "~/components/ui/item"
import { ScrollArea } from "~/components/ui/scroll-area"
import { getClassroom, getStudents } from "~/lib/db"
import type { Student } from "~/lib/types"
import { cn } from "~/lib/utils"
import type { Route } from "./+types/classroom"
import {
  GRID_STEP,
  createTable,
  getSeatId,
  getUnassignedStudents,
  seatingChartReducer,
  type SeatAssignments,
  type SeatingChartAction,
  type SeatingChartActionData,
  type Table,
} from "./seating-chart.state"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader({ params }: Route.ClientLoaderArgs) {
  const [classroom, allStudents] = await Promise.all([
    getClassroom(params.classroomId),
    getStudents(),
  ])
  const students = allStudents.filter((s) => s.classroom_id === classroom.id)
  return { classroom, students }
}

function StudentChip({ student }: { student: Student }) {
  const { ref } = useDraggable<SeatingChartActionData>({
    id: student.id,
    type: "student",
    data: { kind: "student", studentId: student.id },
  })

  return (
    <Item
      variant="outline"
      size="xs"
      ref={ref}
      className="aspect-square w-24 shrink-0 overflow-hidden"
    >
      <ItemHeader>
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Student image"
          className="aspect-5/4 w-full rounded-sm object-cover brightness-60 grayscale dark:brightness-40"
        />
      </ItemHeader>
      <ItemContent>
        <ItemTitle className="text-xs">{student.name}</ItemTitle>
      </ItemContent>
    </Item>
  )
}

function SeatSlot({
  tableId,
  seatIndex,
  student,
}: {
  tableId: string
  seatIndex: number
  student: Student | undefined
}) {
  const seatId = getSeatId(tableId, seatIndex)
  const { ref, isDropTarget } = useDroppable<SeatingChartActionData>({
    id: seatId,
    type: "seat",
    accept: ["student"],
    data: { kind: "seat", tableId, seatIndex, seatId },
  })

  return (
    <div
      ref={ref}
      className={cn(
        "flex size-24 items-center justify-center rounded-lg text-xs text-muted-foreground transition-colors",
        !student && "border border-dashed",
        isDropTarget && "border border-primary bg-primary/10"
      )}
    >
      {student ? <StudentChip student={student} /> : "Empty"}
    </div>
  )
}

function TableCard({
  table,
  index,
  studentsById,
  assignments,
  dispatch,
}: {
  table: Table
  index: number
  studentsById: Map<string, Student>
  assignments: SeatAssignments
  dispatch: Dispatch<SeatingChartAction>
}) {
  const { ref, handleRef } = useDraggable<SeatingChartActionData>({
    id: `table:${table.id}`,
    type: "table",
    data: { kind: "table", tableId: table.id },
    modifiers: [RestrictToWindow, SnapModifier.configure({ size: GRID_STEP })],
  })

  return (
    <Card
      ref={ref}
      className="absolute top-0 left-0 w-fit"
      style={{ transform: `translate3d(${table.x}px, ${table.y}px, 0)` }}
    >
      <CardHeader>
        <CardTitle
          ref={handleRef}
          className="flex w-fit cursor-grab touch-none items-center gap-1.5 select-none active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4 text-muted-foreground" />
          Table {index + 1}
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() =>
              dispatch({
                type: "SET_SEAT_COUNT",
                tableId: table.id,
                seatCount: table.seatCount - 1,
              })
            }
          >
            <MinusIcon />
          </Button>
          <span className="w-4 text-center text-xs tabular-nums">
            {table.seatCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() =>
              dispatch({
                type: "SET_SEAT_COUNT",
                tableId: table.id,
                seatCount: table.seatCount + 1,
              })
            }
          >
            <PlusIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              dispatch({ type: "REMOVE_TABLE", tableId: table.id })
            }
          >
            <Trash2Icon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: table.seatCount }, (_, seatIndex) => (
            <SeatSlot
              key={seatIndex}
              tableId={table.id}
              seatIndex={seatIndex}
              student={studentsById.get(
                assignments[getSeatId(table.id, seatIndex)] ?? ""
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SeatingChartCanvas({
  tables,
  studentsById,
  assignments,
  dispatch,
}: {
  tables: Table[]
  studentsById: Map<string, Student>
  assignments: SeatAssignments
  dispatch: Dispatch<SeatingChartAction>
}) {
  return (
    <div
      className="relative min-h-0 w-full flex-1 overflow-auto rounded-lg border-2"
      style={{
        backgroundImage:
          "radial-gradient(circle, color-mix(in oklch, var(--color-foreground) 15%, transparent) 1px, transparent 1px)",
        backgroundSize: `${GRID_STEP}px ${GRID_STEP}px`,
      }}
    >
      {tables.map((table, index) => (
        <TableCard
          key={table.id}
          table={table}
          index={index}
          studentsById={studentsById}
          assignments={assignments}
          dispatch={dispatch}
        />
      ))}
    </div>
  )
}

function RosterPanel({ students }: { students: Student[] }) {
  const { ref, isDropTarget } = useDroppable<SeatingChartActionData>({
    id: "roster",
    type: "roster",
    accept: ["student"],
    data: { kind: "roster" },
  })

  return (
    <div
      ref={ref}
      className={cn(
        "h-full rounded-lg border p-1",
        isDropTarget && "ring-2 ring-primary/40"
      )}
    >
      <ScrollArea className="h-full">
        <div className="h-full min-h-0 w-45 shrink-0 p-3 transition-shadow">
          <h4 className="mb-4 text-sm leading-none font-medium">Unassigned</h4>
          <div className="flex flex-wrap justify-center gap-3">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">Empty</p>
            ) : (
              students.map((student) => (
                <StudentChip key={student.id} student={student} />
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classroom, students } = loaderData

  const initialTable: Table = createTable(0)

  const [state, dispatch] = useReducer(seatingChartReducer, {
    tables: [initialTable],
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

  return (
    <div className="flex h-full flex-col p-4">
      <div className="shrink-0">
        <h2>Period {classroom.period}</h2>
        <h3>{classroom.subject}</h3>
      </div>
      <div className="flex shrink-0 justify-end gap-2 pb-2">
        <Button onClick={() => dispatch({ type: "ADD_TABLE" })}>
          <Plus />
          <span>Add table</span>
        </Button>
        <Button
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
          <RosterPanel students={unassigned} />
          <SeatingChartCanvas
            tables={state.tables}
            studentsById={studentsById}
            assignments={state.assignments}
            dispatch={dispatch}
          />
        </div>
      </DragDropProvider>
    </div>
  )
}
