declare global {
  namespace Express {
    interface Request {
      session?: {
        id: string;
        [key: string]: any;
      };
    }
  }
}

type HTTPMethod = 'get' | 'post' | 'put' | 'patch';
type HTTPStatus = number;

interface AppControllerRoute {
  method: HTTPMethod | HTTPMethod[];
  route: string | string[];
  handler(request?: ObservatoryBoardRequest): Promisify<ControllerHandlerReturnType>;
}

interface AppViewRoute {
  method: HTTPMethod;
  route: string | string[];
  handler(params: { basePath: string }): ViewHandlerReturnType;
}

type Promisify<T> = T | Promise<T>;

type ControllerHandlerReturnType = {
  status?: HTTPStatus;
  body: string | Record<string, any>;
};

interface ObservatoryBoardRequest {
  requestData: any;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
}

interface IServerAdapter {
  setStaticPath(staticsRoute: string, staticsPath: string): IServerAdapter;
  setEntryRoute(route: AppViewRoute): IServerAdapter;
  setErrorHandler(handler: (error: Error & { statusCode: HTTPStatus }) => ControllerHandlerReturnType): IServerAdapter;
  setApiRoutes(routes: AppControllerRoute[]): IServerAdapter;
}