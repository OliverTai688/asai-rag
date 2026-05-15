import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-[#CFD8DC] bg-white px-3 py-1 text-sm text-[#0A1929] transition-colors outline-none",
        "placeholder:text-[#546E7A]",
        "focus-visible:border-[#1565C0] focus-visible:ring-3 focus-visible:ring-[#1565C0]/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#EBF3FB] disabled:opacity-50",
        "aria-invalid:border-[#B71C1C] aria-invalid:ring-3 aria-invalid:ring-[#B71C1C]/20",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#0A1929]",
        "dark:bg-[#0F2744] dark:border-[rgba(144,202,249,0.2)] dark:text-[#E8F0FE] dark:placeholder:text-[#546E7A]",
        "dark:focus-visible:border-[#2196F3] dark:focus-visible:ring-[#2196F3]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
