import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),

  ...prefix("students", [
    layout("layouts/students.tsx", [
      index("routes/students/student-home.tsx"),
      route("new", "routes/students/create-student.tsx"),
      route(":studentId", "routes/students/student.tsx"),
      route(":studentId/delete", "routes/students/delete-student.tsx"),
    ]),
  ]),

  route("classrooms/:classroomId", "routes/classrooms/classroom.tsx"),
] satisfies RouteConfig
