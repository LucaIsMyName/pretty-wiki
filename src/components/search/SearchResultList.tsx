import { Link } from "react-router"
import { articlePath, largerThumbnail } from "@/lib/wikipedia/paths"
import { sanitizeExcerpt } from "@/lib/wikipedia/html"
import type { SearchResult } from "@/lib/wikipedia/types"

type SearchResultListProps = {
  lang: string
  results: SearchResult[]
}

export function SearchResultList({ lang, results }: SearchResultListProps) {
  return (
    <ul className="mt-6 divide-y divide-border">
      {results.map((result) => (
        <li key={result.id}>
          <Link
            to={articlePath(lang, result.title)}
            className="flex gap-4 py-5"
          >
            {result.thumbnail ? (
              <img
                src={largerThumbnail(result.thumbnail.url)}
                alt=""
                width={result.thumbnail.width}
                height={result.thumbnail.height}
                className="size-16 shrink-0 rounded-lg bg-muted object-cover"
              />
            ) : (
              <div className="size-16 shrink-0 rounded-lg bg-muted" />
            )}
            <span className="min-w-0">
              <span className="block font-heading text-2xl leading-tight">
                {result.title}
              </span>
              {result.description ? (
                <span className="mt-1 block text-sm text-primary">
                  {result.description}
                </span>
              ) : null}
              {result.excerpt ? (
                <span
                  className="mt-1 block text-muted-foreground [&_.searchmatch]:font-semibold [&_.searchmatch]:text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeExcerpt(result.excerpt),
                  }}
                />
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
