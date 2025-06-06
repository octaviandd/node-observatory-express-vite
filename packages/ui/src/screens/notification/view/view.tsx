/** @format */

import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NotificationCrumbs } from "./crumbs";
import {
  NotificationInstanceResponse,
  RequestInstanceResponse,
  JobInstanceResponse,
  ScheduleInstanceResponse,
} from "../../../../types";
import Source from "./source";
import Details from "./details";
import ContentTabs from "./tabs";

export default function NotificationView() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("raw");

  const [data, setData] = useState<{
    notification: NotificationInstanceResponse;
    loading: boolean;
    error: string | null;
    source:
    | RequestInstanceResponse
    | JobInstanceResponse
    | ScheduleInstanceResponse
    | null;
  }>({
    notification: {} as NotificationInstanceResponse,
    loading: true,
    error: null,
    source: null,
  });

  useEffect(() => {
    getItem();
  }, [params.id]);

  const getItem = async () => {
    try {
      setData((prev) => ({ ...prev, loading: true }));
      const response = await fetch(
        `${window.SERVER_CONFIG.base}/api/notifications/${params.id}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch notification data");
      }
      const { notification, request, job, schedule } = await response.json();

      setData((prev) => ({
        ...prev,
        notification: notification[0],
        loading: false,
        error: null,
        source: request
          ? request[0]
          : job
            ? job[0]
            : schedule
              ? schedule[0]
              : null,
      }));
    } catch (error) {
      console.error("Error fetching notification data:", error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }));
    }
  };

  if (data.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (data.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{data.error}</AlertDescription>
      </Alert>
    );
  }

  if (!data.notification) return null;

  return (
    <div className="flex flex-col gap-y-6">
      <NotificationCrumbs notification={data.notification} />

      {data.source && <Source source={data.source} />}

      <Details notification={data.notification} />
      <ContentTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        data={data}
      />
    </div>
  );
}
