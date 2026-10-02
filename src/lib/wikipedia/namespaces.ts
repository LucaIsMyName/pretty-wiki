import { wikiJson, wikiOrigin } from "@/lib/wikipedia/client"

const externalNamespaceIds = new Set([-2, -1, 6, 7, 14, 15])

type NamespaceInfo = {
  id?: number
  name?: string
  canonical?: string
}

type NamespaceResponse = {
  query?: {
    namespaces?: Record<string, NamespaceInfo>
  }
}

const cache = new Map<string, Promise<string[]>>()

const fallbackPrefixes = [
  "File",
  "Image",
  "Media",
  "Special",
  "Category",
]

export function loadExternalPrefixes(lang: string) {
  const existing = cache.get(lang)
  if (existing) return existing

  const pending = fetchPrefixes(lang).catch((error: unknown) => {
    cache.delete(lang)
    throw error
  })
  cache.set(lang, pending)
  return pending
}

async function fetchPrefixes(lang: string) {
  const url = new URL(`${wikiOrigin(lang)}/w/api.php`)
  url.searchParams.set("action", "query")
  url.searchParams.set("meta", "siteinfo")
  url.searchParams.set("siprop", "namespaces")
  url.searchParams.set("format", "json")
  url.searchParams.set("formatversion", "2")
  url.searchParams.set("origin", "*")

  const data = await wikiJson<NamespaceResponse>(url.toString())
  const prefixes = new Set<string>(fallbackPrefixes)

  for (const namespace of Object.values(data.query?.namespaces ?? {})) {
    if (!externalNamespaceIds.has(namespace.id ?? 0)) continue
    if (namespace.name) prefixes.add(namespace.name)
    if (namespace.canonical) prefixes.add(namespace.canonical)
  }

  return [...prefixes]
}
