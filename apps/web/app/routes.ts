import {
  type RouteConfig,
  index,
  prefix,
  route
} from "@react-router/dev/routes"

export default [
  index("./routes/home.tsx"),
  
  ...prefix("students", [
    index("./routes/students/students-home.tsx"),
    route(":studentId", "./routes/students/student.tsx")
  ]),

  route("classrooms/:classroomId", "./routes/classrooms/classroom.tsx")
] satisfies RouteConfig
