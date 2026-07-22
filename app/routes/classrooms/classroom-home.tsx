import { ClipboardList, Plus, Trash2Icon } from "lucide-react"
import { Form, Link, useNavigation } from "react-router"
import { ClassroomFormDialog } from "~/components/classroom-form-dialog"
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
import { Spinner } from "~/components/ui/spinner"
import { getClassrooms } from "~/lib/api"
import type { Classroom } from "~/lib/schemas"
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
        <ClassroomFormDialog
          mode="create"
          trigger={<Button>Create Classroom</Button>}
        />
      </EmptyContent>
    </Empty>
  )
}

function ClassroomSummary({ classroom }: { classroom: Classroom }) {
  const navigation = useNavigation()
  const isDeleting =
    navigation.formAction === `/classrooms/${classroom.id}/delete`
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
          render={<Link to={`/classrooms/${classroom.id}`}>View</Link>}
        />
        <ClassroomFormDialog
          mode="edit"
          classroom={classroom}
          trigger={
            <Button size="sm" variant="outline">
              Edit
            </Button>
          }
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
            <Form action={`/classrooms/${classroom.id}/delete`} method="post">
              <AlertDialogFooter>
                <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  type="submit"
                  disabled={isDeleting}
                >
                  {isDeleting && <Spinner />}
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
          <ClassroomFormDialog
            mode="create"
            trigger={
              <Button className="mb-4">
                <Plus />
                <span>Create classroom</span>
              </Button>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {classrooms.map((classroom) => (
              <div key={classroom.id} className="flex max-w-full flex-col">
                <ClassroomSummary classroom={classroom} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
