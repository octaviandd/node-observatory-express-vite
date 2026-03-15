/** @format */

import { JobInstanceResponse } from "@/hooks/useApiTyped";
import { BaseCard } from "./base-card";

export const JobCard = ({ item }: { item: JobInstanceResponse }) => {
  const content = {
    id: item.job_id,
    queue: item.content.data.queue,
    status: item.content.data.status,
    method: item.content.data.method,
  };

  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.metadata.duration || undefined}
      content={content}
      file={item.content.metadata.location?.file as string}
      line={item.content.metadata.location?.line as string}
      package={item.content.metadata.package ?? "bull"}
      linkPath={`/job/${item.uuid}`}
    />
  );
};
