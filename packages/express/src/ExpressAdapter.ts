import express, { Express, NextFunction, Request, Response, Router } from 'express';
import { wrapAsync } from './helpers/wrapAsync';
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
      redirect: false,
      index: false
    }));

    return this;
  }

  public serveHtmlFile(route: string, filePath: string): ExpressAdapter {
    this.app.get(route, (_req: Request, res: Response) => {
      res.sendFile(filePath);
    });

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
          console.log(`📝 Registering: ${method.toUpperCase()} ${route.route}`);
          router[method](
            route.route,
            wrapAsync(async (req: Request, res: Response) => {
              console.log(`✅ REQUEST HIT: ${method.toUpperCase()} ${req.path}`);
              console.log('Route pattern:', route.route);
              console.log('Body:', req.body);
              console.log('Params:', req.params);

              const response = await route.handler({
                requestData: this.requestData,
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

    router.use((err: Error & { statusCode: HTTPStatus }, _req: Request, res: Response, next: NextFunction) => {
      if (!this.errorHandler) {
        return next();
      }

      const response = this.errorHandler(err);
      return res.status(response.status ?? 500).json(response.body);
    });

    this.app.use(router);
    return this;
  }

  public setEntryRoute(routeDef: AppViewRoute): ExpressAdapter {
    const viewHandler = async (_req: Request, res: Response) => {
      const { name: fullPath } = routeDef.handler({ basePath: this.basePath });

      const configData = {
        base: this.basePath,
      };

      const scriptToInject = `
        <script>
          window.SERVER_CONFIG = ${JSON.stringify(configData)};
        </script>
      `;

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

  public getRouter(): any {
    return this.app;
  }
}