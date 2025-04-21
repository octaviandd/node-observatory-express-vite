/** @format */
import { MailInstanceResponse } from "../../../../../types";
import { BaseCard } from "./base-card";

export default function MailCard({ item }: { item: MailInstanceResponse }) {
  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.package}
      content={{
        from: item.content.from,
        to: item.content.to,
      }}
      file={item.content.file}
      line={item.content.line}
      linkPath={`/mail/${item.uuid}`}
    />
  );
}
