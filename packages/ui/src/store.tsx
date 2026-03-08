/** @format */

import React, { createContext, useReducer, ReactNode, Dispatch, useMemo } from "react";

// Define the shape of your custom date range
export type CustomDateRange = {
  startDate: string;
  endDate: string;
  label: "custom";
};

export type DrawerState = {
  isOpen: boolean;
  modelId: string;
  requestId: string;
  jobId: string;
  scheduleId: string;
};

export type TimePeriod = "1h" | "24h" | "7d" | "14d" | "30d";
export type PeriodState = TimePeriod | CustomDateRange;

// Define the shape of your state
interface State {
  period: PeriodState;
  drawer: DrawerState;
}

type Action =
  | {
      type: "setPeriod";
      payload: PeriodState;
    }
  | {
      type: "setDrawer";
      payload: DrawerState;
    }
  | {
      type: "openDrawer";
      payload: Partial<Omit<DrawerState, "isOpen">>;
    }
  | {
      type: "closeDrawer";
    };

// Helper to try parsing a custom date range from localStorage
const getInitialPeriod = (): PeriodState => {
  const storedPeriod = window.localStorage.getItem("period");
  if (storedPeriod) {
    try {
      const parsed = JSON.parse(storedPeriod);
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.label === "custom" &&
        parsed.startDate &&
        parsed.endDate
      ) {
        return parsed as CustomDateRange;
      }
      if (["1h", "24h", "7d", "14d", "30d"].includes(parsed)) {
        return parsed as TimePeriod;
      }
    } catch (e) {
      if (["1h", "24h", "7d", "14d", "30d"].includes(storedPeriod)) {
        return storedPeriod as TimePeriod;
      }
    }
  }
  return "1h";
};

const initialState: State = {
  period: getInitialPeriod(),
  drawer: {
    isOpen: false,
    modelId: "",
    requestId: "",
    jobId: "",
    scheduleId: "",
  },
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "setPeriod":
      window.localStorage.setItem(
        "period",
        typeof action.payload === "string"
          ? action.payload
          : JSON.stringify(action.payload)
      );
      return { ...state, period: action.payload };

    case "setDrawer":
      return { ...state, drawer: action.payload };

    case "openDrawer":
      return {
        ...state,
        drawer: {
          isOpen: true,
          modelId: action.payload.modelId || "",
          requestId: action.payload.requestId || "",
          jobId: action.payload.jobId || "",
          scheduleId: action.payload.scheduleId || "",
        },
      };

    case "closeDrawer":
      return {
        ...state,
        drawer: {
          isOpen: false,
          modelId: "",
          requestId: "",
          jobId: "",
          scheduleId: "",
        },
      };

    default:
      return state;
  }
};

const StoreContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => undefined,
});

const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export { StoreContext, StoreProvider };
export type {
  State as StoreState,
  Action as StoreAction,
  PeriodState as StorePeriodState,
};