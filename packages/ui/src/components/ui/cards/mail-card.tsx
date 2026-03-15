/** @format */
import { MailInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const MailCard = ({ item }: { item: MailInstanceResponse }) => {
  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.metadata.package}
      content={{
        from: item.content.data.from,
        to: item.content.data.to,
      }}
      file={item.content.metadata.location?.file as string}
      line={item.content.metadata.location?.line as string}
      linkPath={`/mail/${item.uuid}`}
    />
  );
};
