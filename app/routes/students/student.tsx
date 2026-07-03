import type { Route } from "./+types/student";
import type { Student } from "~/lib/types";

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
    <div>
      <div className="p-4">
        <h2>Name: {student.name}</h2>
        <p>Student ID: {student.student_id}</p>
        <p>Classroom ID: {student.classroom_id}</p>
      </div>
    </div>
  );
}