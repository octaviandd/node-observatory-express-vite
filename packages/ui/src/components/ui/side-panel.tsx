/** @format */

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import QueryCard from "@/components/ui/cards/query-card";
import JobCard from "@/components/ui/cards/job-card";
import LogCard from "@/components/ui/cards/log-card";
import HttpCard from "@/components/ui/cards/http-card";
import CacheCard from "@/components/ui/cards/cache-card";
import NotificationCard from "@/components/ui/cards/notification-card";
import MailCard from "@/components/ui/cards/mail-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import RequestCard from "@/components/ui/cards/request-card";
import ModelCard from "@/components/ui/cards/model-card";
import ExceptionCard from "@/components/ui/cards/exception-card";
import { components } from "@/types/api";
import { useApiMutation } from "@/hooks/useApi";
import type { ResourceKey } from "@/hooks/useApiTyped";
import { DrawerState } from "@/hooks/useIndexTableData";

type ViewDataResponse = components["schemas"]["ViewDataResponse"];

type RelatedRequestBody = {
  requestId?: string;
  jobId?: string;
  scheduleId?: string;
};

type Props = {
  drawer: DrawerState;
  setDrawer: (data: DrawerState) => void;
  type: ResourceKey;
};

export default function Drawer({ drawer, setDrawer, type }: Props) {
  const { isOpen, modelId, requestId, jobId, scheduleId } = drawer;

  const closeDrawer = () =>
    setDrawer({
      isOpen: false,
      modelId: "",
      requestId: "",
      jobId: "",
      scheduleId: "",
    });

  const { mutateAsync: fetchRelated } = useApiMutation<ViewDataResponse, RelatedRequestBody>(
    `/api/${type}/${modelId}/related`,
    "POST",
  );

  const [relatedData, setRelatedData] = useState<ViewDataResponse>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !modelId) return;

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchRelated({ requestId, jobId, scheduleId });
        if (!cancelled) setRelatedData(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isOpen, modelId]);

  // Derived arrays directly from the typed response — no intermediate state needed
  const logs = relatedData.log ?? [];
  const queries = relatedData.query ?? [];
  const notifications = relatedData.notification ?? [];
  const jobs = relatedData.job ?? [];
  const http = relatedData.http ?? [];
  const mails = relatedData.mail ?? [];
  const cache = relatedData.cache ?? [];
  const requests = relatedData.request ?? [];
  const models = relatedData.model ?? [];
  const exceptions = relatedData.exception ?? [];

  const renderSection = <T extends object>(
    title: string,
    items: T[],
    CardComponent: React.ComponentType<{ item: T }>,
  ) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className="flex items-center gap-2 px-6 mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        </div>
        <div className="flex flex-col gap-4 px-6">
          {items.map((item, index) => (
            <CardComponent key={index} item={item} />
          ))}
        </div>
        <Separator className="my-4" />
      </>
    );
  };

  const hasNoData =
    logs.length === 0 &&
    models.length === 0 &&
    exceptions.length === 0 &&
    notifications.length === 0 &&
    mails.length === 0 &&
    queries.length === 0 &&
    jobs.length === 0 &&
    http.length === 0 &&
    requests.length === 0 &&
    cache.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={closeDrawer}>
      <SheetContent side="right" className="w-[700px] p-0">
        <SheetHeader className="p-6 flex w-full">
          <div className="flex items-center gap-x-5 justify-between">
            <SheetTitle className="text-muted-foreground">Meta-data</SheetTitle>
            <Button variant="secondary" size="icon" onClick={closeDrawer}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <Separator className="my-4" />

        {isLoading ? (
          "Loading.."
        ) : (
          <ScrollArea className="h-[calc(100vh-5rem)]">
            {hasNoData && (
              <div className="p-6 text-muted-foreground">No related data found</div>
            )}
            {renderSection("REQUESTS", requests, RequestCard)}
            {renderSection("LOGS", logs, LogCard)}
            {renderSection("NOTIFICATIONS", notifications, NotificationCard)}
            {renderSection("MAILS", mails, MailCard)}
            {renderSection("QUERIES", queries, QueryCard)}
            {renderSection("JOBS", jobs, JobCard)}
            {renderSection("HTTP REQUESTS", http, HttpCard)}
            {renderSection("CACHE ENTRIES", cache, CacheCard)}
            {renderSection("MODELS", models, ModelCard)}
            {renderSection("EXCEPTIONS", exceptions, ExceptionCard)}
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}