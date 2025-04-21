/** @format */
import { RequestInstanceResponse } from "../../../../../types";
import { BaseCard } from "./base-card";

export default function RequestCard({
  item,
}: {
  item: RequestInstanceResponse;
}) {
  const duration = Number(item.content.duration);
  const formattedDuration =
    duration > 999 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;

  const content = {
    method: item.content.method,
    route: item.content.route,
    statusCode: item.content.statusCode,
    duration: formattedDuration,
  };

  return (
    <BaseCard
      date={item.created_at}
      metadata={formattedDuration}
      content={content}
      linkPath={`/request/${item.uuid}`}
      language="json"
      file={item.content.file || "unknown"}
      line={item.content.line || "unknown"}
      package={item.content.package || "unknown"}
    />
  );
}
