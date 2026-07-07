import { ArrowUpRightIcon, ClipboardList, Plus, Trash2Icon } from "lucide-react"
import { Form, Link } from "react-router"
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
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { getClassrooms } from "~/lib/db"
import type { Classroom } from "~/lib/types"
import type { Route } from "./+types/classroom-home"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader() {
  const classrooms = await getClassrooms()
  return { classrooms: classrooms }
}

function EmptyClassrooms() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardList />
        </EmptyMedia>
        <EmptyTitle>No Classrooms Yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any classrooms yet. Get started by creating
          your first classroom.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button render={<Link to="/classrooms/new"></Link>}>
          Create Classroom
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function ClassroomSummary({ classroom }: { classroom: Classroom }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Period {classroom.period}</CardTitle>
        <CardDescription>Subject: {classroom.subject}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          render={<Link to={`/classrooms/${classroom.uuid}`}>View</Link>}
        />
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button size="sm" variant="destructive">
                Delete
              </Button>
            }
          />
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <Trash2Icon />
              </AlertDialogMedia>
              <AlertDialogTitle>
                Delete Period {classroom.period} - {classroom.subject}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the classroom and cannot be undone.
                Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Form action={`/classrooms/${classroom.uuid}/delete`} method="post">
              <AlertDialogFooter>
                <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" type="submit">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </Form>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classrooms } = loaderData
  return (
    <>
      {classrooms.length === 0 ? (
        <EmptyClassrooms />
      ) : (
        <div>
          <Button
            render={
              <Link to="/classrooms/new">
                <Plus size="xs" />
                <span>Create classroom</span>
              </Link>
            }
            className="mb-4"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {classrooms.map((classroom) => (
              <div key={classroom.uuid} className="m-w-full flex flex-col">
                <ClassroomSummary classroom={classroom} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
