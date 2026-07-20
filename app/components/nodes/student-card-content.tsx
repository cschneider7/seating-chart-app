import { ItemContent, ItemHeader, ItemTitle } from "~/components/ui/item"
import type { Student } from "~/lib/schemas"

export function StudentCardContent({ student }: { student: Student }) {
  return (
    <>
      <ItemHeader>
        <img
          src="https://avatar.vercel.sh/shadcn1"
          alt="Student image"
          draggable="false"
          className="aspect-5/4 w-full rounded-sm object-cover brightness-60 grayscale dark:brightness-40"
        />
      </ItemHeader>
      <ItemContent>
        <ItemTitle className="text-xs select-none">{student.name}</ItemTitle>
      </ItemContent>
    </>
  )
}
