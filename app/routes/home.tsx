import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Seating Chart" },
    { name: "description", content: "Seating chart app" },
  ];
}

export default function Home() {
  return (
    <div>
      <div className="flex min-h-svh p-6">
        <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
          <div>
            <h1 className="font-medium">Project ready!</h1>
            <p>You may now add components and start building.</p>
            <p>We&apos;ve already added the button component for you.</p>
            <Button className="mt-2">Button</Button>
          </div>
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>
                Track progress and recent activity for your Vite app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Your design system is ready. Start building your next component.
            </CardContent>
            <CardContent>
              <Button className="mt-2">Button</Button>
            </CardContent>
            <CardFooter>
              <div className="text-muted-foreground font-mono text-xs">
                (Press <kbd>d</kbd> to toggle dark mode)
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
