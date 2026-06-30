import type { Route } from "./+types/student";

export type Student = {
  studentId: string;
  name: string;
  classroomId: string;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Students" },
    { name: "description", content: "Seating chart app" },
  ];
}

export const students: Student[] = [
  { studentId: "1", name: "Alice", classroomId: "1" },
  { studentId: "2", name: "Bob", classroomId: "2" },
  { studentId: "3", name: "Charlie", classroomId: "3" },
];

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  //const res = await fetch(`/api/v1/students/${params.studentId}`);
  //const student = await res.json();
  const student = students.find((s) => s.studentId === params.studentId);
  if (!student) {
    throw new Error(`Student with ID ${params.studentId} not found`);
  }
  return student;
}

// HydrateFallback is rendered while the client loader is running
export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function Component({
  loaderData,
}: Route.ComponentProps) {
  const { name, studentId, classroomId } = loaderData;
  return (
    <div>
      <div className="p-4">
        <h2>Name: {name}</h2>
        <p>Student ID: {studentId}</p>
        <p>Classroom ID: {classroomId}</p>
      </div>
    </div>
  );
}