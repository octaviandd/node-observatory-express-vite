/** @format */
import { QueryInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const QueryCard = ({ item }: { item: QueryInstanceResponse }) =>  {
  return (
    <BaseCard
      date={item.created_at}
      metadata={`${Number(item.content.duration).toFixed(2)}ms`}
      content={item.content.data.sql as string}
      file={item.content.location?.file as string}
      line={item.content.location?.line as string}
      linkPath={`/query/${item.uuid}`}
      language="sql"
      package={item.content.metadata.package}
    />
  );
}
