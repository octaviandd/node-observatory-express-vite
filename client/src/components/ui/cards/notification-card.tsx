/** @format */
import { NotificationInstanceResponse } from "../../../../../types"
import { BaseCard } from "./base-card"

export default function NotificationCard({ item }: {item: NotificationInstanceResponse}) {
  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.method.toUpperCase()}
      content={item.content.event as string}
      file={item.content.file}
      line={item.content.line}
      linkPath={`/notification/${item.uuid}`}
    />
  )
}
