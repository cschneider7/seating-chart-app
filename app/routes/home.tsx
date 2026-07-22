import { ArrowUpRightIcon, ClipboardList, UsersRound } from "lucide-react"
import { Link } from "react-router"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "~/components/ui/item"
import type { Route } from "./+types/home"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Seating Chart" },
    { name: "description", content: "Seating chart app" },
  ]
}

export default function Home() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium">Seating Chart</h1>
        <p className="text-muted-foreground">
          Manage your students, classrooms, and seating charts.
        </p>
      </div>
      <ItemGroup className="w-full max-w-md">
        <Item variant="outline" render={<Link to="/students" />}>
          <ItemMedia variant="image">
            <UsersRound className="size-7" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Students</ItemTitle>
            <ItemDescription>
              View, add, and edit the student roster.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <ArrowUpRightIcon className="size-4 text-muted-foreground" />
          </ItemActions>
        </Item>
        <Item variant="outline" render={<Link to="/classrooms" />}>
          <ItemMedia variant="image">
            <ClipboardList className="size-7" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Classrooms</ItemTitle>
            <ItemDescription>
              Manage classrooms and their seating charts.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <ArrowUpRightIcon className="size-4 text-muted-foreground" />
          </ItemActions>
        </Item>
      </ItemGroup>
    </div>
  )
}
