import { useNodesState } from "@xyflow/react"
import {
  ArrowLeftIcon,
  Edit2Icon,
  MoreHorizontalIcon,
  ShuffleIcon,
  TableIcon,
  Trash2Icon,
  UsersIcon,
  UsersRoundIcon,
  UserXIcon,
} from "lucide-react"
import React, { useEffect, useMemo, useState } from "react"
import { Link, useFetcher } from "react-router"
import {
  RosterPanel,
  SeatingChartCanvas,
} from "~/components/seating-chart-canvas"
import { Alert, AlertDescription } from "~/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { Spinner } from "~/components/ui/spinner"
import { Switch } from "~/components/ui/switch"
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
  reorderNodes,
  type SeatingChartSeatNode,
  type SeatingChartTableNode,
} from "~/lib/seating-chart-utils"
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

  try {
    await updateClassroomSeatingChart(params.classroomId, chart)
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }

  return { ok: true }
}

function RandomSeatingChartDialog({
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const isSubmitting = false

  return (
    <Dialog {...props}>
      <form>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Random Seating Chart</DialogTitle>
            <DialogDescription>
              Generate a random seating chart based on the options below.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field orientation="horizontal">
              <Switch id="table-retain" disabled />
              <FieldContent>
                <FieldLabel className="font-normal">
                  Keep Existing Tables
                </FieldLabel>
                <FieldDescription>
                  Additional tables will automatically be created if necessary.
                </FieldDescription>
              </FieldContent>
            </Field>
            <FieldSet className="w-full max-w-xs">
              <FieldLegend variant="label">New Table Size</FieldLegend>
              <RadioGroup defaultValue="default">
                <Field orientation="horizontal">
                  <RadioGroupItem value="default" id="table-size-default" />
                  <FieldLabel className="font-normal">Default</FieldLabel>
                  <FieldDescription>Two rows & two columns</FieldDescription>
                </Field>
                <Field orientation="horizontal">
                  <RadioGroupItem
                    value="custom"
                    id="table-size-custom"
                    disabled
                  />
                  <FieldLabel className="font-normal">Custom</FieldLabel>
                  <FieldDescription>TODO</FieldDescription>
                </Field>
              </RadioGroup>
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}

function UnassignAllDialog({
  onUnassignAll,
  ...props
}: React.ComponentProps<typeof AlertDialog> & {
  onUnassignAll: () => void
}) {
  return (
    <AlertDialog {...props}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <UsersRoundIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Unassign all students?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears every seat assignment on this chart. It isn't saved
            until you click Save.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onUnassignAll}>
            Unassign All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classroom, students, seatingChart } = loaderData

  const [locked, setLocked] = useState(true)
  const [randomChartOpen, setRandomChartOpen] = useState(false)
  const [unassignAllOpen, setUnassignAllOpen] = useState(false)

  const studentsById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  )

  const initialNodes = useMemo(
    () => buildInitialNodes(classroom.id, seatingChart, studentsById),
    []
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)

  const fetcher = useFetcher<typeof action>()
  const saveError = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) {
      return
    }
    setLocked(fetcher.data.ok)
  }, [fetcher.state, fetcher.data])

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
  }

  function handleCancel() {
    setNodes(buildInitialNodes(classroom.id, seatingChart, studentsById))
    setLocked(true)
  }

  function handleAddTable() {
    const tableNumber = nodes.filter((n) => n.type === "table").length
    const table = createCanvasTable(tableNumber)

    const tableNode: SeatingChartTableNode = {
      id: table.id,
      type: "table",
      position: { x: table.x_pos, y: table.y_pos },
      deletable: false,
      data: { table_number: tableNumber, rows: table.rows, cols: table.cols },
    }
    const seatNodes: SeatingChartSeatNode[] = []
    for (let row = 0; row < table.rows; row++) {
      for (let col = 0; col < table.cols; col++) {
        seatNodes.push({
          id: getSeatId(table.id, row, col),
          type: "seat",
          position: getSeatPosition(row, col),
          parentId: table.id,
          draggable: false,
          selectable: false,
          deletable: false,
          data: { row, col },
        })
      }
    }

    // Order nodes so that parent nodes always come before child nodes
    setNodes((nds) => reorderNodes([...nds, tableNode, ...seatNodes]))
  }

  function handleUnassignAll() {
    setNodes((nds) => nds.filter((n) => n.type !== "student"))
    setUnassignAllOpen(false)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0">
        <Button
          variant="link"
          size="sm"
          className="mb-1 px-0 text-muted-foreground"
          render={<Link to="/classrooms" />}
        >
          <ArrowLeftIcon />
          <span>Classrooms</span>
        </Button>
        <h2 className="text-2xl font-medium">Period {classroom.period}</h2>
        <h3 className="text-sm text-muted-foreground">{classroom.subject}</h3>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 pb-2">
        {saveError && (
          <Alert variant="destructive" className="mr-auto py-2">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        <ButtonGroup>
          <ButtonGroup>
            {locked ? (
              <Button
                variant="secondary"
                onClick={() => setLocked(false)}
                aria-label="Edit seating chart"
              >
                Edit Chart
              </Button>
            ) : (
              <>
                <Button
                  disabled={fetcher.state !== "idle"}
                  variant="secondary"
                  onClick={handleCancel}
                  aria-label="Cancel seating chart changes"
                >
                  Cancel
                </Button>
                <Button
                  disabled={fetcher.state !== "idle"}
                  onClick={handleSave}
                  aria-label="Save seating chart"
                >
                  {fetcher.state !== "idle" && <Spinner />}
                  Save
                </Button>
              </>
            )}
          </ButtonGroup>
          <ButtonGroup>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="More Options"
                  >
                    <MoreHorizontalIcon />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-full">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Classroom</DropdownMenuLabel>
                  <DropdownMenuItem aria-label="Edit Classroom">
                    <Edit2Icon /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem aria-label="Manage Students">
                    <UsersIcon /> Manage Students
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Seating Chart</DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled={locked}
                    onClick={handleAddTable}
                    aria-label="Add Table"
                  >
                    <TableIcon /> Add Table
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={locked}
                    onClick={() => setRandomChartOpen(true)}
                    aria-label="Randomize Seating Chart"
                  >
                    <ShuffleIcon /> Randomize
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={locked}
                    variant="destructive"
                    aria-label="Unassign All Students"
                    onClick={() => setUnassignAllOpen(true)}
                  >
                    <UserXIcon /> Unassign All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    aria-label="Delete Classroom"
                  >
                    <Trash2Icon /> Delete Classroom
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </ButtonGroup>
      </div>
      <div>
        <RandomSeatingChartDialog
          open={randomChartOpen}
          onOpenChange={setRandomChartOpen}
        />
        <UnassignAllDialog
          open={unassignAllOpen}
          onOpenChange={setUnassignAllOpen}
          onUnassignAll={handleUnassignAll}
        />
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 md:flex-row">
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
