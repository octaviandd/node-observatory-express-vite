/** @format */
import { ModelInstanceResponse } from "../../../../../types";
import { BaseCard } from "./base-card";

export default function ModelCard({ item }: { item: ModelInstanceResponse }) {
  const duration = Number(item.content.duration);
  const formattedDuration =
    duration > 999 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;

  return (
    <BaseCard
      date={item.created_at}
      metadata={formattedDuration}
      content={item.content}
      file={item.content.file}
      line={item.content.line}
      package={item.content.package}
    />
  );
}
