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
import { Badge } from "~/components/ui/badge"
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

import { Trash2Icon } from "lucide-react"
import { Form, Link, useNavigation } from "react-router"
import { Spinner } from "~/components/ui/spinner"
import { getClassroom, getStudent } from "~/lib/api"
import type { Route } from "./+types/student"

export async function loader({ params }: Route.ClientLoaderArgs) {
  const student = await getStudent(params.studentId)
  const classroom = student.classroom_id
    ? await getClassroom(student.classroom_id)
    : null

  return {
    student: student,
    classroom: classroom,
  }
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { student, classroom } = loaderData
  const navigation = useNavigation()
  const isDeleting =
    navigation.formAction === `/students/${student.id}/delete`
  return (
    <div className="justify-center">
      <Card className="relative mx-auto w-full max-w-sm pt-0">
        <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Student image"
          className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
        />
        <CardHeader>
          <CardAction>
            {classroom ? (
              <Badge variant="secondary">Period {classroom.period}</Badge>
            ) : (
              <Badge variant="outline">Unassigned</Badge>
            )}
          </CardAction>
          <CardTitle>{student.name}</CardTitle>
          <CardDescription>Student ID: {student.student_id}</CardDescription>
        </CardHeader>
        <CardContent>
          Tags: <Badge variant="secondary">TODO</Badge>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            render={<Link to={`/students/${student.id}/edit`}>Edit</Link>}
          />
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive">Delete</Button>}
            />
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                  <Trash2Icon />
                </AlertDialogMedia>
                <AlertDialogTitle>Delete {student.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the student and cannot be undone.
                  Are you sure you want to continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Form action={`/students/${student.id}/delete`} method="post">
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
    </div>
  )
}
