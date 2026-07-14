import * as z from "zod"

export interface Student {
  id: string
  student_id: number
  name: string
  classroom_id: string | null
}

export interface Classroom {
  id: string
  period: number
  subject: string
}

export interface Table {
  id: string
  classroom_id: string
  table_number: number
  seat_count: number
  x_pos: number
  y_pos: number
}

export interface SeatAssignment {
  table_id: string
  position: number
  student_id: string
}
