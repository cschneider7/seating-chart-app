import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { redirect, useActionData, useNavigation, useSubmit } from "react-router"
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
import { Spinner } from "~/components/ui/spinner"
import { getClassrooms, getStudent, updateStudent } from "~/lib/api"
import { UpdateStudentSchema } from "~/lib/schemas"
import type { Route } from "./+types/edit-student"

export async function loader({ params }: Route.ClientLoaderArgs) {
  const student = await getStudent(params.studentId)
  const classrooms = await getClassrooms()

  return {
    student: student,
    classrooms: classrooms,
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const rawData = await request.json()
  const result = UpdateStudentSchema.safeParse(rawData)

  if (!result.success) {
    return z.treeifyError(result.error)
  }

  await updateStudent(params.studentId, result.data)

  return redirect(`/students/${params.studentId}`)
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { student, classrooms } = loaderData
  let submit = useSubmit()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state !== "idle"

  const form = useForm<z.infer<typeof UpdateStudentSchema>>({
    resolver: zodResolver(UpdateStudentSchema),
    defaultValues: {
      name: student.name,
      student_id: student.student_id,
      classroom_id: student.classroom_id,
    },
  })

  // formState is a proxy; dirtyFields must be read here, not inside onSubmit.
  const { dirtyFields } = form.formState

  const onSubmit = (data: z.infer<typeof UpdateStudentSchema>) => {
    const changedData = Object.fromEntries(
      Object.entries(data).filter(
        ([key]) => dirtyFields[key as keyof typeof dirtyFields]
      )
    )
    submit(changedData, { method: "post", encType: "application/json" })
  }

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
      <Card className="w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Edit student</CardTitle>
          <CardDescription>Enter student info here.</CardDescription>
        </CardHeader>
        <CardContent>
          {actionData && (
            <p className="mb-4 text-sm text-destructive">
              There was a problem with your submission. Please check the form
              and try again.
            </p>
          )}
          <form id="edit-student" onSubmit={form.handleSubmit(onSubmit)}>
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
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button type="submit" form="edit-student" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Submit
            </Button>
          </Field>
        </CardFooter>
      </Card>
    </div>
  )
}
