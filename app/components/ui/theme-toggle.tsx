import { Moon, Sun } from "lucide-react"
import { useFetcher, useRouteLoaderData } from "react-router"

import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { useTheme, type Theme } from "~/components/ui/theme-provider"

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const fetcher = useFetcher();

  // Read the current theme from the root loader data
  const rootData = useRouteLoaderData<{ theme: Theme }>("root");
  const currentTheme = rootData?.theme ?? "light";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      }>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}