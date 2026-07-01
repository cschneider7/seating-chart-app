import { Link } from "react-router";
import { students } from "./student"
import type { Route } from "./+types/students-home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Students" },
    { name: "description", content: "Seating chart app" },
  ];
}

export default function Component() {
  const studentList = students.map((s) => (
    <li key={s.studentId} className="p-2">
      <Link to={`/students/${s.studentId}`}>
        <p>{s.name}</p>
      </Link>
    </li>
  ));

  return (
    <div>
      <div className="p-4">
        <ul>{studentList}</ul>
      </div>
    </div>
  );
}