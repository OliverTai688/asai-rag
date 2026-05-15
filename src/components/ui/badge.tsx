import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        /* 品牌藍 — 主要狀態徽章 */
        default:
          "bg-[#1A3A6B] text-white border-[#1A3A6B]/10",
        /* 淺藍 — 次要資訊 */
        secondary:
          "bg-[#D6E8F8] text-[#0A2342] border-[#90CAF9]/30",
        /* 亮藍 chip — 功能標籤 */
        blue:
          "bg-[#E8F0FE] text-[#1565C0] border-[#90CAF9]/40",
        /* 金色 — 特殊強調，謹慎使用 */
        gold:
          "bg-[#FDF3D0] text-[#B8860B] border-[#C9A227]/30",
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
          "border-[#CFD8DC] text-[#546E7A]",
        ghost:
          "bg-[#F7FAFF] text-[#546E7A] hover:bg-[#EBF3FB]",
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
