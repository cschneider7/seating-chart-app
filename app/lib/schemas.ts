import * as z from "zod"

const MAX_SEATS = 15

export const createStudentSchema = z.object({
  classroom_id: z.uuidv4().nullable(),
  student_id: z.coerce.number<number>().int().positive(),
  name: z
    .string()
    .trim()
    .min(1, "Name must be at least 0 characters.")
    .max(100, "Name must be at most 100 characters."),
})

export const editStudentSchema = z.object({
  classroom_id: z.uuidv4().nullish(),
  student_id: z.optional(
    z.coerce
      .number<number>("ID must be a number.")
      .int()
      .positive("ID must be a positive number.")
  ),
  name: z.optional(
    z
      .string()
      .trim()
      .min(1, "Name must be at least 0 characters.")
      .max(100, "Name must be at most 100 characters.")
  ),
})

export const createClassroomSchema = z.object({
  period: z.coerce.number<number>().int().positive(),
  subject: z
    .string()
    .trim()
    .min(1, "Subject must be at least 0 characters.")
    .max(50, "Subject must be at most 30 characters."),
})

export const editClassroomSchema = z.object({
  period: z.optional(z.coerce.number<number>().int().positive()),
  subject: z.optional(
    z
      .string()
      .trim()
      .min(1, "Subject must be at least 0 characters.")
      .max(50, "Subject must be at most 30 characters.")
  ),
})

export const createTableSchema = z.object({
  classroom_id: z.uuidv4(),
  seat_count: z.int().positive().max(MAX_SEATS),
  x_pos: z.int(),
  y_pos: z.int(),
})

export const editTableSchema = z.object({
  seat_count: z.optional(z.int().positive().max(MAX_SEATS)),
  x_pos: z.optional(z.int()),
  y_pos: z.optional(z.int()),
})

export const createSeatSchema = z.object({
  table_id: z.uuidv4(),
  student_id: z.uuidv4().nullable(),
  position: z.int().positive().max(MAX_SEATS),
})

export const editSeatSchema = z.object({
  student_id: z.uuidv4().nullish(),
})
