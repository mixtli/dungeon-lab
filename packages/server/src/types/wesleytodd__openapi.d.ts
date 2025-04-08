/**
 * Type declarations for @wesleytodd/openapi
 */
declare module '@wesleytodd/openapi' {
  import { RequestHandler } from 'express';
  
  interface OpenAPIOptions {
    openapi: string;
    info: {
      title: string;
      description: string;
      version: string;
    };
    [key: string]: any;
  }
  
  interface UIOptions {
    htmlui?: boolean;
    [key: string]: any;
  }
  
  export interface OpenAPIInstance {
    path(config: any): RequestHandler;
    mount(path: string): RequestHandler;
    swaggerui(): RequestHandler;
    (req: any, res: any, next: any): void;
  }
  
  function openapi(options: OpenAPIOptions, uiOptions?: UIOptions): OpenAPIInstance;
  
  export default openapi;
} 