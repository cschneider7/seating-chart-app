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
      route(":studentId/edit", "routes/students/edit-student.tsx"),
      route(":studentId/delete", "routes/students/delete-student.tsx"),
    ]),
  ]),

  ...prefix("classrooms", [
    layout("layouts/classrooms.tsx", [
      index("routes/classrooms/classroom-home.tsx"),
      route("new", "routes/classrooms/create-classroom.tsx"),
      route(":classroomId", "routes/classrooms/classroom.tsx"),
      route(":classroomId/edit", "routes/classrooms/edit-classroom.tsx"),
      route(":classroomId/delete", "routes/classrooms/delete-classroom.tsx"),
      route(
        ":classroomId/randomize-seating-chart",
        "routes/classrooms/randomize-seating-chart.tsx"
      ),
    ]),
  ]),
] satisfies RouteConfig
