import { siteConfig } from "@/config/site"
import { WikiError } from "@/lib/wikipedia/client"
import { loadArticle } from "@/lib/wikipedia/article"
import {
  findLanguage,
  loadLanguages,
  matchNavigatorLanguage,
  readPreferredLanguage,
  writePreferredLanguage,
} from "@/lib/wikipedia/languages"
import { titleKey, titlePath } from "@/lib/wikipedia/paths"
import { searchPages } from "@/lib/wikipedia/search"
import type {
  ArticleContent,
  SearchResult,
  WikiLanguage,
} from "@/lib/wikipedia/types"
import { redirect, type LoaderFunctionArgs } from "react-router"

export type LanguageLoaderData = {
  language: WikiLanguage
  languages: WikiLanguage[]
}

export type SearchLoaderData = {
  query: string
  results: SearchResult[]
}

export type ArticleLoaderData =
  | { kind: "article"; article: ArticleContent }
  | { kind: "not-found"; title: string }
  | { kind: "untranslated"; title: string }

export async function homeRedirectLoader() {
  const languages = await loadLanguages()
  const stored = readPreferredLanguage()
  const storedLanguage = stored ? findLanguage(languages, stored) : undefined
  const navigatorLanguage =
    typeof navigator === "undefined" ? "" : navigator.language
  const code =
    storedLanguage?.code ??
    matchNavigatorLanguage(languages, navigatorLanguage)
  return redirect(`/${code}`)
}

export async function languageLoader({ params }: LoaderFunctionArgs) {
  const languages = await loadLanguages()
  const language = findLanguage(languages, params.lang ?? "")
  if (!language) {
    throw new Response("Unknown language", { status: 404 })
  }
  writePreferredLanguage(language.code)
  return { language, languages } satisfies LanguageLoaderData
}

export async function searchLoader({ params, request }: LoaderFunctionArgs) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (!query) {
    return { query: "", results: [] } satisfies SearchLoaderData
  }
  const results = await searchPages(params.lang ?? siteConfig.defaultLanguage, query)
  return { query, results } satisfies SearchLoaderData
}

export async function articleLoader({
  params,
  request,
}: LoaderFunctionArgs): Promise<ArticleLoaderData> {
  const lang = params.lang ?? siteConfig.defaultLanguage
  const title = titleKey(params.title ?? "")
  const url = new URL(request.url)

  if (url.searchParams.get("untranslated") === "1") {
    return { kind: "untranslated", title }
  }

  try {
    const article = await loadArticle(lang, title)
    if (titleKey(article.summary.title) !== title) {
      throw redirect(`/${lang}/wiki/${titlePath(article.summary.title)}`)
    }
    return { kind: "article", article }
  } catch (error) {
    if (error instanceof Response) throw error
    if (error instanceof WikiError && error.status === 404) {
      return { kind: "not-found", title }
    }
    throw error
  }
}
