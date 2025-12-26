/** @format */

import { useContext, useEffect, useState } from "react";
import { StoreContext } from "@/store";
import { timePeriod } from "@/utils";
import { useParams } from "react-router";
import { IndexResponse } from "types";

export const useIndexData = ({ type }: { type: string }): { data: IndexResponse | null, currentDate: string, period: string} => {
  const { state } = useContext(StoreContext);
  const params = useParams();
  const param = params.key || "";
  const [data, setData] = useState<IndexResponse | null>(null);

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

  const getItems = async (addedNewItems = false) => {
    try {
      const response = await fetch(
        `${window.SERVER_CONFIG.base}/api/${type}?period=${state.period}${
          param ? `&key=${encodeURIComponent(param)}` : ""
        }`,
      );

      const { table, graph } = await response.json();

      setData((prevData) => ({
        graph,
        table: {
          results: addedNewItems && prevData ? [...prevData.table.results, ...table.results] : table.results,
          ...table
        }
      }))
    } catch (error) {
      console.error(error);
    }
  };

  return { data, currentDate, period };
};
