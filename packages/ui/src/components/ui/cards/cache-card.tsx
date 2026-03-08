/** @format */

import { CacheInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const CacheCard = ({ item }: { item: CacheInstanceResponse })  => {
  return (
    <BaseCard
      date={item.created_at}
      content={{
        key: item.content.data.key,
        value: item.content.data.key,
      }}
      file={item.content.location?.file as string}
      line={item.content.location?.line as string}
      package={item.content.metadata.package}
      linkPath={`/cache/${item.uuid}`}
    />
  );
}
