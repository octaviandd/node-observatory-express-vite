/** @format */

import React, { createContext, useReducer, ReactNode, Dispatch } from "react";

// Define the shape of your custom date range
export type CustomDateRange = {
  startDate: string; // Storing as ISO string in state and localStorage for simplicity
  endDate: string;
  label: "custom"; // To identify it as a custom range
};

export type TimePeriod = "1h" | "24h" | "7d" | "14d" | "30d";
export type PeriodState = TimePeriod | CustomDateRange;

// Define the shape of your state
interface State {
  period: PeriodState;
}

// Define the shape of your actions
type Action = {
  type: "setPeriod";
  payload: PeriodState;
};

// Helper to try parsing a custom date range from localStorage
const getInitialPeriod = (): PeriodState => {
  const storedPeriod = window.localStorage.getItem("period");
  if (storedPeriod) {
    try {
      const parsed = JSON.parse(storedPeriod);
      // Check if it looks like our CustomDateRange object
      if (parsed && typeof parsed === 'object' && parsed.label === 'custom' && parsed.startDate && parsed.endDate) {
        // Further validation could be added here (e.g., are they valid date strings?)
        return parsed as CustomDateRange;
      }
      // If not a valid custom range, check if it's one of the preset TimePeriod strings
      if (["1h", "24h", "7d", "14d", "30d"].includes(parsed)) {
        return parsed as TimePeriod;
      }
    } catch (e) {
      // If JSON.parse fails, it might be a simple string preset
      if (["1h", "24h", "7d", "14d", "30d"].includes(storedPeriod)) {
        return storedPeriod as TimePeriod;
      }
    }
  }
  return '1h'; // Default value
};

// Create the initial state
const initialState: State = {
  period: getInitialPeriod(),
};

// Create a reducer function
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "setPeriod":
      // When setting period, also update localStorage
      window.localStorage.setItem("period", typeof action.payload === 'string' ? action.payload : JSON.stringify(action.payload));
      return { ...state, period: action.payload };
    default:
      return state;
  }
};

// Create the context
const StoreContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => undefined,
});

// Create a provider component
const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export { StoreContext, StoreProvider };
export type { State as StoreState, Action as StoreAction, PeriodState as StorePeriodState };
