/** @format */

import * as TJS from "typescript-json-schema";
import fs from "fs";
import path from "path";
import { WatcherType } from "../src/core/watcherConfig.js";

// ============================================================================
// OpenAPI Spec Generation (aligned with /table and /graph split)
//  - Table endpoint:   GET /api/{resource}/table?index=instance|group
//  - Graph endpoint:   GET /api/{resource}/graph
//  - View endpoint:    GET /api/{resource}/{id}
//  - Related endpoint: POST /api/{resource}/{id}/related
//  - Refresh endpoint: GET /api/{resource}/refresh
// ============================================================================

const ROUTE_CONFIG = [
  { path: "requests", type: "request" as const },
  { path: "queries", type: "query" as const },
  { path: "notifications", type: "notification" as const },
  { path: "mails", type: "mail" as const },
  { path: "exceptions", type: "exception" as const },
  { path: "jobs", type: "job" as const },
  { path: "schedules", type: "schedule" as const },
  { path: "https", type: "http" as const },
  { path: "cache", type: "cache" as const },
  { path: "logs", type: "log" as const },
  { path: "views", type: "view" as const },
  { path: "models", type: "model" as const },
] as const;

// Map watcher types to their actual TypeScript response type names
const WATCHER_TYPE_TO_RESPONSE_NAME: Record<WatcherType, string> = {
  request: "Request",
  cache: "Cache",
  job: "Job",
  query: "Query",
  http: "HttpClient",
  schedule: "Schedule",
  mail: "Mail",
  log: "Log",
  exception: "Exception",
  model: "Model",
  view: "View",
  notification: "Notification",
};

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getResponseTypeName(watcherType: WatcherType): string {
  return WATCHER_TYPE_TO_RESPONSE_NAME[watcherType];
}

function getWatcherSpecificParams(watcherType: WatcherType) {
  const additionalParams: any[] = [];

  switch (watcherType) {
    case "exception":
      additionalParams.push({
        in: "query",
        name: "status",
        schema: {
          type: "string",
          enum: ["all", "unhandledRejection", "uncaughtException"],
        },
      });
      break;

    case "cache":
      additionalParams.push({
        in: "query",
        name: "status",
        schema: { type: "string", enum: ["hits", "misses", "writes", "all"] },
      });
      break;

    case "request":
    case "http":
      additionalParams.push({
        in: "query",
        name: "status",
        schema: { type: "string", enum: ["2xx", "3xx", "4xx", "5xx", "all"] },
      });
      break;

    case "query":
    case "notification":
    case "mail":
    case "view":
    case "model":
      additionalParams.push({
        in: "query",
        name: "status",
        schema: { type: "string", enum: ["completed", "failed", "all"] },
      });
      break;

    case "job":
      additionalParams.push(
        { in: "query", name: "status", schema: { type: "string" } },
        { in: "query", name: "queue", schema: { type: "string" } },
      );
      break;

    case "schedule":
      additionalParams.push(
        { in: "query", name: "status", schema: { type: "string" } },
        { in: "query", name: "groupFilter", schema: { type: "string" } },
      );
      break;

    case "log":
      additionalParams.push({
        in: "query",
        name: "status",
        schema: { type: "string", enum: ["error", "warning", "info", "all"] },
      });
      break;
  }

  return additionalParams;
}

function generateOpenAPIPath(
  resourcePath: string,
  watcherType: WatcherType,
  tag: string,
) {
  const typeName = getResponseTypeName(watcherType);

  // Shared params for both /table and /graph
  const baseParams = [
    { in: "query", name: "offset", schema: { type: "integer", default: 0 } },
    { in: "query", name: "limit", schema: { type: "integer", default: 20 } },
    {
      in: "query",
      name: "period",
      schema: { $ref: "#/components/schemas/Period" },
    },
    { in: "query", name: "q", schema: { type: "string" } },
    { in: "query", name: "key", schema: { type: "string" } },
    ...getWatcherSpecificParams(watcherType),
  ];

  return {
    // ── /table ──────────────────────────────────────────────────────────
    [`/api/${resourcePath}/table`]: {
      get: {
        summary: `Get ${resourcePath} table data`,
        tags: [tag],
        parameters: [
          ...baseParams,
          {
            in: "query",
            name: "index",
            required: true,
            schema: { $ref: "#/components/schemas/IndexType" },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      description: "Instance results",
                      type: "object",
                      properties: {
                        results: {
                          type: "array",
                          items: {
                            $ref: `#/components/schemas/${typeName}InstanceResponse`,
                          },
                        },
                        count: { type: "string" },
                      },
                      required: ["results", "count"],
                      additionalProperties: false,
                    },
                    {
                      description: "Group results",
                      type: "object",
                      properties: {
                        results: {
                          type: "array",
                          items: {
                            $ref: `#/components/schemas/${typeName}GroupResponse`,
                          },
                        },
                        count: { type: "string" },
                      },
                      required: ["results", "count"],
                      additionalProperties: false,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },

    // ── /graph/count ──────────────────────────────────────────────────────────
    [`/api/${resourcePath}/graph/count`]: {
      get: {
        summary: `Get ${resourcePath} count graph data`,
        tags: [tag],
        parameters: baseParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CountGraphDataResponse" },
              },
            },
          },
        },
      },
    },

    // ── /graph/duration ──────────────────────────────────────────────────────────
    [`/api/${resourcePath}/graph/duration`]: {
      get: {
        summary: `Get ${resourcePath} duration graph data`,
        tags: [tag],
        parameters: baseParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/DurationGraphDataResponse",
                },
              },
            },
          },
        },
      },
    },

    // ── /{id} ───────────────────────────────────────────────────────────
    [`/api/${resourcePath}/{id}`]: {
      get: {
        summary: `Get ${resourcePath.slice(0, -1)} by ID`,
        tags: [tag],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ViewDataResponse" },
              },
            },
          },
        },
      },
    },

    // ── /{id}/related ───────────────────────────────────────────────────
    [`/api/${resourcePath}/{id}/related`]: {
      post: {
        summary: `Get related ${resourcePath.slice(0, -1)} metadata`,
        tags: [tag],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  requestId: { type: "string" },
                  jobId: { type: "string" },
                  scheduleId: { type: "string" },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ViewDataResponse" },
              },
            },
          },
        },
      },
    },

    // ── /refresh ────────────────────────────────────────────────────────
    [`/api/${resourcePath}/refresh`]: {
      get: {
        summary: `Refresh ${resourcePath} data`,
        tags: [tag],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                  additionalProperties: false,
                },
              },
            },
          },
        },
      },
    },
  };
}

function generateBaseOpenAPISpec() {
  const paths: any = {
    // "/api/": {
    //   get: {
    //     summary: "Dashboard overview",
    //     tags: ["Dashboard"],
    //     responses: {
    //       200: {
    //         description: "Dashboard data",
    //         content: {
    //           "application/json": {
    //             schema: { $ref: "#/components/schemas/DashboardResponse" },
    //           },
    //         },
    //       },
    //     },
    //   },
    // },
  };

  ROUTE_CONFIG.forEach(({ path: p, type }) => {
    const tag = capitalizeFirstLetter(p);
    Object.assign(paths, generateOpenAPIPath(p, type, tag));
  });

  return {
    openapi: "3.0.0",
    info: {
      title: "Observatory API",
      version: "1.0.0",
      description: "Monitoring and observability API for Node.js applications",
    },
    servers: [{ url: "", description: "API Server" }],
    components: {
      schemas: {
        Period: {
          type: "string",
          enum: ["1h", "24h", "7d", "14d", "30d"],
        },
        IndexType: {
          type: "string",
          enum: ["instance", "group"],
        },
      },
    },
    paths,
  };
}

// ============================================================================
// TypeScript Schema Generation (inline; no $ref)
// ============================================================================

function generateSchemasFromTypes() {
  const settings: TJS.PartialArgs = {
    required: true,
    noExtraProps: false,
    ignoreErrors: true,
    ref: false, // Inline all definitions
  };

  const compilerOptions: TJS.CompilerOptions = {
    strictNullChecks: true,
    esModuleInterop: true,
  };

  const program = TJS.getProgramFromFiles(
    [path.resolve("types.d.ts")],
    compilerOptions,
    "./",
  );

  const responseTypes = [
    // Instance types
    "RequestInstanceResponse",
    "CacheInstanceResponse",
    "JobInstanceResponse",
    "QueryInstanceResponse",
    "HttpClientInstanceResponse",
    "ScheduleInstanceResponse",
    "MailInstanceResponse",
    "LogInstanceResponse",
    "ExceptionInstanceResponse",
    "ModelInstanceResponse",
    "ViewInstanceResponse",
    "NotificationInstanceResponse",

    // Group types
    "RequestGroupResponse",
    "CacheGroupResponse",
    "JobGroupResponse",
    "QueryGroupResponse",
    "HttpClientGroupResponse",
    "ScheduleGroupResponse",
    "MailGroupResponse",
    "LogGroupResponse",
    "ExceptionGroupResponse",
    "ModelGroupResponse",
    "ViewGroupResponse",
    "NotificationGroupResponse",

    // Shared response types
    "CountGraphDataResponse",
    "DurationGraphDataResponse",
    "ViewDataResponse",
    // "DashboardResponse",
  ];

  const schemas: Record<string, any> = {};

  console.log("🔄 Generating schemas from TypeScript types...");

  for (const typeName of responseTypes) {
    const schema = TJS.generateSchema(program, typeName, settings);
    if (!schema) {
      console.warn(`  ⚠️  Could not generate schema for ${typeName}`);
      continue;
    }

    delete schema.$schema;

    if (schema.definitions) {
      for (const [defName, defSchema] of Object.entries(schema.definitions)) {
        if (!schemas[defName]) schemas[defName] = defSchema;
      }
      delete schema.definitions;
    }

    schemas[typeName] = schema;
    console.log(`  ✓ Generated schema for ${typeName}`);
  }

  return schemas;
}

// ============================================================================
// Main Execution
// ============================================================================

console.log("🚀 Starting OpenAPI generation...\n");

console.log("📝 Generating base OpenAPI specification...");
const baseSpec = generateBaseOpenAPISpec();
console.log("✓ Base spec generated\n");

const generatedSchemas = generateSchemasFromTypes();
console.log(
  `\n✓ Generated ${Object.keys(generatedSchemas).length} detailed schemas\n`,
);

console.log("🔗 Merging schemas into OpenAPI spec...");
baseSpec.components.schemas = {
  ...baseSpec.components.schemas,
  ...generatedSchemas,
};

const openApiPath = path.resolve("./openapi.json");
fs.writeFileSync(openApiPath, JSON.stringify(baseSpec, null, 2));

console.log("\n✅ Complete OpenAPI spec generated successfully!");
console.log(
  `📊 Total schemas: ${Object.keys(baseSpec.components.schemas).length}`,
);
console.log(`📁 Output: ${openApiPath}`);
console.log(
  "\n💡 Next step: Run 'npm run generate:types' to generate TypeScript types",
);
