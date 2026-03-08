/** @format */
import { NotificationInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const NotificationCard = ({
  item,
}: {
  item: NotificationInstanceResponse;
}) => {
  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.metadata.method.toUpperCase()}
      content={item.content.data.event as string}
      file={item.content.location?.file as string}
      line={item.content.location?.line as string}
      linkPath={`/notification/${item.uuid}`}
    />
  );
}
