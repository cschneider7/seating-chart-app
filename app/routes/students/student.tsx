import { Badge } from "~/components/ui/badge";
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

import type { Route } from "./+types/student";
import type { Student } from "~/lib/types";
import { Form } from "react-router";

export async function loader({ params }: Route.ClientLoaderArgs) {
  const res = await fetch(`http://localhost:3000/api/v1/students/${params.studentId}`);
  if (!res.ok) {
    throw new Response("Student Not Found", { status: 404 });
  }

  const json = await res.json();
  console.log(json);
  return json.data;
}

export default function Component({
  loaderData,
}: Route.ComponentProps) {
  const student: Student = loaderData;
  return (
    <div className="w-[400px] justify-center">
      <Card className="relative mx-auto w-full max-w-sm pt-0">
        <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Student image"
          className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
        />
        <CardHeader>
          <CardAction>
            {student.classroom_id ? <Badge variant="secondary">Period {student.classroom_id}</Badge> : <Badge variant="outline">Unassigned</Badge>}
          </CardAction>
          <CardTitle>{student.name}</CardTitle>
          <CardDescription>
            Student ID: {student.student_id}
          </CardDescription>
        </CardHeader>
        <CardContent>
          Notes: Blah blah blah
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline">Edit</Button>
          <Form
            action={`/students/${student.uuid}/delete`}
            method="delete"
            onSubmit={(event) => {
              if (!confirm(`Are you sure you want to delete ${student.name}?`)) {
                event.preventDefault();
              }
            }}
          >
            <Button variant="destructive" type="submit">Delete</Button>
          </Form>
        </CardFooter>
      </Card>
    </div>
  );
}