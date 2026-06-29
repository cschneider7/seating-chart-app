import { Link } from "react-router";
import { students } from "./student"

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