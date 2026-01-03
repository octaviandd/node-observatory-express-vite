/** @format */

import { useContext, useEffect, useState } from "react";
import { StoreContext } from "@/store";
import { timePeriod } from "@/utils";
import { useParams } from "react-router";
import { GraphResponse } from "types";

export const useGraph = ({ type }: { type: string }): { data: GraphResponse | null, currentDate: string, period: string} => {
  const { state } = useContext(StoreContext);
  const params = useParams();
  const param = params.key || "";
  const [data, setData] = useState<GraphResponse | null>(null);

  useEffect(() => {
    getItems();
  }, [state.period, param]);

  //@ts-ignore
  const period = timePeriod(state.period);

  const currentDate = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "")
    .toUpperCase();

  const getItems = async () => {
    try {
      const response = await fetch(
        `${window.SERVER_CONFIG.base}/api/${type}?period=${state.period}${
          param ? `&key=${encodeURIComponent(param)}` : ""
        }`,
      );

      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error(error);
    }
  };

  return { data, currentDate, period };
};
