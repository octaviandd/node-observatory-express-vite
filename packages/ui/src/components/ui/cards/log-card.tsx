/** @format */
import { LogInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const LogCard = ({ item }: { item: LogInstanceResponse }) => {
  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.metadata.level.toUpperCase()}
      content={item.content.data.message as string}
      file={item.content.metadata.location?.file as string}
      line={item.content.metadata.location?.line as string}
      linkPath={`/log/${item.uuid}`}
      package={item.content.metadata.package}
    />
  );
};
