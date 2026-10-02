import { siteConfig } from "@/config/site"
import { wikiJson, wikiOrigin } from "@/lib/wikipedia/client"
import { absoluteMediaUrl } from "@/lib/wikipedia/paths"
import type { SearchResult, TitleSuggestion } from "@/lib/wikipedia/types"

type ApiSearchPage = {
  id: number
  title: string
  excerpt?: string
  description?: string | null
  thumbnail?: {
    url?: string
    width?: number
    height?: number
  } | null
}

type SearchResponse = {
  pages?: ApiSearchPage[]
}

function searchUrl(lang: string, path: "page" | "title", query: string, limit: number) {
  const url = new URL(`${wikiOrigin(lang)}/w/rest.php/v1/search/${path}`)
  url.searchParams.set("q", query)
  url.searchParams.set("limit", String(limit))
  return url.toString()
}

function mapResult(page: ApiSearchPage): SearchResult {
  const thumbnailUrl = page.thumbnail?.url
  return {
    id: page.id,
    title: page.title,
    excerpt: page.excerpt ?? "",
    description: page.description ?? null,
    thumbnail: thumbnailUrl
      ? {
          url: absoluteMediaUrl(thumbnailUrl),
          width: page.thumbnail?.width ?? 60,
          height: page.thumbnail?.height ?? 60,
        }
      : null,
  }
}

export async function searchPages(
  lang: string,
  query: string,
  signal?: AbortSignal,
) {
  const data = await wikiJson<SearchResponse>(
    searchUrl(lang, "page", query, siteConfig.searchLimit),
    signal,
  )
  return (data.pages ?? []).map(mapResult)
}

export async function suggestTitles(
  lang: string,
  query: string,
  signal?: AbortSignal,
): Promise<TitleSuggestion[]> {
  const data = await wikiJson<SearchResponse>(
    searchUrl(lang, "title", query, siteConfig.suggestionLimit),
    signal,
  )
  return (data.pages ?? []).map((page) => ({
    title: page.title,
    description: page.description ?? null,
  }))
}
