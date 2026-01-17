interface WatcherResponse {
  body?: any;
  statusCode: number;
}

interface Watcher {
  readonly type: string;

  index(req: ObservatoryBoardRequest): Promise<WatcherResponse>;
  view(req: ObservatoryBoardRequest): Promise<WatcherResponse>;
  insertRedisStream(entry: BaseLogEntry): Promise<void>;
  stop(): void;
}

export default Watcher;
export type { WatcherResponse };
