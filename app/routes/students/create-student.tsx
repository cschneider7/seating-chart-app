import { Form, redirect, useNavigate } from "react-router"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
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
import { Textarea } from "~/components/ui/textarea"
import { createStudent, getClassrooms } from "~/lib/db"
import type { Route } from "./+types/create-student"

const classrooms = [{ label: "Choose classroom", value: null }]

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const info = Object.fromEntries(formData)

  if (!info.name || !info.studentId) {
    throw new Error("Missing required fields: name and studentId")
  }

  const student = await createStudent(
    Number(info.studentId),
    info.name as string,
    info.classroomId ? (info.classroomId as string) : null
  )

  return redirect(`/students/${student.uuid}`)
}

export async function loader() {
  const classrooms = await getClassrooms()
  return { classrooms: classrooms }
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classrooms } = loaderData
  const navigate = useNavigate()

  const classroomOptions: [{ label: string; value: string | null }] = [
    { label: "Unassigned", value: null },
  ]
  classrooms.forEach((classroom) => {
    classroomOptions.push({
      label: `Period ${classroom.period} - ${classroom.subject}`,
      value: classroom.uuid,
    })
  })

  return (
    <div className="w-full max-w-md">
      <Form method="post">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Create New Student</FieldLegend>
            <FieldDescription>Enter new student info here.</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input name="name" placeholder="Bob Burger" required />
              </Field>
              <Field>
                <FieldLabel>ID Number</FieldLabel>
                <Input name="studentId" placeholder="123456" required />
              </Field>
              <Field>
                <FieldLabel>Classroom</FieldLabel>
                <FieldDescription>
                  The classroom the student is enrolled in
                </FieldDescription>
                <Select items={classroomOptions} name="classroomId">
                  <SelectTrigger className="w-full max-w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {classroomOptions.map((item) => (
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
          {/* <FieldSeparator />
          <FieldSet>
            <FieldLegend>[TODO] Image</FieldLegend>
            <FieldDescription>Upload student image</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="picture">Picture</FieldLabel>
                <Input id="picture" type="file"></Input>
                <FieldDescription>Select a picture to upload.</FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="checkout-7j9-optional-comments">[TODO] Notes</FieldLabel>
                <Textarea
                  id="checkout-7j9-optional-comments"
                  placeholder="Add any additional notes"
                  className="resize-none"
                />
              </Field>
            </FieldGroup>
          </FieldSet> */}
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
