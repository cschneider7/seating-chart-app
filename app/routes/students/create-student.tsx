import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Link, isRouteErrorResponse, redirect, useSubmit } from "react-router"
import * as z from "zod"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { createStudent, getClassrooms } from "~/lib/api"
import { CreateStudentSchema } from "~/lib/schemas"
import type { Route } from "./+types/create-student"

export async function action({ request }: Route.ActionArgs) {
  const rawData = await request.json()
  const result = CreateStudentSchema.safeParse(rawData)

  if (!result.success) {
    return z.treeifyError(result.error)
  }

  const student = await createStudent(result.data)
  return redirect(`/students/${student.id}`)
}

export async function loader() {
  const classrooms = await getClassrooms()
  return { classrooms: classrooms }
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classrooms } = loaderData
  const submit = useSubmit()

  const form = useForm<z.infer<typeof CreateStudentSchema>>({
    resolver: zodResolver(CreateStudentSchema),
    defaultValues: {
      name: "",
      classroom_id: null,
    },
  })

  const onSubmit = (data: z.infer<typeof CreateStudentSchema>) =>
    submit(data, { method: "post", encType: "application/json" })

  const classroomOptions: [{ label: string; value: string | null }] = [
    { label: "Unassigned", value: null },
  ]
  classrooms.forEach((classroom) => {
    classroomOptions.push({
      label: `Period ${classroom.period} - ${classroom.subject}`,
      value: classroom.id,
    })
  })

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="relative mx-auto w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Create new student</CardTitle>
          <CardDescription>Enter new student info here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="create-student" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      Name<span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      placeholder="Bob Burger"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="student_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      Student ID Number
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      placeholder="123456"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="classroom_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldContent>
                      <FieldLabel>Classroom</FieldLabel>
                      <FieldDescription>
                        The classroom the student is enrolled in
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      items={classroomOptions}
                    >
                      <SelectTrigger
                        aria-invalid={fieldState.invalid}
                        className="w-full max-w-48"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {classroomOptions.map((classroom) => (
                          <SelectItem
                            key={classroom.value}
                            value={classroom.value}
                          >
                            {classroom.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <Field orientation="horizontal">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button type="submit" form="create-student">
              Submit
            </Button>
          </Field>
        </CardFooter>
      </Card>
    </div>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let details =
    "We couldn't confirm your student was created. If you already submitted this form, check the student list before trying again."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    details = error.statusText || details
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="relative mx-auto w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Couldn't create student</CardTitle>
          <CardDescription>{details}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Field orientation="horizontal">
            <Button variant="outline" render={<Link to="/students" />}>
              Back to students
            </Button>
            <Button render={<Link to="/students/new" reloadDocument />}>
              Try again
            </Button>
          </Field>
        </CardFooter>
        {stack && (
          <CardContent>
            <pre className="w-full overflow-x-auto p-4 text-xs">
              <code>{stack}</code>
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
