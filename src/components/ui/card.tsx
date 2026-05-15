import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-white text-sm text-[#0A1929]",
        "border border-[#CFD8DC] shadow-sm hover:shadow-md transition-shadow duration-280",
        "dark:bg-[#0F2744] dark:border-[rgba(144,202,249,0.15)] dark:text-[#E8F0FE]",
        "py-4 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
        "data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0",
        "*:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-5",
        "group-data-[size=sm]/card:px-4",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "has-data-[slot=card-description]:grid-rows-[auto_auto]",
        "[.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-semibold text-[15px] leading-snug text-[#0A2342] dark:text-[#E8F0FE]",
        "group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-[#546E7A] dark:text-[#90CAF9]", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 group-data-[size=sm]/card:px-4", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t border-[#EBF3FB] bg-[#F7FAFF]/60 p-5",
        "dark:border-[rgba(144,202,249,0.1)] dark:bg-[#1A3A6B]/20",
        "group-data-[size=sm]/card:p-4",
        className
      )}
      {...props}
    />
  )
}

/* Gold accent stripe card — for CTA or highlighted sections */
function CardGold({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "relative flex flex-col gap-4 overflow-hidden rounded-xl bg-white text-sm",
        "border border-[#C9A227]/30 shadow-sm",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-[#B8860B] before:to-[#D4A017]",
        "dark:bg-[#0F2744] dark:border-[#C9A227]/20",
        "py-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardGold,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
