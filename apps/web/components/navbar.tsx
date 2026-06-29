"use client"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from "@workspace/ui/components/navigation-menu"
import { NavLink } from "react-router"

export function Navbar() {
  return (
    <div className="p-4">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink render={<NavLink to="/">Home</NavLink>} />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink render={<NavLink to="/students">Students</NavLink>} />
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Classes</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul>
                <NavigationMenuLink render={<NavLink to="/classrooms/1">Period 2</NavLink>} />
                <NavigationMenuLink render={<NavLink to="/classrooms/2">Period 3</NavLink>} />
                <NavigationMenuLink render={<NavLink to="/classrooms/3">Period 4</NavLink>} />
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}