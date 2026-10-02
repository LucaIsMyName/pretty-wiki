import { useLoaderData } from "react-router"
import {
  ArticleStatus,
  ArticleView,
} from "@/components/article/ArticleView"
import { articleLoader } from "@/routes/loaders"

export function ArticlePage() {
  const data = useLoaderData<typeof articleLoader>()

  if (data.kind === "article") {
    return <ArticleView article={data.article} />
  }

  return <ArticleStatus title={data.title} kind={data.kind} />
}
