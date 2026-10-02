import { wikiFetch, wikiJson, wikiOrigin } from "@/lib/wikipedia/client"
import { findLanguage, loadLanguages } from "@/lib/wikipedia/languages"
import { titleKey, titlePath } from "@/lib/wikipedia/paths"
import type {
  ArticleContent,
  ArticleLanguage,
  ArticleSummary,
} from "@/lib/wikipedia/types"
import { transformArticleHtml } from "@/lib/wikipedia/html"
import { loadExternalPrefixes } from "@/lib/wikipedia/namespaces"

type SummaryResponse = {
  title?: string
  description?: string | null
  extract?: string
  thumbnail?: {
    source?: string
    width?: number
    height?: number
  } | null
}

type LangLink = {
  lang?: string
  langname?: string
  autonym?: string
  title?: string
}

type LangLinksResponse = {
  continue?: { llcontinue?: string }
  query?: {
    pages?: Array<{
      missing?: boolean
      langlinks?: LangLink[]
    }>
  }
}

export async function fetchSummary(
  lang: string,
  title: string,
  signal?: AbortSignal,
) {
  const data = await wikiJson<SummaryResponse>(
    `${wikiOrigin(lang)}/api/rest_v1/page/summary/${titlePath(title)}`,
    signal,
  )
  const thumbnail = data.thumbnail?.source
  const summary: ArticleSummary = {
    title: data.title || titleKey(title),
    description: data.description ?? null,
    extract: data.extract ?? "",
    thumbnail: thumbnail
      ? {
          source: thumbnail,
          width: data.thumbnail?.width ?? 320,
          height: data.thumbnail?.height ?? 320,
        }
      : null,
  }
  return summary
}

export async function fetchArticleHtml(
  lang: string,
  title: string,
  signal?: AbortSignal,
) {
  const response = await wikiFetch(
    `${wikiOrigin(lang)}/w/rest.php/v1/page/${titlePath(title)}/html?flavor=view`,
    signal,
  )
  return response.text()
}

export async function fetchLangLinks(
  lang: string,
  title: string,
  signal?: AbortSignal,
) {
  const links: ArticleLanguage[] = []
  let continuation: string | undefined

  for (let page = 0; page < 5; page += 1) {
    const url = new URL(`${wikiOrigin(lang)}/w/api.php`)
    url.searchParams.set("action", "query")
    url.searchParams.set("format", "json")
    url.searchParams.set("formatversion", "2")
    url.searchParams.set("origin", "*")
    url.searchParams.set("prop", "langlinks")
    url.searchParams.set("lllimit", "500")
    url.searchParams.set("llprop", "autonym|langname")
    url.searchParams.set("titles", titleKey(title))
    if (continuation) url.searchParams.set("llcontinue", continuation)

    const data = await wikiJson<LangLinksResponse>(url.toString(), signal)
    const entry = data.query?.pages?.[0]
    if (entry?.missing) return []

    for (const link of entry?.langlinks ?? []) {
      if (!link.lang || !link.title) continue
      links.push({
        code: link.lang,
        name: link.langname || link.autonym || link.lang,
        localName: link.autonym || link.langname || link.lang,
        title: link.title,
      })
    }

    continuation = data.continue?.llcontinue
    if (!continuation) break
  }

  links.sort((a, b) => a.localName.localeCompare(b.localName))
  return links
}

export async function loadArticle(
  lang: string,
  title: string,
  signal?: AbortSignal,
): Promise<ArticleContent> {
  const summary = await fetchSummary(lang, title, signal)
  const [rawHtml, translations, languages, prefixes] = await Promise.all([
    fetchArticleHtml(lang, summary.title, signal),
    fetchLangLinks(lang, summary.title, signal),
    loadLanguages(),
    loadExternalPrefixes(lang),
  ])
  const current = findLanguage(languages, lang)
  const transformed = transformArticleHtml(rawHtml, lang, summary.title, prefixes)

  return {
    summary,
    html: transformed.html,
    headings: transformed.headings,
    hasInfobox: transformed.hasInfobox,
    languages: [
      {
        code: lang,
        name: current?.name ?? lang,
        localName: current?.localName ?? lang,
        title: summary.title,
      },
      ...translations.filter((translation) => translation.code !== lang),
    ],
  }
}
