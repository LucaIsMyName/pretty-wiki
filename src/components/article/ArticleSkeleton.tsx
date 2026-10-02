import { Skeleton } from "@/components/ui/skeleton"

export function ArticleSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 lg:px-6">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}
