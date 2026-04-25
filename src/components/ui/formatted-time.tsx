"use client";

import { useMounted } from "@/lib/hooks/use-mounted";

interface FormattedTimeProps {
  isoString: string;
  format?: "time" | "date" | "datetime";
}

export function FormattedTime({ isoString, format = "time" }: FormattedTimeProps) {
  const mounted = useMounted();

  if (!mounted) {
    return <span className="opacity-0">--:--</span>;
  }

  const date = new Date(isoString);
  let formatted: string;

  switch (format) {
    case "date":
      formatted = date.toLocaleDateString();
      break;
    case "datetime":
      formatted = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      break;
    default:
      formatted = date.toLocaleTimeString();
  }

  return <span>{formatted}</span>;
}
