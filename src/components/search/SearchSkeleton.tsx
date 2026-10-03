import { Skeleton } from "@/components/ui/skeleton"

export function SearchSkeleton() {
  return (
    <div className="mx-auto w-full max-w-full space-y-6 px-4 py-8 lg:px-6">
      <Skeleton className="h-9 w-56" />
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="size-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
