declare module '@wesleytodd/openapi' {
  interface OpenApiOptions {
    openapi: string;
    info: {
      title: string;
      description: string;
      version: string;
    };
    [key: string]: unknown;
  }

  interface OpenApiPathConfig {
    responses: Record<string | number, unknown>;
    requestBody?: unknown;
    [key: string]: unknown;
  }

  interface OpenApiInstance {
    path: (config: object) => RequestHandler;
    validPath: (config: object) => RequestHandler;
    swaggerui: () => RequestHandler;
    (req: unknown, res: unknown, next: unknown): void;
  }

  interface RequestHandler {
    (req: unknown, res: unknown, next: unknown): void;
  }

  export default function openapi(options: OpenApiOptions, additionalOptions?: Record<string, unknown>): OpenApiInstance;
} 