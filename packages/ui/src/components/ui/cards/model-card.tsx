/** @format */
import { ModelInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const ModelCard = ({ item }: { item: ModelInstanceResponse }) => {
  const duration = Number(item.content.duration);
  const formattedDuration =
    duration > 999 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;

  return (
    <BaseCard
      date={item.created_at}
      metadata={formattedDuration}
      content={item.content}
      file={item.content.location?.file as string}
      line={item.content.location?.line as string}
      package={item.content.metadata.package}
    />
  );
}
