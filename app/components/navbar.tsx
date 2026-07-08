"use client"

import { NavLink } from "react-router"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "~/components/ui/navigation-menu"
import { ThemeToggle } from "~/components/ui/theme-toggle"

export function Navbar() {
  return (
    <NavigationMenu className="w-full max-w-full justify-start pb-4">
      <NavigationMenuList className="w-full gap-1">
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
        {/* <NavigationMenuItem>
          <NavigationMenuTrigger>Classes</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul>
              <NavigationMenuLink
                render={<NavLink to="/classrooms/1">Period 2</NavLink>}
              />
              <NavigationMenuLink
                render={<NavLink to="/classrooms/2">Period 3</NavLink>}
              />
              <NavigationMenuLink
                render={<NavLink to="/classrooms/3">Period 4</NavLink>}
              />
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem> */}
        <NavigationMenuItem className="ml-auto">
          <ThemeToggle />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
