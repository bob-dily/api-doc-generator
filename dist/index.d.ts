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
     * Generates React hooks from the paths in Swagger doc
     */
    generateReactHooks(swaggerDoc: SwaggerDoc): Map<string, string>;
    /**
     * Generates header content for a specific tag
     */
    generateHeaderForTag(tag: string): string;
    /**
     * Generates a parameter interface for an API endpoint
     */
    generateParamInterface(path: string, method: string, endpointInfo: any, schemas: {
        [key: string]: any;
    }): string;
    /**
     * Generates a single React hook for an API endpoint with unique parameter interface
     */
    generateSingleHookWithUniqueName(path: string, method: string, endpointInfo: any, schemas: {
        [key: string]: any;
    }): string;
    /**
     * Generates a single React hook for an API endpoint
     */
    generateSingleHook(path: string, method: string, endpointInfo: any, schemas: {
        [key: string]: any;
    }): string;
    /**
     * Generate operation ID from path and method if not provided
     */
    generateOperationId(path: string, method: string): string;
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
    saveHooksByTag(hooksByTag: Map<string, string>, outputDir: string): void;
}
