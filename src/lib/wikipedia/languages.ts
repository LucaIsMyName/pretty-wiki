import { siteConfig } from "@/config/site"
import { wikiJson } from "@/lib/wikipedia/client"
import type { WikiLanguage } from "@/lib/wikipedia/types"

type SiteMatrixSite = {
  url?: string
  code?: string
  closed?: boolean | string
}

type SiteMatrixLanguage = {
  code?: string
  name?: string
  localname?: string
  dir?: string
  site?: SiteMatrixSite[]
}

type SiteMatrixResponse = {
  sitematrix?: Record<string, SiteMatrixLanguage | number | unknown>
}

let cachedLanguages: Promise<WikiLanguage[]> | null = null

function isLanguageEntry(value: unknown): value is SiteMatrixLanguage {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "site" in value
  )
}

function hasOpenWikipedia(language: SiteMatrixLanguage) {
  return (language.site ?? []).some((site) => {
    if (site.code !== "wiki" || !site.url?.includes(".wikipedia.org")) {
      return false
    }
    return site.closed !== true && site.closed !== "true"
  })
}

export function loadLanguages() {
  if (!cachedLanguages) {
    cachedLanguages = fetchLanguages().catch((error: unknown) => {
      cachedLanguages = null
      throw error
    })
  }
  return cachedLanguages
}

async function fetchLanguages() {
  const data = await wikiJson<SiteMatrixResponse>(
    "https://en.wikipedia.org/w/api.php?action=sitematrix&smtype=language&format=json&origin=*",
  )

  const languages: WikiLanguage[] = []
  for (const entry of Object.values(data.sitematrix ?? {})) {
    if (!isLanguageEntry(entry) || !entry.code || !hasOpenWikipedia(entry)) {
      continue
    }
    languages.push({
      code: entry.code,
      localName: entry.name || entry.localname || entry.code,
      name: entry.localname || entry.name || entry.code,
      dir: entry.dir === "rtl" ? "rtl" : "ltr",
    })
  }

  languages.sort((a, b) => a.localName.localeCompare(b.localName))
  return languages
}

export function findLanguage(languages: WikiLanguage[], code: string) {
  const normalized = code.toLowerCase()
  return languages.find((language) => language.code === normalized)
}

export function matchNavigatorLanguage(
  languages: WikiLanguage[],
  navigatorLanguage: string,
) {
  const exact = findLanguage(languages, navigatorLanguage)
  if (exact) return exact.code

  const primary = navigatorLanguage.toLowerCase().split("-")[0]
  if (primary) {
    const fallback = findLanguage(languages, primary)
    if (fallback) return fallback.code
  }

  return siteConfig.defaultLanguage
}

export function readPreferredLanguage() {
  try {
    return localStorage.getItem(siteConfig.languageStorageKey)
  } catch {
    return null
  }
}

export function writePreferredLanguage(code: string) {
  try {
    localStorage.setItem(siteConfig.languageStorageKey, code)
  } catch {
    // Storage can be blocked. The language still lives in the URL.
  }
}
