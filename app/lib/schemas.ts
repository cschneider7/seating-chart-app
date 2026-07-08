import * as z from "zod"

export const createStudentFormSchema = z.object({
  student_id: z.coerce.number<number>().int().positive(),
  name: z
    .string()
    .trim()
    .min(1, "Name must be at least 0 characters.")
    .max(100, "Name must be at most 100 characters."),
  classroom_id: z.uuidv4().nullable(),
  seat_id: z.uuidv4().nullable(),
})

export const editStudentFormSchema = z.object({
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
  classroom_id: z.nullish(z.uuidv4()),
  seat_id: z.nullish(z.uuidv4()),
})
