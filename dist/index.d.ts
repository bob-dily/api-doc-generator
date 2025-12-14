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
export declare class SwaggerDocGenerator {
    /**
     * Fetches the Swagger/OpenAPI JSON from a given URL
     */
    fetchSwaggerJSON(url: string): Promise<SwaggerDoc>;
    /**
     * Loads Swagger JSON from a local file
     */
    loadSwaggerFromFile(filePath: string): SwaggerDoc;
    /**
     * Generates frontend documentation from the Swagger doc
     */
    generateDocumentation(swaggerDoc: SwaggerDoc): string;
    /**
     * Generates TypeScript type definitions from the schemas in Swagger doc
     */
    generateTypeDefinitions(swaggerDoc: SwaggerDoc): string;
    /**
     * Generates a single TypeScript type definition
     */
    generateSingleTypeDefinition(typeName: string, schema: any, allSchemas: {
        [key: string]: any;
    }): string;
    /**
     * Generates React hooks from the paths in Swagger doc organized by tag
     */
    generateReactHooks(swaggerDoc: SwaggerDoc): Map<string, {
        hooks: string;
        types: string;
    }>;
    /**
     * Checks if a schema is used in any of the endpoints
     */
    isSchemaUsedInEndpoints(schemaName: string, endpoints: Array<{
        path: string;
        method: string;
        endpointInfo: any;
    }>, allSchemas: {
        [key: string]: any;
    }): boolean;
    /**
     * Checks if a schema contains a reference to another schema
     */
    schemaContainsRef(schema: any, targetSchemaName: string, allSchemas: {
        [key: string]: any;
    }): boolean;
    /**
     * Find all referenced schemas from a set of directly used schemas
     */
    findAllReferencedSchemas(initialSchemas: Set<string>, allSchemas: {
        [key: string]: any;
    }): Set<string>;
    /**
     * Find schema references in a given schema
     */
    findSchemaReferences(schema: any, allSchemas: {
        [key: string]: any;
    }): Set<string>;
    /**
     * Generates a parameter interface for an API endpoint
     */
    generateParamInterface(path: string, method: string, endpointInfo: any, schemas: {
        [key: string]: any;
    }): string;
    /**
     * Generates a React Query hook using axios
     */
    generateReactQueryHook(path: string, method: string, endpointInfo: any, schemas: {
        [key: string]: any;
    }): string;
    /**
     * Generate operation ID from path and method if not provided
     */
    generateOperationId(path: string, method: string): string;
    /**
     * Formats code using Prettier - sync version with child process
     */
    private formatCode;
    /**
     * Gets the parser based on file extension
     */
    private getParserForFile;
    /**
     * Saves the generated documentation to a file
     */
    saveDocumentationToFile(documentation: string, outputPath: string): void;
    /**
     * Saves the generated TypeScript types to a file
     */
    saveTypesToFile(types: string, outputPath: string): void;
    /**
     * Saves the generated React hooks to files organized by tag
     */
    saveHooksByTag(hooksByTag: Map<string, {
        hooks: string;
        types: string;
    }>, outputDir: string): void;
}
