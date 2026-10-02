import { isRouteErrorResponse, Link, useRouteError } from "react-router"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"

export function RouteError() {
  const error = useRouteError()
  const missing = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-4xl">
        {missing ? "Page not found" : "Wikipedia didn't respond"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {missing
          ? "That page isn't part of Pretty Wiki."
          : "Check your connection and try again."}
      </p>
      <Button asChild className="mt-6">
        <Link to="/">{siteConfig.name}</Link>
      </Button>
    </div>
  )
}
