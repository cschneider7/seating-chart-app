import * as z from "zod"
import {
  ClassroomSchema,
  CreateClassroomSchema,
  CreateStudentSchema,
  RandomizeSeatingChartOptionsSchema,
  SeatingChartSchema,
  StudentSchema,
  UpdateClassroomSchema,
  UpdateStudentSchema,
  type Classroom,
  type RandomizeSeatingChartOptions,
  type SeatingChart,
  type Student,
} from "~/lib/schemas"

async function getErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    if (typeof json?.message === "string") {
      return json.message
    }
  } catch {
    // Not JSON - fall through to using the raw text below.
  }
  return text || fallback
}

export async function getStudent(studentId: string): Promise<Student> {
  const res = await fetch(`http://localhost:3000/api/v1/students/${studentId}`)
  if (!res.ok) {
    throw new Response("Student not found", { status: 404 })
  }

  const json = await res.json()
  return z.parse(StudentSchema, json.data)
}

export async function getStudents(): Promise<Student[]> {
  const res = await fetch("http://localhost:3000/api/v1/students")
  if (!res.ok) {
    throw new Error(`Error getting list of students: ", ${res.status}`)
  }

  const json = await res.json()
  return z.parse(z.array(StudentSchema), json.data)
}

export async function createStudent(
  studentInfo: z.infer<typeof CreateStudentSchema>
): Promise<Student> {
  const response = await fetch("http://localhost:3000/api/v1/students", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(z.parse(CreateStudentSchema, studentInfo)),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Error creating student"))
  }

  const json = await response.json()
  return z.parse(StudentSchema, json.data)
}

export async function updateStudent(
  studentId: string,
  updates: z.infer<typeof UpdateStudentSchema>
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/students/${studentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(z.parse(UpdateStudentSchema, updates)),
    }
  )

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Error updating student"))
  }
}

export async function deleteStudent(studentId: string) {
  const response = await fetch(
    `http://localhost:3000/api/v1/students/${studentId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Error deleting student"))
  }
}

export async function getClassroom(classroomId: string): Promise<Classroom> {
  const res = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}`
  )
  if (!res.ok) {
    throw new Response("Classroom not found", { status: 404 })
  }

  const json = await res.json()
  return z.parse(ClassroomSchema, json.data)
}

export async function getClassrooms(): Promise<Classroom[]> {
  const res = await fetch("http://localhost:3000/api/v1/classrooms")
  if (!res.ok) {
    throw new Error(`Error getting list of classrooms: ", ${res.status}`)
  }

  const json = await res.json()
  return z.parse(z.array(ClassroomSchema), json.data)
}

export async function createClassroom(
  classroomInfo: z.infer<typeof CreateClassroomSchema>
): Promise<Classroom> {
  const response = await fetch("http://localhost:3000/api/v1/classrooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(z.parse(CreateClassroomSchema, classroomInfo)),
  })

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Error creating classroom"))
  }

  const json = await response.json()
  return z.parse(ClassroomSchema, json.data)
}

export async function updateClassroom(
  classroomId: string,
  updates: z.infer<typeof UpdateClassroomSchema>
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(z.parse(UpdateClassroomSchema, updates)),
    }
  )

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Error updating classroom"))
  }
}

export async function deleteClassroom(classroomId: string) {
  const response = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Error deleting classroom"))
  }
}

export async function getClassroomSeatingChart(
  classroomId: string
): Promise<SeatingChart> {
  const res = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart`
  )
  if (!res.ok) {
    throw new Error(`Error getting seating chart assignments: ", ${res.status}`)
  }

  const json = await res.json()
  const seatingChart = z.parse(SeatingChartSchema, json.data)

  return seatingChart
}

export async function updateClassroomSeatingChart(
  classroomId: string,
  seatingChart: SeatingChart
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(z.parse(SeatingChartSchema, seatingChart)),
    }
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Error updating seating chart")
    )
  }
}

export async function generateRandomSeatingChart(
  classroomId: string,
  options: RandomizeSeatingChartOptions
): Promise<SeatingChart> {
  const response = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart/randomize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        z.parse(RandomizeSeatingChartOptionsSchema, options)
      ),
    }
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Error generating random seating chart")
    )
  }

  const json = await response.json()
  return z.parse(SeatingChartSchema, json.data)
}
