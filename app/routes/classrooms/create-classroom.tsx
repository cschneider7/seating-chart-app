import { Form, redirect, useNavigate } from "react-router"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { createClassroom } from "~/lib/db"
import type { ClassroomConfig } from "~/lib/types"
import type { Route } from "./+types/create-classroom"

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const info = Object.fromEntries(formData)

  if (!info.subject || !info.period) {
    throw new Error("Missing required fields: subject and period")
  }

  const classroomInfo: ClassroomConfig = {
    period: Number(info.period),
    subject: info.subject as string,
  }

  const classroom = await createClassroom(classroomInfo)
  return redirect(`/classrooms/${classroom.id}`)
}

export default function Component() {
  const navigate = useNavigate()

  const periods = []
  for (let i = 0; i < 9; i++) {
    periods.push({ label: i.toString(), value: i })
  }

  return (
    <div className="w-full max-w-md">
      <Form method="post">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Create New Classroom</FieldLegend>
            <FieldDescription>Enter new classroom info here.</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel>Subject</FieldLabel>
                <Input name="subject" placeholder="Math 2" required />
              </Field>
              <Field>
                <FieldLabel>Period Number</FieldLabel>
                <Select items={periods} name="period" required>
                  <SelectTrigger className="w-full max-w-48">
                    <SelectValue placeholder="Select a period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {periods.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </FieldSet>
          <Field orientation="horizontal">
            <Button type="submit">Submit</Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </Field>
        </FieldGroup>
      </Form>
    </div>
  )
}
