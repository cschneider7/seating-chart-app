import type { Route } from "./+types/classroom";

export type Classroom = {
  classroomId: string;
  period: number;
  subject: string;
};

const classrooms: Classroom[] = [
  { classroomId: "1", period: 2, subject: "Math 2" },
  { classroomId: "2", period: 3, subject: "Math 2" },
  { classroomId: "3", period: 4, subject: "Math 3" },
];

async function fetchClassroom(classroomId: string) {
  const classroom = classrooms.find((s) => s.classroomId === classroomId);
  if (!classroom) {
    throw new Error(`Classroom with ID ${classroomId} not found`);
  }
  return classroom;
}

export async function loader({ params }: Route.LoaderArgs) {
  return { classroom: await fetchClassroom(params.classroomId) };
}

export default function Component({
  loaderData,
}: Route.ComponentProps) {
  const { classroom } = loaderData;
  return (
    <div>
      <div className="p-4">
        <h2>Period {classroom.period} - <i>{classroom.subject}</i></h2>
        <p>Classroom ID: {classroom.classroomId}</p>
      </div>
    </div>
  );
}