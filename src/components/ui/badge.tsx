import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        /* 品牌藍 — 主要狀態徽章 */
        default:
          "bg-[#173762] text-white border-[#173762]/10",
        /* 淺藍 — 次要資訊 */
        secondary:
          "bg-[#EEF4FA] text-[#0A2342] border-[#D8E1EA]",
        /* 亮藍 chip — 功能標籤 */
        blue:
          "bg-[#F3F7FB] text-[#1565C0] border-[#D8E1EA]",
        /* 金色 — 特殊強調，謹慎使用 */
        gold:
          "bg-[#FBF4DA] text-[#8B6B10] border-[#E4D19B]",
        /* 成功 */
        success:
          "bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7]/40",
        /* 警告 */
        warning:
          "bg-[#FFF3E0] text-[#E65100] border-[#FFCC80]/40",
        /* 錯誤 */
        destructive:
          "bg-[#FFEBEE] text-[#B71C1C] border-[#FFCDD2]/40",
        /* 輪廓 */
        outline:
          "border-[#D8E1EA] text-[#5F7080]",
        ghost:
          "bg-[#F7FAFF] text-[#5F7080] hover:bg-[#EEF4FA]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
