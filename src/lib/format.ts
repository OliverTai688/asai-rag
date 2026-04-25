import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

/**
 * 格式化日期為 zh-TW 風格 (例如: 2024/05/20 14:30)
 */
export function formatDate(date: Date | string | number, formatStr: string = "yyyy/MM/dd HH:mm") {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "無效日期";
  return format(d, formatStr, { locale: zhTW });
}

/**
 * 格式化貨幣 (例如: TWD 1,000,000 -> $1,000,000)
 */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 格式化百分比 (例如: 0.85 -> 85%)
 */
export function formatPercent(value: number) {
  return new Intl.NumberFormat("zh-TW", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * 簡短日期格式 (月/日)
 */
export function formatShortDate(date: Date | string | number) {
  return formatDate(date, "MM/dd");
}
