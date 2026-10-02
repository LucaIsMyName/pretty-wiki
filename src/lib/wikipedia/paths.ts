export function safeDecode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "))
  } catch {
    return value
  }
}

export function titleKey(title: string) {
  return safeDecode(title).replace(/_/g, " ").trim()
}

export function titlePath(title: string) {
  return encodeURIComponent(titleKey(title).replace(/ /g, "_"))
}

export function articlePath(lang: string, title: string) {
  return `/${lang}/wiki/${titlePath(title)}`
}

export function searchPath(lang: string, query?: string) {
  const trimmed = query?.trim()
  if (!trimmed) return `/${lang}/search`
  return `/${lang}/search?q=${encodeURIComponent(trimmed)}`
}

export function absoluteMediaUrl(url: string) {
  if (url.startsWith("//")) return `https:${url}`
  return url
}

export function largerThumbnail(url: string, size = 250) {
  return absoluteMediaUrl(url).replace(/\/\d+px-/, `/${size}px-`)
}
