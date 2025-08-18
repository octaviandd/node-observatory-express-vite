/** @format */

import React, { createContext, useReducer, ReactNode, Dispatch } from "react";
interface State {
  period: "1h" | "24h" | "7d" | "14d" | "30d";
}

type Action = {
  type: "setPeriod";
  payload: "1h" | "24h" | "7d" | "14d" | "30d";
};

const initialState: State = {
  period: (window.localStorage.getItem("period") as
    | "1h"
    | "24h"
    | "7d"
    | "14d"
    | "30d") ?? '1h'
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "setPeriod":
      return { ...state, period: action.payload };
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

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export { StoreContext, StoreProvider };
