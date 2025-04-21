/** @format */
import { HttpClientInstanceResponse } from "../../../../../types";
import { BaseCard } from "./base-card"

export default function HttpCard({ item }: {item: HttpClientInstanceResponse}) {
  const duration = Number(item.content.duration)
  const formattedDuration = duration > 999 
    ? `${(duration / 1000).toFixed(2)}s` 
    : `${duration}ms`

  return (
    <BaseCard
      date={item.created_at}
      metadata={formattedDuration}
      content={{ href: item.content.href, pathname: item.content.pathname, route: item.content.route }}
      file={item.content.file}
      line={item.content.line}
      package={item.content.package}
    />
  );
}
