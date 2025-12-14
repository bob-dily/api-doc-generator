# Swagger Documentation Generator API

This package provides functionality to generate frontend documentation from Swagger/OpenAPI JSON files.

## API Reference

### SwaggerDocGenerator Class

The main class that provides functionality to fetch, parse, and generate documentation from Swagger files.

#### fetchSwaggerJSON(url: string): Promise<SwaggerDoc>

Fetches the Swagger JSON from the specified URL.

```javascript
const generator = new SwaggerDocGenerator();
const swaggerDoc = await generator.fetchSwaggerJSON('https://api.example.com/swagger.json');
```

#### loadSwaggerFromFile(filePath: string): SwaggerDoc

Loads the Swagger JSON from a local file.

```javascript
const generator = new SwaggerDocGenerator();
const swaggerDoc = generator.loadSwaggerFromFile('./swagger.json');
```

#### generateDocumentation(swaggerDoc: SwaggerDoc): string

Generates Markdown documentation from the provided Swagger doc.

```javascript
const generator = new SwaggerDocGenerator();
const documentation = generator.generateDocumentation(swaggerDoc);
```

#### saveDocumentationToFile(documentation: string, outputPath: string): void

Saves the generated documentation to a file.

```javascript
generator.saveDocumentationToFile(documentation, './docs/api-documentation.md');
```

### SwaggerDoc Interface

This interface represents the structure of a Swagger/OpenAPI document.

```typescript
interface SwaggerDoc {
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
        parameters?: Array<{
          name: string;
          in: string;  // 'query', 'header', 'path', 'formData', 'body'
          description?: string;
          required?: boolean;
          type?: string;
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
```