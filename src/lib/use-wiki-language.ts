import { useRouteLoaderData } from "react-router"
import type { LanguageLoaderData } from "@/routes/loaders"

export function useWikiLanguage() {
  const data = useRouteLoaderData("language") as LanguageLoaderData | undefined
  if (!data) {
    throw new Error("Language data is missing")
  }
  return data
}
