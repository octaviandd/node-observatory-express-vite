import ejs from 'ejs';
import express, { Express, Request, Response, Router } from 'express';
import { wrapAsync } from './helpers/wrapAsync';
import { AppControllerRoute, AppViewRoute, ControllerHandlerReturnType, HTTPMethod, HTTPStatus } from "../../api/dist/types"
import path from "path";
import fs from "node:fs"

export class ExpressAdapter {
  protected readonly app: Express;
  protected basePath = '';
  protected requestData = [];
  protected errorHandler: ((error: Error & { statusCode: HTTPStatus }) => ControllerHandlerReturnType) | undefined;

  constructor() {
    this.app = express();
  }

  public setBasePath(path: string): ExpressAdapter {
    this.basePath = path;
    return this;
  }

  public setStaticPath(staticsRoute: string, staticsPath: string): ExpressAdapter {
    this.app.use(staticsRoute, express.static(staticsPath, {
      redirect: false
    }));

    return this;
  }

  public serveHtmlFile(route: string, filePath: string): ExpressAdapter {
    this.app.get(route, (_req: Request, res: Response) => {
      res.sendFile(filePath);
    });

    return this;
  }

  public setViewsPath(viewPath: string): ExpressAdapter {
    this.app.set('views', viewPath);
    this.app.engine('ejs', ejs.renderFile);

    return this;
  }

  public setErrorHandler(handler: (error: Error & { statusCode: HTTPStatus }) => ControllerHandlerReturnType): ExpressAdapter {
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

    router.use((err: Error & { statusCode: HTTPStatus }, _req: Request, res: Response, next: any) => {
      if (!this.errorHandler) {
        return next();
      }

      const response = this.errorHandler(err);
      return res.status(response.status as number).send(response.body);
    });

    this.app.use(router);
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): ExpressAdapter {
    const viewHandler = async (_req: Request, res: Response) => {
      const { name } = routeDef.handler({
        basePath: this.basePath,
      });

      const configData = {
        base: this.basePath,
      };

      const scriptToInject = `
        <script>
          window.SERVER_CONFIG = ${JSON.stringify(configData)};
        </script>
        `;

      const fullPath = path.join(this.app.get('views'), name);

      let htmlContent = await fs.promises.readFile(fullPath, 'utf-8')
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `${scriptToInject}</body>`);
      } else {
        console.warn(`Could not find </body> tag in ${fullPath}. Appending config script.`);
        htmlContent += scriptToInject;
      }

      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(htmlContent);
    };

    if (Array.isArray(routeDef.route)) {
      routeDef.route.forEach(route => {
        this.app[routeDef.method](route, viewHandler);

        if (route === '/') {
          // This will handle trailing slash case when mounted
          this.app[routeDef.method]('', viewHandler);
        }
      });
    } else {
      this.app[routeDef.method](routeDef.route, viewHandler);

      if (routeDef.route === '/') {
        this.app[routeDef.method]('', viewHandler);
      }
    }
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