import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { redirect, useSubmit } from "react-router"
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { getClassroom, updateClassroom } from "~/lib/db"
import { editClassroomFormSchema } from "~/lib/schemas"
import type { Route } from "./+types/edit-classroom"

const periodOptions = Array.from({ length: 9 }, (_, i) => ({
  label: i.toString(),
  value: i,
}))

export async function loader({ params }: Route.ClientLoaderArgs) {
  const classroom = await getClassroom(params.classroomId)
  return { classroom: classroom }
}

export async function action({ params, request }: Route.ActionArgs) {
  const rawData = await request.json()
  const result = editClassroomFormSchema.safeParse(rawData)

  if (!result.success) {
    return z.treeifyError(result.error)
  }

  await updateClassroom(params.classroomId, result.data)

  return redirect(`/classrooms/${params.classroomId}`)
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classroom } = loaderData
  const submit = useSubmit()

  const form = useForm<z.infer<typeof editClassroomFormSchema>>({
    resolver: zodResolver(editClassroomFormSchema),
    defaultValues: {
      subject: classroom.subject,
      period: classroom.period,
    },
  })

  // formState is a proxy that only tracks fields read during render, so
  // dirtyFields must be destructured here (not just inside onSubmit) for
  // react-hook-form to keep it up to date.
  const { dirtyFields } = form.formState

  const onSubmit = (data: z.infer<typeof editClassroomFormSchema>) => {
    const changedData = Object.fromEntries(
      Object.entries(data).filter(
        ([key]) => dirtyFields[key as keyof typeof dirtyFields]
      )
    )
    submit(changedData, { method: "post", encType: "application/json" })
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Edit classroom</CardTitle>
          <CardDescription>Enter classroom info here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="edit-classroom" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="subject"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      Subject<span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={fieldState.invalid}
                      placeholder="Math 2"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="period"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      Period Number
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={field.onChange}
                      items={periodOptions}
                    >
                      <SelectTrigger
                        aria-invalid={fieldState.invalid}
                        className="w-full max-w-48"
                      >
                        <SelectValue placeholder="Select a period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {periodOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
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
            <Button type="submit" form="edit-classroom">
              Submit
            </Button>
          </Field>
        </CardFooter>
      </Card>
    </div>
  )
}
