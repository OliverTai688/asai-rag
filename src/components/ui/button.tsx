import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-180 outline-none select-none focus-visible:ring-3 focus-visible:ring-[#1565C0]/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* 主要行動按鈕 — 品牌深藍 */
        default:
          "bg-[#1A3A6B] text-white hover:bg-[#1565C0] hover:-translate-y-px hover:shadow-md focus-visible:border-[#1565C0]",
        /* 次要按鈕 — 藍色輪廓 */
        outline:
          "border-[#CFD8DC] bg-white text-[#0A2342] hover:bg-[#EBF3FB] hover:border-[#1565C0] hover:text-[#1565C0] focus-visible:border-[#1565C0] dark:border-[rgba(144,202,249,0.3)] dark:bg-[#0F2744] dark:text-[#E8F0FE] dark:hover:bg-[#1A3A6B]/40",
        /* 次要面填 */
        secondary:
          "bg-[#D6E8F8] text-[#0A2342] hover:bg-[#90CAF9]/40 focus-visible:border-[#1565C0]",
        /* 幽靈按鈕 — 第三層級 */
        ghost:
          "text-[#546E7A] hover:bg-[#EBF3FB] hover:text-[#0A2342] focus-visible:border-[#1565C0] dark:text-[#90CAF9] dark:hover:bg-[#1A3A6B]/30 dark:hover:text-white",
        /* 破壞性操作 */
        destructive:
          "bg-[#FFEBEE] text-[#B71C1C] hover:bg-red-100 border-[#FFCDD2] focus-visible:ring-red-500/20",
        /* 金色 CTA 按鈕 — 謹慎使用，最重要行動呼籲 */
        gold:
          "relative overflow-hidden bg-gradient-to-r from-[#B8860B] to-[#D4A017] text-[#0A2342] font-semibold hover:from-[#D4A017] hover:to-[#B8860B] hover:-translate-y-px hover:shadow-lg hover:shadow-[#C9A227]/30 focus-visible:ring-[#C9A227]/40 border-[#B8860B]/20",
        /* 文字連結 */
        link: "text-[#1565C0] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 text-[15px] rounded-xl",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
