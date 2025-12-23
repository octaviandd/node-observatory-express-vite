interface Watcher {
  index(req: ObservatoryBoardRequest): Promise<{ body?: any, statusCode: number }>;
  view(req: ObservatoryBoardRequest): Promise<{ body?: any, statusCode: number }>;

  insertRedisStream(content: WatcherEntry): Promise<void>;
}

export default Watcher;
