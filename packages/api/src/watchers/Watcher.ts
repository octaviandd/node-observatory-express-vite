import { Request, Response } from "express";

interface Watcher {
  readonly type: string;
  getIndex(req: Request, res: Response): Promise<{body?: any, statusCode: number}>;
  getView(req: Request, res: Response): Promise<{ body?: any, statusCode: number }>;
  
  addContent(content: unknown): Promise<void>;

  handleAdd(entry: WatcherEntry): Promise<void>;
  handleView(id: string): Promise<any>;
  handleIndexTableOrGraph(filters: WatcherFilters): Promise<any>;
}

export default Watcher;
