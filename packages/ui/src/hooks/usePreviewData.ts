/** @format */

import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  CacheInstanceResponse,
  HttpClientInstanceResponse,
  JobInstanceResponse,
  LogInstanceResponse,
  MailInstanceResponse,
  NotificationInstanceResponse,
  QueryInstanceResponse,
  RequestInstanceResponse,
} from "../../types";

type DataState = {
  request: RequestInstanceResponse | null;
  notifications: NotificationInstanceResponse[];
  mails: MailInstanceResponse[];
  logs: LogInstanceResponse[];
  queries: QueryInstanceResponse[];
  https: HttpClientInstanceResponse[];
  jobs: JobInstanceResponse[];
  caches: CacheInstanceResponse[];
};

export const usePreviewData = () => {
  const params = useParams();
  const [data, setData] = useState<DataState>({
    request: null,
    notifications: [],
    mails: [],
    logs: [],
    queries: [],
    https: [],
    jobs: [],
    caches: [],
  });

  useEffect(() => {
    getItem();
  }, []);

  const getItem = async () => {
    const response = await fetch(`/observatory-api/data/requests/${params.id}`);
    const result = await response.json();

    const { request, query, http, job, cache, notification, mail, logs } =
      result;

    setData({
      request: request ? request[0] : [],
      queries: query || [],
      https: http || [],
      jobs: job || [],
      caches: cache || [],
      notifications: notification || [],
      mails: mail || [],
      logs: logs || [],
    });
  };

  return data;
};
