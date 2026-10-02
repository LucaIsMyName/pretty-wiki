import { useEffect, useId, useState, type KeyboardEvent } from "react"
import { useMatch, useNavigate, useSearchParams } from "react-router"
import { siteConfig } from "@/config/site"
import { LanguageMenu } from "@/components/language/LanguageMenu"
import { Input } from "@/components/ui/input"
import { useWikiLanguage } from "@/lib/use-wiki-language"
import { isAbortError } from "@/lib/wikipedia/client"
import { articlePath, searchPath } from "@/lib/wikipedia/paths"
import { suggestTitles } from "@/lib/wikipedia/search"
import type { ArticleLanguage, TitleSuggestion } from "@/lib/wikipedia/types"
import { cn } from "cn"

type SearchFormProps = {
  variant: "hero" | "header"
  articleLanguages?: ArticleLanguage[]
  articleTitle?: string
}

export function SearchForm(props: SearchFormProps) {
  const { language } = useWikiLanguage()
  const [params] = useSearchParams()
  const onSearchPage = useMatch("/:lang/search")
  const routeQuery = onSearchPage ? (params.get("q") ?? "") : ""

  return (
    <SearchFormFields
      key={`${language.code}:${routeQuery}`}
      {...props}
      routeQuery={routeQuery}
    />
  )
}

function SearchFormFields({
  variant,
  articleLanguages,
  articleTitle,
  routeQuery,
}: SearchFormProps & { routeQuery: string }) {
  const { language, languages } = useWikiLanguage()
  const navigate = useNavigate()
  const onSearchPage = useMatch("/:lang/search")
  const [query, setQuery] = useState(routeQuery)
  const [touched, setTouched] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(-1)
  const [suggestionState, setSuggestionState] = useState<{
    forQuery: string
    items: TitleSuggestion[]
    loading: boolean
  }>({ forQuery: "", items: [], loading: false })
  const listId = useId()
  const hero = variant === "hero"
  const trimmed = query.trim()

  useEffect(() => {
    if (!touched || !trimmed) return

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSuggestionState({ forQuery: trimmed, items: [], loading: true })
      suggestTitles(language.code, trimmed, controller.signal)
        .then((results) => {
          setSuggestionState({ forQuery: trimmed, items: results, loading: false })
          setActive(-1)
        })
        .catch((error: unknown) => {
          if (isAbortError(error)) return
          setSuggestionState({ forQuery: trimmed, items: [], loading: false })
        })
    }, siteConfig.suggestionDelayMs)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed, touched, language.code])

  const suggestionsReady = suggestionState.forQuery === trimmed
  const suggestions = suggestionsReady ? suggestionState.items : []
  const loading = !suggestionsReady || suggestionState.loading

  function openArticle(title: string) {
    setDismissed(true)
    navigate(articlePath(language.code, title))
  }

  function submitSearch() {
    setDismissed(true)
    navigate(searchPath(language.code, query))
  }

  function selectLanguage(code: string) {
    if (code === language.code) return
    if (articleLanguages && articleTitle) {
      const translation = articleLanguages.find((item) => item.code === code)
      if (translation) {
        navigate(articlePath(code, translation.title))
        return
      }
      navigate(`${articlePath(code, articleTitle)}?untranslated=1`)
      return
    }
    if (onSearchPage) {
      navigate(searchPath(code, query))
      return
    }
    navigate(`/${code}`)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDismissed(true)
      setActive(-1)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const selected =
        showSuggestions && active >= 0 ? suggestions[active] : undefined
      if (selected) openArticle(selected.title)
      else submitSearch()
      return
    }

    if (!showSuggestions || suggestions.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((current) => (current + 1) % suggestions.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      )
    }
  }

  const showSuggestions = touched && trimmed.length > 0 && !dismissed

  return (
    <form
      className="relative w-full"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const selected = active >= 0 ? suggestions[active] : undefined
        if (showSuggestions && selected) {
          openArticle(selected.title)
          return
        }
        submitSearch()
      }}
    >
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Search articles
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border bg-card shadow-sm",
          hero ? "p-2 ps-5" : "p-1 ps-3",
        )}
      >
        <Input
          id={`${listId}-input`}
          value={query}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={listId}
          aria-activedescendant={
            active >= 0 ? `${listId}-option-${active}` : undefined
          }
          placeholder="Search articles"
          autoComplete="off"
          className={cn(
            "border-0 bg-transparent shadow-none focus-visible:ring-0",
            hero ? "h-12 text-lg md:text-lg" : "h-9",
          )}
          onChange={(event) => {
            setTouched(true)
            setDismissed(false)
            setQuery(event.target.value)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (touched && trimmed) setDismissed(false)
          }}
        />
        <LanguageMenu
          currentCode={language.code}
          languages={languages}
          onSelect={selectLanguage}
          className={hero ? "h-11 px-3" : undefined}
        />
      </div>
      {showSuggestions ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">
              {loading ? "Looking for titles…" : "No matching titles"}
            </li>
          ) : (
            suggestions.map((suggestion, index) => (
              <li key={suggestion.title} role="presentation">
                <button
                  id={`${listId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={cn(
                    "flex w-full flex-col rounded-xl px-3 py-2 text-start",
                    index === active ? "bg-muted" : "hover:bg-muted/70",
                  )}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => openArticle(suggestion.title)}
                >
                  <span className="font-medium">{suggestion.title}</span>
                  {suggestion.description ? (
                    <span className="truncate text-sm text-muted-foreground">
                      {suggestion.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </form>
  )
}
