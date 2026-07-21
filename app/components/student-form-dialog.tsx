import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useEffect, useState } from "react"
import { useFetcher, useNavigate } from "react-router"
import { toast } from "sonner"
import * as z from "zod"
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
import { Button } from "~/components/ui/button"
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
import type { MutationResult } from "~/lib/action-results"
import type { Classroom, Student } from "~/lib/schemas"
import { CreateStudentSchema, UpdateStudentSchema } from "~/lib/schemas"

type StudentFormDialogProps =
  | { mode: "create"; trigger: React.ReactElement }
  | { mode: "edit"; student: Student; trigger: React.ReactElement }

export function StudentFormDialog(props: StudentFormDialogProps) {
  const { mode, trigger } = props
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const formPath =
    mode === "create" ? "/students/new" : `/students/${props.student.id}/edit`

  const classroomsFetcher = useFetcher<{ classrooms: Classroom[] }>()
  // Only fires on open, not on every classroomsFetcher re-render (it changes
  // identity as load() progresses) - otherwise this would loop.
  useEffect(() => {
    if (open && classroomsFetcher.state === "idle" && !classroomsFetcher.data) {
      classroomsFetcher.load(formPath)
    }
  }, [open])
  const classrooms = classroomsFetcher.data?.classrooms ?? []

  const submitFetcher = useFetcher<MutationResult>()
  const isSubmitting = submitFetcher.state !== "idle"

  const schema = mode === "create" ? CreateStudentSchema : UpdateStudentSchema

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues:
      mode === "create"
        ? { name: "", classroom_id: null }
        : {
            name: props.student.name,
            student_id: props.student.student_id,
            classroom_id: props.student.classroom_id,
          },
  })

  // formState is a proxy; dirtyFields must be read here, not inside onSubmit.
  const { dirtyFields } = form.formState

  const onSubmit = (data: z.infer<typeof schema>) => {
    const submitData =
      mode === "create"
        ? data
        : Object.fromEntries(
            Object.entries(data).filter(
              ([key]) => dirtyFields[key as keyof typeof dirtyFields]
            )
          )
    submitFetcher.submit(submitData, {
      method: "post",
      action: formPath,
      encType: "application/json",
    })
  }

  useEffect(() => {
    const data = submitFetcher.data
    if (submitFetcher.state === "idle" && data?.ok) {
      setOpen(false)
      toast.success(mode === "create" ? "Student created" : "Student updated", {
        action: {
          label: "View",
          onClick: () => navigate(`/students/${data.id}`),
        },
      })
    }
  }, [submitFetcher.state, submitFetcher.data])

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create new student" : "Edit student"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Enter new student info here."
              : "Enter student info here."}
          </DialogDescription>
        </DialogHeader>
        {submitFetcher.data && !submitFetcher.data.ok && (
          <p className="text-sm text-destructive">{submitFetcher.data.error}</p>
        )}
        <form id="student-form" onSubmit={form.handleSubmit(onSubmit)}>
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
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" form="student-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
