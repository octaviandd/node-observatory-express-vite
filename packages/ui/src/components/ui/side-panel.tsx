/** @format */

import { X } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
import {
  CacheInstanceResponse,
  ExceptionInstanceResponse,
  HttpClientInstanceResponse,
  JobInstanceResponse,
  LogInstanceResponse,
  MailInstanceResponse,
  ModelInstanceResponse,
  NotificationInstanceResponse,
  QueryInstanceResponse,
  RequestInstanceResponse,
} from "../../../types";

type Props = {
  setSidePanelData: Dispatch<
    SetStateAction<{
      isOpen: boolean;
      modelId?: string;
      requestId?: string;
      jobId?: string;
      scheduleId?: string;
    }>
  >;
  modelId?: string;
  requestId?: string;
  jobId?: string;
  scheduleId?: string;
  type: string;
};

export default function SidePanel({
  setSidePanelData,
  modelId,
  requestId,
  jobId,
  scheduleId,
  type,
}: Props) {
  const [logs, setLogs] = useState<LogInstanceResponse[]>([]);
  const [queries, setQueries] = useState<QueryInstanceResponse[]>([]);
  const [notifications, setNotifications] = useState<
    NotificationInstanceResponse[]
  >([]);
  const [jobs, setJobs] = useState<JobInstanceResponse[]>([]);
  const [http, setHttp] = useState<HttpClientInstanceResponse[]>([]);
  const [mails, setMails] = useState<MailInstanceResponse[]>([]);
  const [cache, setCache] = useState<CacheInstanceResponse[]>([]);
  const [request, setRequest] = useState<RequestInstanceResponse[]>([]);
  const [model, setModel] = useState<ModelInstanceResponse[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionInstanceResponse[]>([]);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    getRelatedData();
  }, []);

  const getRelatedData = async () => {
    setLoading(true);
    const response = await fetch(
      `/ui/${type}/${modelId}/related`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          jobId,
          scheduleId,
        }),
      },
    );
    const data = await response.json();

    const {
      job,
      mail,
      query,
      cache,
      http,
      notification,
      log,
      request,
      model,
      exception,
    } = data;


    setJobs(type === "jobs" && job ? job : job?.length > 0 ? job : []);
    setMails(type === "mails" && mail ? mail : mail?.length > 0 ? mail : []);
    setQueries(type === "queries" && query ? query : query?.length > 0 ? query : []);
    setCache(type === "caches" && cache ? cache : cache?.length > 0 ? cache : []);
    setHttp(type === "https" && http ? (http[0] ? http[0] : http) : []);
    setNotifications(
      type === "notifications" && notification ? notification : notification?.length > 0 ? notification : [],
    );
    setLogs(type === "logs" && log ? log : log?.length > 0 ? log : []);
    setRequest(type === "requests" && request ? request : request?.length > 0 ? request : []);
    setModel(type === "models" && model ? model : model?.length > 0 ? model : []);
    setExceptions(type === "exceptions" && exception ? exception : exception?.length > 0 ? exception : []);
    setLoading(false);
  };

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

  return (
    <Sheet
      open={true}
      onOpenChange={() =>
        setSidePanelData({
          isOpen: false,
          modelId: "",
          requestId: "",
          scheduleId: "",
          jobId: "",
        })
      }
    >
      <SheetContent side="right" className="w-[700px] p-0">
        <SheetHeader className="p-6 flex w-full">
          <div className="flex items-center gap-x-5 justify-between">
            <SheetTitle className=" text-muted-foreground">
              Meta-data
            </SheetTitle>
            <Button
              variant="secondary"
              size="icon"
              onClick={() =>
                setSidePanelData({
                  isOpen: false,
                  modelId: "",
                  requestId: "",
                  scheduleId: "",
                  jobId: "",
                })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <Separator className="my-4" />

        {isLoading ? (
          "Loading.."
        ) : (
          <ScrollArea className="h-[calc(100vh-5rem)]">
            {logs.length === 0 &&
              model.length === 0 &&
              exceptions.length === 0 &&
              notifications.length === 0 &&
              mails.length === 0 &&
              queries.length === 0 &&
              jobs.length === 0 &&
              http.length === 0 &&
              request.length === 0 &&
              cache.length === 0 && (
                <div className="p-6 text-muted-foreground">
                  No related data found
                </div>
              )}
            {renderSection("REQUESTS", request, RequestCard)}
            {renderSection("LOGS", logs, LogCard)}
            {renderSection("NOTIFICATIONS", notifications, NotificationCard)}
            {renderSection("MAILS", mails, MailCard)}
            {renderSection("QUERIES", queries, QueryCard)}
            {renderSection("JOBS", jobs, JobCard)}
            {renderSection("HTTP REQUESTS", http, HttpCard)}
            {renderSection("CACHE ENTRIES", cache, CacheCard)}
            {renderSection("MODELS", model, ModelCard)}
            {renderSection("EXCEPTIONS", exceptions, ExceptionCard)}
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
