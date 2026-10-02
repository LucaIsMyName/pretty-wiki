import { createBrowserRouter } from "react-router"
import { AppShell } from "@/components/layout/AppShell"
import { ArticlePage } from "@/routes/ArticlePage"
import { HomePage } from "@/routes/HomePage"
import {
  articleLoader,
  homeRedirectLoader,
  languageLoader,
  searchLoader,
} from "@/routes/loaders"
import { RouteError } from "@/routes/RouteError"
import { SearchPage } from "@/routes/SearchPage"

export const router = createBrowserRouter([
  {
    path: "/",
    loader: homeRedirectLoader,
    element: <p className="p-8 text-center text-muted-foreground">Loading…</p>,
    hydrateFallbackElement: (
      <p className="p-8 text-center text-muted-foreground">Loading…</p>
    ),
    errorElement: <RouteError />,
  },
  {
    id: "language",
    path: "/:lang",
    loader: languageLoader,
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "search",
        loader: searchLoader,
        element: <SearchPage />,
        errorElement: <RouteError />,
      },
      {
        id: "article",
        path: "wiki/:title",
        loader: articleLoader,
        element: <ArticlePage />,
        errorElement: <RouteError />,
      },
    ],
  },
])
