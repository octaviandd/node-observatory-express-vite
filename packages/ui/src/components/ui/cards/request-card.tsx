/** @format */
import { RequestInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const RequestCard = ({ item }: { item: RequestInstanceResponse }) => {
  const duration = Number(item.content.metadata.duration);
  const formattedDuration =
    duration > 999 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;

  const content = {
    method: item.content.data.method,
    route: item.content.data.route,
    statusCode: item.content.data.statusCode,
    duration: formattedDuration,
  };

  return (
    <BaseCard
      date={item.created_at}
      metadata={formattedDuration}
      content={content}
      linkPath={`/request/${item.uuid}`}
      language="json"
      file={item.content.metadata.location?.file || "unknown"}
      line={item.content.metadata.location?.line || "unknown"}
      package={item.content.metadata.package || "unknown"}
    />
  );
};
