import DOMPurify from "dompurify"
import { titleKey, titlePath } from "@/lib/wikipedia/paths"
import type { ArticleHeading } from "@/lib/wikipedia/types"

export function sanitizeExcerpt(excerpt: string) {
  return DOMPurify.sanitize(excerpt, {
    ALLOWED_TAGS: ["span"],
    ALLOWED_ATTR: ["class"],
  })
}

export function transformArticleHtml(
  rawHtml: string,
  lang: string,
  pageTitle: string,
  externalPrefixes: string[],
) {
  const document = new DOMParser().parseFromString(rawHtml, "text/html")
  const root = document.body

  root
    .querySelectorAll(
      "script, style, link, .mw-editsection, #toc, .toc, .mw-empty-elt",
    )
    .forEach((node) => node.remove())

  const headings: ArticleHeading[] = []
  root.querySelectorAll("h2, h3").forEach((heading) => {
    if (heading.closest(".infobox, .navbox, .vertical-navbox, .thumb")) return
    const text = heading.textContent?.replace(/\s+/g, " ").trim() ?? ""
    if (!text) return
    const id = `section-${headings.length}`
    heading.id = id
    headings.push({
      id,
      text,
      level: heading.tagName === "H2" ? 2 : 3,
    })
  })

  root.querySelectorAll("a").forEach((anchor) => {
    rewriteAnchor(anchor, lang, pageTitle, externalPrefixes)
  })

  root.querySelectorAll("img, audio, video, source").forEach((element) => {
    for (const attribute of ["src", "poster"]) {
      const value = element.getAttribute(attribute)
      if (value?.startsWith("//")) {
        element.setAttribute(attribute, `https:${value}`)
      }
    }
    const srcset = element.getAttribute("srcset")
    if (srcset?.includes("//")) {
      element.setAttribute(
        "srcset",
        srcset.replaceAll(/(^|[\s,])\/\//g, "$1https://"),
      )
    }
  })

  const html = DOMPurify.sanitize(root.innerHTML, {
    ADD_ATTR: ["target", "rel", "controls"],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "link"],
  })

  return {
    html,
    headings,
    hasInfobox: root.querySelector(".infobox") !== null,
  }
}

function rewriteAnchor(
  anchor: HTMLAnchorElement,
  lang: string,
  pageTitle: string,
  externalPrefixes: string[],
) {
  const href = anchor.getAttribute("href")
  if (!href || href.startsWith("#")) return

  const rel = anchor.getAttribute("rel") ?? ""
  const title = wikiTitleFromHref(href)
  const hash = href.includes("#") ? href.slice(href.indexOf("#")) : ""

  if (rel.includes("redlink") || anchor.classList.contains("new")) {
    anchor.removeAttribute("href")
    return
  }

  if (title && titleKey(title) === titleKey(pageTitle)) {
    anchor.setAttribute("href", hash || "#")
    return
  }

  if (title && isExternalTitle(title, externalPrefixes)) {
    anchor.setAttribute(
      "href",
      `https://${lang}.wikipedia.org/wiki/${titlePath(title)}`,
    )
    anchor.setAttribute("target", "_blank")
    anchor.setAttribute("rel", "noreferrer noopener")
    return
  }

  const wikiLink = rel.split(/\s+/).includes("mw:WikiLink")
  const isLocalWiki =
    wikiLink || href.startsWith("./") || href.startsWith("/wiki/")
  if (title && isLocalWiki) {
    anchor.setAttribute("href", `/${lang}/wiki/${titlePath(title)}`)
    anchor.removeAttribute("title")
    return
  }

  const remote = wikipediaArticleFromHref(href)
  if (remote && !isExternalTitle(remote.title, externalPrefixes)) {
    anchor.setAttribute(
      "href",
      `/${remote.lang}/wiki/${titlePath(remote.title)}`,
    )
    anchor.removeAttribute("title")
    return
  }

  if (href.startsWith("http") || href.startsWith("//")) {
    if (href.startsWith("//")) anchor.setAttribute("href", `https:${href}`)
    anchor.setAttribute("target", "_blank")
    anchor.setAttribute("rel", "noreferrer noopener")
  }
}

export function wikiTitleFromHref(href: string) {
  const path = href.split("#")[0]?.split("?")[0] ?? ""
  if (!path) return null

  if (path.startsWith("./")) return safePathDecode(path.slice(2))

  if (path.startsWith("//") || path.startsWith("http")) {
    try {
      const url = new URL(path.startsWith("//") ? `https:${path}` : path)
      return titleFromPathname(url.pathname)
    } catch {
      return null
    }
  }

  return titleFromPathname(path)
}

function wikipediaArticleFromHref(href: string) {
  if (!href.startsWith("http") && !href.startsWith("//")) return null
  try {
    const url = new URL(href.startsWith("//") ? `https:${href}` : href)
    const host = url.hostname.match(/^([a-z0-9-]+)\.wikipedia\.org$/)
    const title = titleFromPathname(url.pathname)
    if (!host?.[1] || !title) return null
    return { lang: host[1], title }
  } catch {
    return null
  }
}

function titleFromPathname(pathname: string) {
  const match = pathname.match(/\/wiki\/(.+)$/)
  if (!match?.[1]) return null
  return safePathDecode(match[1])
}

function safePathDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isExternalTitle(title: string, prefixes: string[]) {
  const key = titleKey(title).toLowerCase()
  return prefixes.some((prefix) => key.startsWith(`${prefix.toLowerCase()}:`))
}
