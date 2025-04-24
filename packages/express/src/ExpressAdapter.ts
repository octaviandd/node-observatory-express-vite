import ejs from 'ejs';
import express, { Express, Request, Response, Router } from 'express';
import { wrapAsync } from './helpers/wrapAsync';

export type HTTPMethod = 'get' | 'post' | 'put' | 'patch';
export type HTTPStatus = number;

interface AppControllerRoute {
  method: HTTPMethod | HTTPMethod[];
  route: string | string[];

  handler(request?: ObservatoryBoardRequest): Promisify<ControllerHandlerReturnType>;
}

export type ViewHandlerReturnType = {
  name: string;
  params: Record<string, string>;
};

export interface AppViewRoute {
  method: HTTPMethod;
  route: string | string[];

  handler(params: { basePath: string }): ViewHandlerReturnType;
}

type Promisify<T> = T | Promise<T>

export type ControllerHandlerReturnType = {
  status?: HTTPStatus;
  body: string | Record<string, any>;
};

export interface ObservatoryBoardRequest {
  requestData: any;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
}

export class ExpressAdapter {
  protected readonly app: Express;
  protected basePath = '';
  protected requestData = [];
  protected errorHandler: ((error: Error) => ControllerHandlerReturnType) | undefined;

  constructor() {
    this.app = express();
  }

  public setBasePath(path: string): ExpressAdapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): ExpressAdapter {
    this.app.use(staticsRoute, express.static(staticsPath));

    return this;
  }

  public setViewsPath(viewPath: string): ExpressAdapter {
    this.app.set('view engine', 'ejs').set('views', viewPath);
    this.app.engine('ejs', ejs.renderFile);

    return this;
  }

  public setErrorHandler(handler: (error: Error) => ControllerHandlerReturnType): ExpressAdapter {
    this.errorHandler = handler;
    return this;
  }

  public setApiRoutes(routes: AppControllerRoute[]): ExpressAdapter {
    const router = Router();
    router.use(express.json());

    routes.forEach((route) =>
      (Array.isArray(route.method) ? route.method : [route.method]).forEach(
        (method: HTTPMethod) => {
          router[method](
            route.route,
            wrapAsync(async (req: Request, res: Response) => {
              const response = await route.handler({
                requestData: this.requestData ,
                query: req.query,
                params: req.params,
                body: req.body,
              });

              res.status(response.status || 200).json(response.body);
            })
          );
        }
      )
    );

    router.use((err: Error, _req: Request, res: Response, next: any) => {
      if (!this.errorHandler) {
        return next();
      }

      const response = this.errorHandler(err);
      return res.status(response.status as 500).send(response.body);
    });

    this.app.use(router);
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): ExpressAdapter {
    const viewHandler = (_req: Request, res: Response) => {
      const { name, params } = routeDef.handler({
        basePath: this.basePath,
      });

      res.render(name, params);
    };

    this.app[routeDef.method](routeDef.route, viewHandler);
    return this;
  }

  public setRequestData(requestData: any): ExpressAdapter {
    this.requestData = requestData;
    return this;
  }

  public getRouter(): any {
    return this.app;
  }
}