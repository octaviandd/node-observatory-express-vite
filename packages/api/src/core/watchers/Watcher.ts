/** @format */
interface Watcher<T extends WatcherType = WatcherType> {
  readonly type: T;

  indexTable(
    req: ObservatoryBoardRequest,
  ): Promise<ApiResponse<TableDataResponse<T, "instance" | "group">>>;
  countGraph(
    req: ObservatoryBoardRequest,
  ): Promise<ApiResponse<CountGraphDataResponse>>;
  durationGraph(
    req: ObservatoryBoardRequest,
  ): Promise<ApiResponse<DurationGraphDataResponse>>;
  view(req: ObservatoryBoardRequest): Promise<ApiResponse<ViewDataResponse>>;
  insertRedisStream(entry: BaseLogEntry): Promise<void>;
  stop(): void;
}

export default Watcher;
