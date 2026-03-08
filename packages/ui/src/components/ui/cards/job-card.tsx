/** @format */

import { JobInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const JobCard = ({ item }: { item: JobInstanceResponse }) => {
  const content = {
    id: item.job_id,
    queue: item.content.data.queue,
    status: item.content.status,
    method: item.content.metadata.method,
  };

  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.duration || undefined}
      content={content}
      file={item.content.location?.file as string}
      line={item.content.location?.line as string}
      package={item.content.metadata.package ?? "bull"}
      linkPath={`/job/${item.uuid}`}
    />
  );
}
