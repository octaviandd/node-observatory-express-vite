/** @format */
import { ExceptionInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const ExceptionCard = ({
  item,
}: {
  item: ExceptionInstanceResponse;
}) => {
  return (
    <BaseCard
      date={item.created_at}
      content={item.content.message}
      file={item.content.file}
      line={item.content.line}
      package={item.content.type}
      linkPath={`/exception/${item.uuid}`}
    />
  );
}
