/** @format */

import { JobInstanceResponse } from "../../../../../types";
import { BaseCard } from "./base-card";

export default function JobCard({ item }: { item: JobInstanceResponse }) {
  const content = {
    id: item.job_id,
    queue: item.content.queue,
    status: item.content.status,
    method: item.content.method,
  };

  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.duration || undefined}
      content={content}
      file={item.content.file}
      line={item.content.line}
      package={item.content.package ?? "bull"}
      linkPath={`/job/${item.uuid}`}
    />
  );
}
