import { useEffect } from "react"
import { Link, Outlet, useMatch, useMatches, useNavigation } from "react-router"
import { ArticleSkeleton } from "@/components/article/ArticleSkeleton"
import { SearchForm } from "@/components/search/SearchForm"
import { SearchSkeleton } from "@/components/search/SearchSkeleton"
import { siteConfig } from "@/config/site"
import { useWikiLanguage } from "@/lib/use-wiki-language"
import type { ArticleLoaderData } from "@/routes/loaders"

export function AppShell() {
  const { language } = useWikiLanguage()
  const isHome = useMatch({ path: "/:lang", end: true })
  const navigation = useNavigation()
  const articleMatch = useMatches().find((match) => match.id === "article")
  const articleData = articleMatch?.data as ArticleLoaderData | undefined

  useEffect(() => {
    document.documentElement.lang = language.code
    document.documentElement.dir = language.dir
    if (isHome) document.title = siteConfig.name
  }, [language, isHome])

  if (isHome) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <Outlet />
        </div>
      </div>
    )
  }

  const nextPath = navigation.location?.pathname ?? ""
  const isLoading = navigation.state === "loading"
  const articleLanguages =
    articleData?.kind === "article" ? articleData.article.languages : undefined
  const articleTitle =
    articleData?.kind === "article"
      ? articleData.article.summary.title
      : undefined

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 lg:px-6">
          <Link
            to={`/${language.code}`}
            className="font-heading shrink-0 text-xl tracking-tight"
          >
            {siteConfig.name}
          </Link>
          <div className="min-w-0 flex-1">
            <SearchForm
              variant="header"
              articleLanguages={articleLanguages}
              articleTitle={articleTitle}
            />
          </div>
        </div>
      </header>
      <main>
        {isLoading && nextPath.includes("/wiki/") ? (
          <ArticleSkeleton />
        ) : isLoading && nextPath.includes("/search") ? (
          <SearchSkeleton />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
