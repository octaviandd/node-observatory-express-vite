/** @format */
import { ExceptionInstanceResponse } from "../../../../../types";
import { BaseCard } from "./base-card";

export default function ExceptionCard({
  item,
}: {
  item: ExceptionInstanceResponse;
}) {
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
