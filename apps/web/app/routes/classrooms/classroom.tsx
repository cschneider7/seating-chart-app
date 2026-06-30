import type { Route } from "./+types/classroom";

export type Classroom = {
  classroomId: string;
  period: number;
  subject: string;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ];
}

const classrooms: Classroom[] = [
  { classroomId: "1", period: 2, subject: "Math 2" },
  { classroomId: "2", period: 3, subject: "Math 2" },
  { classroomId: "3", period: 4, subject: "Math 3" },
];

export async function clientLoader({
  params,
}: Route.ClientLoaderArgs) {
  //const res = await fetch(`/api/v1/classrooms/${params.classroomId}`);
  //const classroom = await res.json();
  const classroom = classrooms.find((s) => s.classroomId === params.classroomId);
  if (!classroom) {
    throw new Error(`Classroom with ID ${params.classroomId} not found`);
  }
  return classroom;
}

// HydrateFallback is rendered while the client loader is running
export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function Component({
  loaderData,
}: Route.ComponentProps) {
  const { period, subject, classroomId } = loaderData;
  return (
    <div>
      <div className="p-4">
        <h2>Period {period} - <i>{subject}</i></h2>
        <p>Classroom ID: {classroomId}</p>
      </div>
    </div>
  );
}