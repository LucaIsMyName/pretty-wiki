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

  stripCenteredTableText(root)
  stripBulletCharacters(root)
  removeWhitespaceSpans(root)
  flattenTableCellBreaks(root)
  cleanInfoboxPresentation(root)
  galleryInfoboxPhotos(root)
  groupArticleLead(root)
  markSectionFigures(root)
  stripInlineStyles(root)

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
    FORBID_ATTR: ["style"],
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

function stripCenteredTableText(root: HTMLElement) {
  root.querySelectorAll("table, table *").forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    if (node.getAttribute("align")?.toLowerCase() === "center") {
      node.removeAttribute("align")
    }
  })
}

function stripInlineStyles(root: HTMLElement) {
  root.removeAttribute("style")
  root.querySelectorAll("[style]").forEach((node) => {
    node.removeAttribute("style")
  })
}

function stripBulletCharacters(root: HTMLElement) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    if (text.data.includes("•")) {
      text.data = text.data.replaceAll("•", "").replace(/[ \t]{2,}/g, " ")
    }
    node = walker.nextNode()
  }
}

function removeWhitespaceSpans(root: HTMLElement) {
  const spans = [...root.querySelectorAll("span")]
  for (const span of spans) {
    if (span.querySelector("img, svg, audio, video, math, picture")) continue
    if ((span.textContent ?? "").replace(/[\s\u00a0]/g, "") !== "") continue
    const parent = span.parentNode
    if (!parent) continue
    const previous = span.previousSibling
    const next = span.nextSibling
    const betweenText =
      (previous?.nodeType === Node.TEXT_NODE || previous instanceof HTMLElement) &&
      (next?.nodeType === Node.TEXT_NODE || next instanceof HTMLElement)
    parent.replaceChild(
      span.ownerDocument.createTextNode(betweenText ? " " : ""),
      span,
    )
  }
}

function galleryInfoboxPhotos(root: HTMLElement) {
  root.querySelectorAll("table.infobox").forEach((infobox) => {
    const body = infobox.querySelector(":scope > tbody") ?? infobox
    const rows = [...body.children].filter(
      (row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement,
    )
    const photoRow = rows.find(
      (row) => isInfoboxPhotoRow(row) && row.querySelectorAll("img").length > 0,
    )
    if (!photoRow) return

    const document = infobox.ownerDocument
    const gallery = document.createElement("div")
    gallery.className = "wiki-infobox-gallery"
    const cell = photoRow.cells[0]
    if (!cell) return
    for (const image of [...cell.querySelectorAll("img")]) {
      if (image.closest(".wiki-infobox-photo")) continue
      gallery.appendChild(photoFromImage(image, cell, document))
    }
    if (gallery.childElementCount === 0) return

    const holder = document.createElement("tr")
    holder.className = "infobox-image"
    const holderCell = document.createElement("td")
    holderCell.colSpan = 2
    holderCell.appendChild(gallery)
    holder.appendChild(holderCell)
    body.insertBefore(holder, photoRow)
    photoRow.remove()
  })
}

function photoFromImage(
  image: HTMLImageElement,
  cell: HTMLElement,
  document: Document,
) {
  const photo = document.createElement("figure")
  photo.className = "wiki-infobox-photo"
  let block: HTMLElement = image.closest("a") ?? image
  while (
    block.parentElement &&
    block.parentElement !== cell &&
    block.parentElement.querySelectorAll("img").length === 1
  ) {
    block = block.parentElement
  }
  const caption = block.nextElementSibling
  photo.appendChild(block)
  if (
    caption instanceof HTMLElement &&
    (caption.classList.contains("infobox-caption") || caption.tagName === "FIGCAPTION")
  ) {
    photo.appendChild(caption)
  }
  return photo
}

function isInfoboxPhotoRow(row: Element): row is HTMLTableRowElement {
  if (!(row instanceof HTMLTableRowElement)) return false
  const cell = row.cells.length === 1 ? row.cells[0] : null
  if (!cell?.querySelector("img")) return false
  if (row.querySelector("th")) return false
  return (
    row.classList.contains("infobox-image") ||
    cell.classList.contains("infobox-image") ||
    cell.classList.contains("infobox-full-data")
  )
}

function groupArticleLead(root: HTMLElement) {
  const firstHeading = root.querySelector("h2, h3")
  if (!(firstHeading instanceof HTMLElement) || !firstHeading.parentElement) return

  const leadNodes: ChildNode[] = []
  const headingParent = firstHeading.parentElement

  if (headingParent === root) {
    let node = root.firstChild
    while (node && node !== firstHeading) {
      leadNodes.push(node)
      node = node.nextSibling
    }
  } else {
    let container: HTMLElement = headingParent
    while (container.parentElement && container.parentElement !== root) {
      container = container.parentElement
    }
    let node = root.firstChild
    while (node && node !== container) {
      leadNodes.push(node)
      node = node.nextSibling
    }
    if (container === headingParent) {
      let inner: ChildNode | null = headingParent.firstChild
      while (inner && inner !== firstHeading) {
        leadNodes.push(inner)
        inner = inner.nextSibling
      }
    }
  }

  if (leadNodes.length === 0) return

  const lead = root.ownerDocument.createElement("div")
  lead.className = "wiki-lead"
  const copy = root.ownerDocument.createElement("div")
  copy.className = "wiki-lead-copy"
  root.insertBefore(lead, leadNodes[0])
  for (const node of leadNodes) copy.appendChild(node)
  for (const box of [...copy.querySelectorAll(".infobox")]) {
    const frame = root.ownerDocument.createElement("div")
    frame.className = "wiki-infobox-frame"
    box.replaceWith(frame)
    frame.appendChild(box)
    lead.appendChild(frame)
  }
  if (copy.childNodes.length > 0) lead.insertBefore(copy, lead.firstChild)
}

function flattenTableCellBreaks(root: HTMLElement) {
  root.querySelectorAll("table:not(.infobox) br").forEach((br) => {
    if (br.closest(".infobox")) return
    br.replaceWith(document.createTextNode(" "))
  })
}

function cleanInfoboxPresentation(root: HTMLElement) {
  root.querySelectorAll(".infobox, .infobox *").forEach((node) => {
    if (!(node instanceof HTMLElement) || node instanceof HTMLImageElement) return
    node.removeAttribute("bgcolor")
    node.removeAttribute("background")
  })
}

function markSectionFigures(root: HTMLElement) {
  root.querySelectorAll("h2, h3, h4").forEach((heading) => {
    if (heading.closest(".infobox, .navbox, .vertical-navbox, table")) return
    let sibling = heading.nextElementSibling
    while (sibling) {
      if (sibling.matches("h2, h3, h4, p, ul, ol, dl, table")) break
      if (
        sibling instanceof HTMLElement &&
        sibling.matches("figure") &&
        !sibling.querySelector("audio")
      ) {
        sibling.classList.add("wiki-section-figure")
      }
      sibling = sibling.nextElementSibling
    }
  })
}
