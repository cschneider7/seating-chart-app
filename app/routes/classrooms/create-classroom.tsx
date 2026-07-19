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
import { createClassroom } from "~/lib/api"
import { CreateClassroomSchema } from "~/lib/schemas"
import type { Route } from "./+types/create-classroom"

const periodOptions = Array.from({ length: 9 }, (_, i) => ({
  label: i.toString(),
  value: i,
}))

export async function action({ request }: Route.ActionArgs) {
  const rawData = await request.json()
  const result = CreateClassroomSchema.safeParse(rawData)

  if (!result.success) {
    return z.treeifyError(result.error)
  }

  const classroom = await createClassroom(result.data)
  return redirect(`/classrooms/${classroom.id}`)
}

export default function Component() {
  const submit = useSubmit()

  const form = useForm<z.infer<typeof CreateClassroomSchema>>({
    resolver: zodResolver(CreateClassroomSchema),
    defaultValues: {
      subject: "",
    },
  })

  const onSubmit = (data: z.infer<typeof CreateClassroomSchema>) =>
    submit(data, { method: "post", encType: "application/json" })

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="relative mx-auto w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Create new classroom</CardTitle>
          <CardDescription>Enter new classroom info here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form id="create-classroom" onSubmit={form.handleSubmit(onSubmit)}>
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
            <Button type="submit" form="create-classroom">
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
    "We couldn't confirm your classroom was created. If you already submitted this form, check the classroom list before trying again."
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
          <CardTitle>Couldn't create classroom</CardTitle>
          <CardDescription>{details}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Field orientation="horizontal">
            <Button variant="outline" render={<Link to="/classrooms" />}>
              Back to classrooms
            </Button>
            <Button render={<Link to="/classrooms/new" reloadDocument />}>
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
