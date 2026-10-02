import { useEffect } from "react"
import { useLoaderData } from "react-router"
import { SearchResultList } from "@/components/search/SearchResultList"
import { siteConfig } from "@/config/site"
import { useWikiLanguage } from "@/lib/use-wiki-language"
import { searchLoader } from "@/routes/loaders"

export function SearchPage() {
  const { query, results } = useLoaderData<typeof searchLoader>()
  const { language } = useWikiLanguage()

  useEffect(() => {
    document.title = query
      ? `${query} · ${siteConfig.name}`
      : `Search · ${siteConfig.name}`
  }, [query])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <h1 className="font-heading text-4xl tracking-tight">
        {query ? `Results for “${query}”` : "Search"}
      </h1>
      {!query ? (
        <p className="mt-3 text-muted-foreground">
          Type a search to see articles.
        </p>
      ) : results.length === 0 ? (
        <p className="mt-3 text-muted-foreground">
          No articles for “{query}”.
        </p>
      ) : (
        <SearchResultList lang={language.code} results={results} />
      )}
    </div>
  )
}
