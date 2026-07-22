"use client"

import { NavLink } from "react-router"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "~/components/ui/navigation-menu"
import { ThemeToggle } from "~/components/ui/theme-toggle"

export function Navbar() {
  return (
    <NavigationMenu className="w-full max-w-full justify-start pb-4">
      <NavigationMenuList className="w-full flex-wrap gap-1">
        <NavigationMenuItem>
          <NavigationMenuLink render={<NavLink to="/">Home</NavLink>} />
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            render={<NavLink to="/students">Students</NavLink>}
          />
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            render={<NavLink to="/classrooms">Classrooms</NavLink>}
          />
        </NavigationMenuItem>
        <NavigationMenuItem className="ml-auto">
          <ThemeToggle />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
