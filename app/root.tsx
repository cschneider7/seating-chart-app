import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useNavigation,
} from "react-router"
import { Spinner } from "~/components/ui/spinner"

import type { Route } from "./+types/root"
import "./app.css"
import { Navbar } from "~/components/navbar"
import { ThemeProvider } from "~/components/ui/theme-provider"

export function HydrateFallback() {
  return (
    <div id="loading-splash">
      <Spinner className="size-8" />
      <p>Loading, please wait...</p>
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()
  const isNavigating = Boolean(navigation.location)
  const theme = "light"

  return (
    <html lang="en" className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="mx-16 my-8">
        <Navbar />
        <Outlet />
      </div>
    </ThemeProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!"
  let details = "An unexpected error occurred."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
