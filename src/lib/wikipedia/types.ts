export type WikiLanguage = {
  code: string
  name: string
  localName: string
  dir: "ltr" | "rtl"
}

export type SearchResult = {
  id: number
  title: string
  excerpt: string
  description: string | null
  thumbnail: {
    url: string
    width: number
    height: number
  } | null
}

export type TitleSuggestion = {
  title: string
  description: string | null
}

export type ArticleSummary = {
  title: string
  description: string | null
  extract: string
  thumbnail: {
    source: string
    width: number
    height: number
  } | null
}

export type ArticleLanguage = {
  code: string
  name: string
  localName: string
  title: string
}

export type ArticleHeading = {
  id: string
  text: string
  level: 2 | 3
}

export type ArticleContent = {
  summary: ArticleSummary
  html: string
  headings: ArticleHeading[]
  languages: ArticleLanguage[]
  hasInfobox: boolean
}
