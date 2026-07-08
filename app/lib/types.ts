import * as z from "zod"

export interface Student {
  id: string
  student_id: number
  name: string
  classroom_id: string | null
  seat_id: string | null
}

export interface Classroom {
  id: string
  period: number
  subject: string
}
export type ClassroomConfig = Omit<Classroom, "id">
export type UpdateClassroomConfig = Partial<ClassroomConfig>
