/** @format */
import { HttpClientInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const HttpCard = ({ item }: { item: HttpClientInstanceResponse }) => {
  const duration = Number(item.content.metadata.duration);
  const formattedDuration =
    duration > 999 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;

  return (
    <BaseCard
      date={item.created_at}
      metadata={formattedDuration}
      content={{
        href: item.content.data.path,
        pathname: item.content.data.pathname,
        route: item.content.data.origin,
      }}
      file={item.content.metadata.location?.file as string}
      line={item.content.metadata.location?.line as string}
      package={item.content.metadata.package}
    />
  );
};
