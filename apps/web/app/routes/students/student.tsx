import type { Route } from "./+types/student";

export type Student = {
  studentId: string;
  name: string;
  classroomId: string;
};

export const students: Student[] = [
  { studentId: "1", name: "Alice", classroomId: "1" },
  { studentId: "2", name: "Bob", classroomId: "2" },
  { studentId: "3", name: "Charlie", classroomId: "3" },
];

// export async function clientLoader({
//   params,
// }: Route.ClientLoaderArgs) {
//   const res = await fetch(`/api/products/${params.pid}`);
//   const product = await res.json();
//   return product;
// }

// // HydrateFallback is rendered while the client loader is running
// export function HydrateFallback() {
//   return <div>Loading...</div>;
// }

async function fetchStudent(studentId: string) {
  const student = students.find((s) => s.studentId === studentId);
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }
  return student;
}

export async function loader({ params }: Route.LoaderArgs) {
  return { student: await fetchStudent(params.studentId) };
}

export default function Component({
  loaderData,
}: Route.ComponentProps) {
  const { student } = loaderData;
  return (
    <div>
      <div className="p-4">
        <h2>Name: {student.name}</h2>
        <p>Student ID: {student.studentId}</p>
        <p>Classroom ID: {student.classroomId}</p>
      </div>
    </div>
  );
}