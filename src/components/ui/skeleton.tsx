import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md", className)}
      style={{ animation: "skeleton-pulse 1600ms cubic-bezier(0.4,0,0.2,1) infinite" }}
      {...props}
    />
  )
}

export { Skeleton }
