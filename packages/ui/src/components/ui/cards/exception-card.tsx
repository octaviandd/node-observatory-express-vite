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
      content={item.content.data.message}
      file={item.content.data.file}
      line={item.content.data.line}
      package="Exception"
      linkPath={`/exception/${item.uuid}`}
    />
  );
};
