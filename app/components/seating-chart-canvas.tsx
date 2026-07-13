import { SnapModifier } from "@dnd-kit/abstract/modifiers"
import { RestrictToWindow } from "@dnd-kit/dom/modifiers"
import { useDraggable, useDroppable } from "@dnd-kit/react"
import { GripVerticalIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { type Dispatch } from "react"
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
import type { Student, Table } from "~/lib/types"
import { cn } from "~/lib/utils"
import {
  getSeatId,
  type SeatAssignments,
  type SeatingChartAction,
  type SeatingChartActionData,
} from "~/routes/classrooms/seating-chart.state"

export const GRID_STEP = 20
export const DEFAULT_SEAT_COUNT = 4
export const MIN_SEAT_COUNT = 1
export const MAX_SEAT_COUNT = 12
export const TABLES_PER_ROW = 4
export const TABLE_SPACING = GRID_STEP * 13
export const TABLE_OFFSET = GRID_STEP * 2

function StudentChip({
  student,
  editMode,
}: {
  student: Student
  editMode: boolean
}) {
  const { ref } = useDraggable<SeatingChartActionData>({
    id: student.id,
    disabled: !editMode,
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
  editMode,
}: {
  tableId: string
  seatIndex: number
  student: Student | undefined
  editMode: boolean
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
      {student ? (
        <StudentChip student={student} editMode={editMode} />
      ) : (
        "Empty"
      )}
    </div>
  )
}

function TableCard({
  table,
  index,
  studentsById,
  assignments,
  editMode,
  dispatch,
}: {
  table: Table
  index: number
  studentsById: Map<string, Student>
  assignments: SeatAssignments
  editMode: boolean
  dispatch: Dispatch<SeatingChartAction>
}) {
  const { ref, handleRef } = useDraggable<SeatingChartActionData>({
    id: table.id,
    type: "table",
    data: { kind: "table", tableId: table.id },
    modifiers: [RestrictToWindow, SnapModifier.configure({ size: GRID_STEP })],
    disabled: !editMode,
  })

  return (
    <Card
      ref={ref}
      className="absolute top-0 left-0 w-fit"
      style={{
        transform: `translate3d(${table.x_pos}px, ${table.y_pos}px, 0)`,
      }}
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
                seatCount: table.seat_count - 1,
              })
            }
          >
            <MinusIcon />
          </Button>
          <span className="w-4 text-center text-xs tabular-nums">
            {table.seat_count}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() =>
              dispatch({
                type: "SET_SEAT_COUNT",
                tableId: table.id,
                seatCount: table.seat_count + 1,
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
          {Array.from({ length: table.seat_count }, (_, seatIndex) => (
            <SeatSlot
              key={seatIndex}
              tableId={table.id}
              seatIndex={seatIndex}
              student={studentsById.get(
                assignments[getSeatId(table.id, seatIndex)] ?? ""
              )}
              editMode={editMode}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function RosterPanel({
  students,
  editMode,
}: {
  students: Student[]
  editMode: boolean
}) {
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
                <StudentChip
                  key={student.id}
                  student={student}
                  editMode={editMode}
                />
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export function SeatingChartCanvas({
  tables,
  studentsById,
  assignments,
  editMode,
  dispatch,
}: {
  tables: Table[]
  studentsById: Map<string, Student>
  assignments: SeatAssignments
  editMode: boolean
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
          editMode={editMode}
          dispatch={dispatch}
        />
      ))}
    </div>
  )
}
