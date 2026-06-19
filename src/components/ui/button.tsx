import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/25 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* 主要 CTA — 單色墨黑（ElevenLabs-grade，主行動呼籲）。pill 由 className 加 rounded-full */
        mono:
          "bg-ink text-paper hover:opacity-90 focus-visible:ring-ink/25",
        /* 單色輪廓 — 髮絲線次要 CTA */
        monoOutline:
          "border-hairline-2 bg-transparent text-ink hover:bg-paper-2 focus-visible:border-ink",
        /* 次要 — 品牌深藍面填（非主 CTA） */
        default:
          "bg-[#173762] text-white hover:bg-[#0F2B50] focus-visible:border-ring",
        /* 輪廓按鈕 — 髮絲線 */
        outline:
          "border-hairline bg-surface text-foreground hover:bg-paper-2 hover:border-hairline-2 focus-visible:border-ring",
        /* 次要面填 */
        secondary:
          "bg-paper-2 text-foreground hover:bg-secondary focus-visible:border-ring",
        /* 幽靈按鈕 — 第三層級 */
        ghost:
          "text-muted-foreground hover:bg-paper-2 hover:text-foreground focus-visible:border-ring",
        /* 破壞性操作 */
        destructive:
          "bg-[#FFEBEE] text-[#B71C1C] hover:bg-red-100 border-[#FFCDD2] focus-visible:ring-red-500/20 dark:bg-[#B71C1C]/15 dark:text-[#EF9A9A]",
        /* 金色 CTA — 特例，僅單一最高優先 premium 場景（金面積 < 3%） */
        gold:
          "bg-[#F6E8B8] text-[#0A2342] font-semibold hover:bg-[#EFD889] focus-visible:ring-[#C9A227]/30 border-[#D7BE65]/50",
        /* 文字連結 */
        link: "text-primary underline-offset-4 hover:underline",
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
