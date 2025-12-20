export interface SwaggerDoc {
  swagger?: string;
  openapi?: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: {
    [key: string]: {
      [method: string]: {
        summary?: string;
        description?: string;
        tags?: string[];
        operationId?: string;
        parameters?: Array<{
          name: string;
          in: string;
          description?: string;
          required?: boolean;
          schema?: {
            type?: string;
            format?: string;
            enum?: string[];
            $ref?: string;
            items?: any;
            [key: string]: any;
          };
        }>;
        requestBody?: {
          content: {
            [contentType: string]: {
              schema: any;
              example?: any;
            };
          };
        };
        responses: {
          [statusCode: string]: {
            description: string;
            content?: {
              [contentType: string]: {
                schema: any;
                example?: any;
              };
            };
          };
        };
      };
    };
  };
  components?: {
    schemas: {
      [key: string]: any;
    };
  };
}

export interface Parameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
    format?: string;
    enum?: string[];
    $ref?: string;
    items?: any;
    [key: string]: any;
  };
}

// Define types for Handlebars context
export interface HandlebarsContext {
  title: string;
  description: string;
  version: string;
  tag: string;
  endpoints: Array<{
    path: string;
    method: string;
    operationId: string;
    summary?: string;
    description?: string;
    parameters: any[];
    responses: any;
    requestBody?: any;
  }>;
  schemas: { [key: string]: any };
  hasImportTypes: boolean;
  usedTypeNames: string[];
  paramInterfaces: string[];
  hooks: string[];
  typeDefinitions: string[];
  camelCase?: (str: string) => string;
  pascalCase?: (str: string) => string;
}