import { Request, Response } from "express";

interface Watcher {
  index(req: Request, res: Response): Promise<{ body?: any, statusCode: number }>;
  view(req: Request, res: Response): Promise<{ body?: any, statusCode: number }>;

  insertRedisStream(content: WatcherEntry): void;
}

export default Watcher;
