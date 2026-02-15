/** @format */
// use enums instead of strings

declare global {
  interface Window {
    SERVER_CONFIG: {
      base: string;
    };
  }
}



declare global {
  namespace Express {
    interface Request {
      session?: {
        id: string;
        [key: string]: any;
      };
    }
  }
  namespace NodeJS {
    interface Global {
      config: {
        observatoryEnabled: boolean;
        observatoryPaused: boolean;
      };
    }
  }
}

export interface SidePanelState {
  requestId?: string;
  jobId?: string;
  scheduleId?: string;
  modelId?: string;
  isOpen: boolean;
}
