import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-[#1565C0]/20 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* 主要行動按鈕 — 品牌深藍 */
        default:
          "bg-[#173762] text-white hover:bg-[#0F2B50] hover:shadow-[0_6px_16px_rgba(10,35,66,0.14)] focus-visible:border-[#1565C0]",
        /* 次要按鈕 — 藍色輪廓 */
        outline:
          "border-[#D8E1EA] bg-white text-[#0A2342] hover:bg-[#F7FAFF] hover:border-[#B7C8D8] hover:text-[#0A2342] focus-visible:border-[#1565C0] dark:border-[rgba(144,202,249,0.3)] dark:bg-[#0F2744] dark:text-[#E8F0FE] dark:hover:bg-[#1A3A6B]/40",
        /* 次要面填 */
        secondary:
          "bg-[#EEF4FA] text-[#0A2342] hover:bg-[#E4EDF6] focus-visible:border-[#1565C0]",
        /* 幽靈按鈕 — 第三層級 */
        ghost:
          "text-[#5F7080] hover:bg-[#F3F7FB] hover:text-[#0A2342] focus-visible:border-[#1565C0] dark:text-[#90CAF9] dark:hover:bg-[#1A3A6B]/30 dark:hover:text-white",
        /* 破壞性操作 */
        destructive:
          "bg-[#FFEBEE] text-[#B71C1C] hover:bg-red-100 border-[#FFCDD2] focus-visible:ring-red-500/20",
        /* 金色 CTA 按鈕 — 謹慎使用，最重要行動呼籲 */
        gold:
          "bg-[#F6E8B8] text-[#0A2342] font-semibold hover:bg-[#EFD889] focus-visible:ring-[#C9A227]/30 border-[#D7BE65]/50",
        /* 文字連結 */
        link: "text-[#1565C0] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 text-[15px] rounded-lg",
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
