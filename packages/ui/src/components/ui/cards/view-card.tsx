/** @format */
import { ViewInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const ViewCard = ({ view }: { view: ViewInstanceResponse }) => {
  const duration = Number(view.content.duration);
  const formattedDuration =
    duration > 999 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;

  return (
    <BaseCard
      date={view.created_at}
      metadata={formattedDuration}
      content={view.content.data}
      file={view.content.location?.file || "unknown"}
      line={view.content.location?.line || "unknown"}
      linkPath={`/view/${view.uuid}`}
    />
  );
}
