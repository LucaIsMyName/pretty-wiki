import { useEffect, type MouseEvent } from "react"
import { Link, useNavigate } from "react-router"
import { LanguageMenu } from "@/components/language/LanguageMenu"
import { Button } from "@/components/ui/button"
import { useWikiLanguage } from "@/lib/use-wiki-language"
import { articlePath, searchPath, titlePath } from "@/lib/wikipedia/paths"
import type { ArticleContent } from "@/lib/wikipedia/types"
import { siteConfig } from "@/config/site"

type ArticleViewProps = {
  article: ArticleContent
}

export function ArticleView({ article }: ArticleViewProps) {
  const { language } = useWikiLanguage()
  const navigate = useNavigate()
  const { summary, headings } = article
  const sourceUrl = `https://${language.code}.wikipedia.org/wiki/${titlePath(summary.title)}`

  useEffect(() => {
    document.title = `${summary.title} · ${siteConfig.name}`
  }, [summary.title])

  function onArticleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = (event.target as HTMLElement).closest("a")
    if (!anchor) return
    const href = anchor.getAttribute("href")
    if (!href || href.startsWith("#") || anchor.target === "_blank") return
    if (href.startsWith("http")) return
    event.preventDefault()
    navigate(href)
  }

  function selectLanguage(code: string) {
    const translation = article.languages.find((item) => item.code === code)
    if (!translation || translation.code === language.code) return
    navigate(articlePath(translation.code, translation.title))
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:px-6">
      <article>
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl leading-tight tracking-tight sm:text-5xl">
              {summary.title}
            </h1>
            {summary.description ? (
              <p className="mt-3 text-lg text-muted-foreground italic">
                {summary.description}
              </p>
            ) : null}
          </div>
          <LanguageMenu
            currentCode={language.code}
            languages={article.languages}
            onSelect={selectLanguage}
            align="end"
          />
        </header>

        {!article.hasInfobox && summary.thumbnail ? (
          <img
            src={summary.thumbnail.source}
            alt=""
            width={summary.thumbnail.width}
            height={summary.thumbnail.height}
            className="mb-8 max-h-80 w-full rounded-2xl object-contain"
          />
        ) : null}

        {headings.length > 0 ? (
          <details className="mb-8 rounded-2xl border bg-card p-4 lg:hidden">
            <summary className="cursor-pointer font-medium">On this page</summary>
            <HeadingList headings={headings} />
          </details>
        ) : null}

        <div
          className="wiki-article"
          onClick={onArticleClick}
          dangerouslySetInnerHTML={{ __html: article.html }}
        />

        <footer className="mt-14 border-t pt-6 text-sm text-muted-foreground">
          Text from{" "}
          <a className="underline underline-offset-2" href={sourceUrl}>
            Wikipedia
          </a>
          , available under the{" "}
          <a
            className="underline underline-offset-2"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
          >
            Creative Commons Attribution-ShareAlike License
          </a>
          .
        </footer>
      </article>

      {headings.length > 0 ? (
        <aside className="hidden lg:block">
          <nav className="sticky top-24" aria-label="On this page">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              On this page
            </p>
            <HeadingList headings={headings} />
          </nav>
        </aside>
      ) : null}
    </div>
  )
}

function HeadingList({
  headings,
}: {
  headings: ArticleContent["headings"]
}) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm">
      {headings.map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? "ps-3" : undefined}>
          <a
            href={`#${heading.id}`}
            className="text-muted-foreground hover:text-foreground"
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ArticleStatus({
  title,
  kind,
}: {
  title: string
  kind: "not-found" | "untranslated"
}) {
  const { language } = useWikiLanguage()
  const missing = kind === "not-found"

  useEffect(() => {
    document.title = `${missing ? "Not found" : "Not available"} · ${siteConfig.name}`
  }, [missing])

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-heading text-4xl">
        {missing ? "No article" : `Not available in ${language.localName}`}
      </h1>
      <p className="mt-4 text-muted-foreground">
        {missing
          ? `No article titled “${title}” in ${language.localName}.`
          : `There is no ${language.localName} Wikipedia article for “${title}”.`}
      </p>
      <Button asChild className="mt-6">
        <Link to={searchPath(language.code, title)}>
          Search {language.localName} Wikipedia
        </Link>
      </Button>
    </div>
  )
}
