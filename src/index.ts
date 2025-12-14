import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

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

/**
 * Transforms a string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toUpperCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Transforms a string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Converts OpenAPI types to TypeScript types
 */
function convertTypeToTs(typeDef: any, schemaComponents: { [key: string]: any }): string {
  if (!typeDef) return 'any';

  if (typeDef.$ref) {
    // Extract the type name from the reference
    const refTypeName = typeDef.$ref.split('/').pop();
    return refTypeName || 'any';
  }

  // Handle allOf (used for composition/references)
  if (typeDef.allOf && Array.isArray(typeDef.allOf)) {
    return typeDef.allOf.map((item: any) => {
      if (item.$ref) {
        return item.$ref.split('/').pop();
      } else if (item.type) {
        return convertTypeToTs(item, schemaComponents);
      }
      return 'any';
    }).filter(Boolean).join(' & ') || 'any';
  }

  if (Array.isArray(typeDef.type)) {
    // Handle union types like ["string", "null"]
    if (typeDef.type.includes('null')) {
      const nonNullType = typeDef.type.find((t: string) => t !== 'null');
      return `${convertTypeToTs({...typeDef, type: nonNullType}, schemaComponents)} | null`;
    }
    return 'any';
  }

  switch (typeDef.type) {
    case 'string':
      if (typeDef.enum) {
        return `"${typeDef.enum.join('" | "')}"`;
      }
      if (typeDef.format === 'date' || typeDef.format === 'date-time') {
        return 'string';
      }
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      if (typeDef.items) {
        return `${convertTypeToTs(typeDef.items, schemaComponents)}[]`;
      }
      return 'any[]';
    case 'object':
      if (typeDef.properties) {
        // Inline object definition
        const fields = Object.entries(typeDef.properties)
          .map(([propName, propSchema]: [string, any]) => {
            const required = typeDef.required && typeDef.required.includes(propName);
            const optional = !required ? '?' : '';
            return `  ${propName}${optional}: ${convertTypeToTs(propSchema, schemaComponents)};`;
          })
          .join('\n');
        return `{\n${fields}\n}`;
      }
      return 'Record<string, any>';
    case 'null':
      return 'null';
    default:
      return 'any';
  }
}

export class SwaggerDocGenerator {
  /**
   * Fetches the Swagger/OpenAPI JSON from a given URL
   */
  async fetchSwaggerJSON(url: string): Promise<SwaggerDoc> {
    try {
      const response: AxiosResponse<SwaggerDoc> = await axios.get(url);
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Swagger JSON from ${url}: ${error.message}`);
      } else {
        throw new Error(`Failed to fetch Swagger JSON from ${url}: ${String(error)}`);
      }
    }
  }

  /**
   * Loads Swagger JSON from a local file
   */
  loadSwaggerFromFile(filePath: string): SwaggerDoc {
    try {
      const jsonData = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(jsonData);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to load Swagger JSON from ${filePath}: ${error.message}`);
      } else {
        throw new Error(`Failed to load Swagger JSON from ${filePath}: ${String(error)}`);
      }
    }
  }

  /**
   * Generates frontend documentation from the Swagger doc
   */
  generateDocumentation(swaggerDoc: SwaggerDoc): string {
    let documentation = `# ${swaggerDoc.info.title}\n\n`;
    documentation += `${swaggerDoc.info.description || swaggerDoc.info.title} v${swaggerDoc.info.version}\n\n`;

    // Add API endpoints section
    documentation += "## API Endpoints\n\n";

    Object.entries(swaggerDoc.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpointInfo]) => {
        documentation += `### ${method.toUpperCase()} ${path}\n\n`;

        if (endpointInfo.summary) {
          documentation += `**Summary:** ${endpointInfo.summary}\n\n`;
        }

        if (endpointInfo.description) {
          documentation += `**Description:** ${endpointInfo.description}\n\n`;
        }

        // Add parameters
        if (endpointInfo.parameters && endpointInfo.parameters.length > 0) {
          documentation += "**Parameters:**\n\n";
          endpointInfo.parameters.forEach(param => {
            documentation += `- **${param.name}** (${param.in}): ${param.description || ''}`;
            if (param.required) {
              documentation += ' *(required)*';
            }
            documentation += '\n';
          });
          documentation += '\n';
        }

        // Add request body if present
        if (endpointInfo.requestBody) {
          documentation += "**Request Body:**\n\n";
          Object.entries(endpointInfo.requestBody.content).forEach(([contentType, contentInfo]) => {
            documentation += `- Content-Type: \`${contentType}\`\n`;

            if (contentInfo.example) {
              documentation += `\n**Example Request:**\n\`\`\`json\n${JSON.stringify(contentInfo.example, null, 2)}\n\`\`\`\n\n`;
            } else if (contentInfo.schema) {
              documentation += `\n**Schema:**\n\`\`\`json\n${JSON.stringify(contentInfo.schema, null, 2)}\n\`\`\`\n\n`;
            }
          });
        }

        // Add responses
        if (endpointInfo.responses) {
          documentation += "**Responses:**\n\n";
          Object.entries(endpointInfo.responses).forEach(([statusCode, responseInfo]) => {
            documentation += `- **${statusCode}**: ${responseInfo.description}\n`;

            if (responseInfo.content) {
              Object.entries(responseInfo.content).forEach(([contentType, contentInfo]) => {
                if (contentInfo.example) {
                  documentation += `\n**Example Response:**\n\`\`\`json\n${JSON.stringify(contentInfo.example, null, 2)}\n\`\`\`\n\n`;
                } else if (contentInfo.schema) {
                  documentation += `\n**Schema:**\n\`\`\`json\n${JSON.stringify(contentInfo.schema, null, 2)}\n\`\`\`\n\n`;
                }
              });
            }
          });
        }

        documentation += "---\n\n";
      });
    });

    return documentation;
  }

  /**
   * Generates TypeScript type definitions from the schemas in Swagger doc
   */
  generateTypeDefinitions(swaggerDoc: SwaggerDoc): string {
    if (!swaggerDoc.components?.schemas) {
      return '';
    }

    let typeDefs = '// Auto-generated TypeScript types from Swagger schema\n\n';

    Object.entries(swaggerDoc.components.schemas).forEach(([typeName, schema]) => {
      typeDefs += this.generateSingleTypeDefinition(typeName, schema, swaggerDoc.components!.schemas);
      typeDefs += '\n';
    });

    return typeDefs;
  }

  /**
   * Generates a single TypeScript type definition
   */
  generateSingleTypeDefinition(typeName: string, schema: any, allSchemas: { [key: string]: any }): string {
    if (schema.enum) {
      // Enum type
      return `export type ${typeName} = ${schema.enum.map((val: any) => `'${val}'`).join(' | ')};\n`;
    }

    if (schema.oneOf || schema.anyOf || schema.allOf) {
      // Union type or complex type
      const typeOption = schema.oneOf ? 'oneOf' : schema.anyOf ? 'anyOf' : 'allOf';
      const types = schema[typeOption].map((item: any) => {
        if (item.$ref) {
          return item.$ref.split('/').pop();
        } else if (item.type) {
          return convertTypeToTs(item, allSchemas);
        } else {
          return 'any';
        }
      }).filter(Boolean);
      return `export type ${typeName} = ${types.join(' | ')};\n`;
    }

    if (schema.type === 'object') {
      // Object type
      let result = `export interface ${typeName} {\n`;

      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
          const required = schema.required && schema.required.includes(propName);
          const optional = !required ? '?' : '';

          // Add JSDoc comment if available
          if (propSchema.description) {
            result += `  /** ${propSchema.description} */\n`;
          }

          result += `  ${propName}${optional}: ${convertTypeToTs(propSchema, allSchemas)};\n`;
        });
      }

      result += '}\n';
      return result;
    }

    // For other types (string, number, etc.) that might have additional properties
    return `export type ${typeName} = ${convertTypeToTs(schema, allSchemas)};\n`;
  }

  /**
   * Generates React hooks from the paths in Swagger doc organized by tag
   */
  generateReactHooks(swaggerDoc: SwaggerDoc): Map<string, { hooks: string, types: string }> {
    const hooksByTag = new Map<string, { hooks: string, types: string }>();
    const schemas = swaggerDoc.components?.schemas || {};

    // Group endpoints by tag
    const endpointsByTag: { [tag: string]: Array<{ path: string, method: string, endpointInfo: any }> } = {};

    Object.entries(swaggerDoc.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpointInfo]) => {
        // Determine the tag for this endpoint
        const tag = (endpointInfo.tags && endpointInfo.tags[0]) ? endpointInfo.tags[0] : 'General';

        if (!endpointsByTag[tag]) {
          endpointsByTag[tag] = [];
        }
        endpointsByTag[tag].push({ path, method, endpointInfo });
      });
    });

    // Generate hooks and types for each tag
    Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
      // Generate TypeScript types for schemas used in this tag
      let typesContent = `// ${toPascalCase(tag)} API Types\n\n`;

      // First, find all directly used schemas in endpoints for this tag
      const directlyUsedSchemas = new Set<string>();
      if (schemas) {
        Object.entries(schemas).forEach(([typeName, schema]) => {
          if (this.isSchemaUsedInEndpoints(typeName, endpoints, schemas)) {
            directlyUsedSchemas.add(typeName);
          }
        });
      }

      // Then, find all referenced schemas (schemas that are referenced by the directly used ones)
      const allNeededSchemas = this.findAllReferencedSchemas(directlyUsedSchemas, schemas);

      // Generate types for all needed schemas
      if (schemas) {
        for (const typeName of allNeededSchemas) {
          const schema = schemas[typeName];
          if (schema) {
            typesContent += this.generateSingleTypeDefinition(typeName, schema, schemas);
            typesContent += '\n';
          }
        }
      }

      // Generate hooks content
      let hooksContent = `// ${toPascalCase(tag)} API Hooks\n`;
      hooksContent += `import { useQuery, useMutation, useQueryClient } from 'react-query';\n`;
      hooksContent += `import axios from 'axios';\n`;

      // Determine which types are actually used in this tag's endpoints and generate imports
      const usedTypeNames = new Set<string>();

      // First, find all types that are directly used in endpoints for this tag
      if (schemas) {
        for (const [typeName, schema] of Object.entries(schemas)) {
          if (this.isSchemaUsedInEndpoints(typeName, endpoints, schemas)) {
            usedTypeNames.add(typeName);
          }
        }
      }

      // Then, add all transitive dependencies of the directly used types
      const finalTypeNames = new Set<string>();
      for (const typeName of usedTypeNames) {
        finalTypeNames.add(typeName);
        // Find all types referenced by this type
        const referencedTypes = this.findSchemaReferences(schemas[typeName], schemas);
        for (const refName of referencedTypes) {
          if (schemas[refName]) {
            finalTypeNames.add(refName);
          }
        }
      }

      // Add import statement only if there are types to import
      if (finalTypeNames.size > 0) {
        hooksContent += `import type { ${Array.from(finalTypeNames).join(', ')} } from './${toCamelCase(tag)}.types';\n\n`;
      } else {
        hooksContent += `\n`;
      }

      // Generate parameter interfaces for this tag
      const allParamInterfaces: string[] = [];
      endpoints.forEach(({ path, method, endpointInfo }) => {
        const paramInterface = this.generateParamInterface(path, method, endpointInfo, schemas);
        if (paramInterface && !allParamInterfaces.includes(paramInterface)) {
          allParamInterfaces.push(paramInterface);
        }
      });

      // Add all unique parameter interfaces
      allParamInterfaces.forEach(interfaceCode => {
        hooksContent += interfaceCode + '\n';
      });

      // Generate individual hooks using react-query and axios
      endpoints.forEach(({ path, method, endpointInfo }) => {
        const hookContent = this.generateReactQueryHook(path, method, endpointInfo, schemas);
        hooksContent += hookContent + '\n';
      });

      hooksByTag.set(tag, { hooks: hooksContent, types: typesContent });
    });

    return hooksByTag;
  }

  /**
   * Checks if a schema is used in any of the endpoints
   */
  isSchemaUsedInEndpoints(schemaName: string, endpoints: Array<{ path: string, method: string, endpointInfo: any }>, allSchemas: { [key: string]: any }): boolean {
    for (const { endpointInfo } of endpoints) {
      // Check if schema is used as response
      if (endpointInfo.responses) {
        for (const [, responseInfo] of Object.entries(endpointInfo.responses) as [string, any]) {
          if (responseInfo.content) {
            for (const [, contentInfo] of Object.entries(responseInfo.content) as [string, any]) {
              if (contentInfo.schema) {
                if (this.schemaContainsRef(contentInfo.schema, schemaName, allSchemas)) {
                  return true;
                }
              }
            }
          }
        }
      }

      // Check if schema is used in parameters
      if (endpointInfo.parameters) {
        for (const param of endpointInfo.parameters) {
          if (param.schema && this.schemaContainsRef(param.schema, schemaName, allSchemas)) {
            return true;
          }
        }
      }

      // Check if schema is used in request body
      if (endpointInfo.requestBody && endpointInfo.requestBody.content) {
        for (const [, contentInfo] of Object.entries(endpointInfo.requestBody.content) as [string, any]) {
          if (contentInfo.schema && this.schemaContainsRef(contentInfo.schema, schemaName, allSchemas)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Checks if a schema contains a reference to another schema
   */
  schemaContainsRef(schema: any, targetSchemaName: string, allSchemas: { [key: string]: any }): boolean {
    if (!schema) return false;

    // Check if this schema directly references the target
    if (schema.$ref) {
      const refTypeName = schema.$ref.split('/').pop();
      if (refTypeName === targetSchemaName) {
        return true;
      }
    }

    // Recursively check nested properties
    if (schema.properties) {
      for (const [, propSchema] of Object.entries(schema.properties)) {
        if (this.schemaContainsRef(propSchema as any, targetSchemaName, allSchemas)) {
          return true;
        }
      }
    }

    // Check if it's an array schema
    if (schema.items) {
      if (this.schemaContainsRef(schema.items, targetSchemaName, allSchemas)) {
        return true;
      }
    }

    // Check allOf, oneOf, anyOf
    if (schema.allOf) {
      for (const item of schema.allOf) {
        if (this.schemaContainsRef(item, targetSchemaName, allSchemas)) {
          return true;
        }
      }
    }

    if (schema.oneOf) {
      for (const item of schema.oneOf) {
        if (this.schemaContainsRef(item, targetSchemaName, allSchemas)) {
          return true;
        }
      }
    }

    if (schema.anyOf) {
      for (const item of schema.anyOf) {
        if (this.schemaContainsRef(item, targetSchemaName, allSchemas)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find all referenced schemas from a set of directly used schemas
   */
  findAllReferencedSchemas(initialSchemas: Set<string>, allSchemas: { [key: string]: any }): Set<string> {
    const result = new Set<string>([...initialSchemas]); // Start with initial schemas
    let changed = true;

    while (changed) {
      changed = false;

      for (const typeName of [...result]) { // Use spread to create a new array to avoid concurrent modification
        const schema = allSchemas[typeName];
        if (schema) {
          // Check for references in the schema
          const referencedSchemas = this.findSchemaReferences(schema, allSchemas);
          for (const refName of referencedSchemas) {
            if (!result.has(refName) && allSchemas[refName]) {
              result.add(refName);
              changed = true;
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Find schema references in a given schema
   */
  findSchemaReferences(schema: any, allSchemas: { [key: string]: any }): Set<string> {
    const references = new Set<string>();

    if (!schema) return references;

    // Check direct $ref
    if (schema.$ref) {
      const refTypeName = schema.$ref.split('/').pop();
      if (refTypeName && allSchemas[refTypeName]) {
        references.add(refTypeName);
      }
    }

    // Check properties
    if (schema.properties) {
      Object.values(schema.properties).forEach((propSchema: any) => {
        const nestedRefs = this.findSchemaReferences(propSchema, allSchemas);
        nestedRefs.forEach(ref => references.add(ref));
      });
    }

    // Check array items
    if (schema.items) {
      const itemRefs = this.findSchemaReferences(schema.items, allSchemas);
      itemRefs.forEach(ref => references.add(ref));
    }

    // Check allOf, oneOf, anyOf
    if (schema.allOf) {
      schema.allOf.forEach((item: any) => {
        const itemRefs = this.findSchemaReferences(item, allSchemas);
        itemRefs.forEach(ref => references.add(ref));
      });
    }

    if (schema.oneOf) {
      schema.oneOf.forEach((item: any) => {
        const itemRefs = this.findSchemaReferences(item, allSchemas);
        itemRefs.forEach(ref => references.add(ref));
      });
    }

    if (schema.anyOf) {
      schema.anyOf.forEach((item: any) => {
        const itemRefs = this.findSchemaReferences(item, allSchemas);
        itemRefs.forEach(ref => references.add(ref));
      });
    }

    return references;
  }

  /**
   * Generates a parameter interface for an API endpoint
   */
  generateParamInterface(path: string, method: string, endpointInfo: any, schemas: { [key: string]: any }): string {
    if (!endpointInfo.parameters || endpointInfo.parameters.length === 0) {
      return '';
    }

    const pathParams = endpointInfo.parameters.filter((p: Parameter) => p.in === 'path');
    const queryParams = endpointInfo.parameters.filter((p: Parameter) => p.in === 'query');

    if (pathParams.length === 0 && queryParams.length === 0) {
      return '';
    }

    // Create a unique interface name based on the operation ID
    const operationId = endpointInfo.operationId || this.generateOperationId(path, method);
    const interfaceName = `${toPascalCase(operationId)}Params`;

    let paramsInterface = `export interface ${interfaceName} {\n`;

    // Add path parameters
    pathParams.forEach((param: Parameter) => {
      const required = param.required ? '' : '?';
      const type = convertTypeToTs(param.schema || {}, schemas);
      paramsInterface += `  ${toCamelCase(param.name)}${required}: ${type};\n`;
    });

    // Add query parameters
    queryParams.forEach((param: Parameter) => {
      const required = param.required ? '' : '?';
      const type = convertTypeToTs(param.schema || {}, schemas);
      paramsInterface += `  ${toCamelCase(param.name)}${required}: ${type};\n`;
    });

    paramsInterface += '}\n';
    return paramsInterface;
  }

  /**
   * Generates a React Query hook using axios
   */
  generateReactQueryHook(path: string, method: string, endpointInfo: any, schemas: { [key: string]: any }): string {
    const operationId = endpointInfo.operationId || this.generateOperationId(path, method);
    const hookName = `use${toPascalCase(operationId)}`;
    const hookType = method.toLowerCase() === 'get' ? 'useQuery' : 'useMutation';

    // Use unique parameter interface name
    const pathParams = endpointInfo.parameters?.filter((p: Parameter) => p.in === 'path') || [];
    const queryParams = endpointInfo.parameters?.filter((p: Parameter) => p.in === 'query') || [];

    // Determine response type
    let responseType = 'any';
    if (endpointInfo.responses && endpointInfo.responses['200']) {
      const responseSchema = endpointInfo.responses['200'].content?.['application/json']?.schema;
      if (responseSchema) {
        responseType = convertTypeToTs(responseSchema, schemas);
      }
    }

    // Generate request body parameter if needed
    let requestBodyType = 'any';
    let hasBody = false;
    if (method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete' && endpointInfo.requestBody) {
      const bodySchema = endpointInfo.requestBody.content?.['application/json']?.schema;
      if (bodySchema) {
        requestBodyType = convertTypeToTs(bodySchema, schemas);
        hasBody = true;
      }
    }

    // Format the path for use in the code (handle path parameters)
    const pathWithParams = path.replace(/{(\w+)}/g, (_, param) => `\${params.${toCamelCase(param)}}`);
    const axiosPath = `\`\${process.env.REACT_APP_API_BASE_URL || ''}${pathWithParams}\``;

    // Generate the hook code
    let hookCode = '';

    if (method.toLowerCase() === 'get') {
      // For GET requests, use useQuery
      const hasParams = pathParams.length > 0 || queryParams.length > 0;
      if (hasParams) {
        const paramInterfaceName = `${toPascalCase(operationId)}Params`;
        hookCode += `export const ${hookName} = (params: ${paramInterfaceName}) => {\n`;
        hookCode += `  return useQuery({\n`;
        hookCode += `    queryKey: ['${operationId}', params],\n`;
        hookCode += `    queryFn: async () => {\n`;
        hookCode += `      const response = await axios.get<${responseType}>(${axiosPath}, { params });\n`;
        hookCode += `      return response.data;\n`;
        hookCode += `    },\n`;
        hookCode += `  });\n`;
        hookCode += `};\n`;
      } else {
        hookCode += `export const ${hookName} = () => {\n`;
        hookCode += `  return useQuery({\n`;
        hookCode += `    queryKey: ['${operationId}'],\n`;
        hookCode += `    queryFn: async () => {\n`;
        hookCode += `      const response = await axios.get<${responseType}>(${axiosPath});\n`;
        hookCode += `      return response.data;\n`;
        hookCode += `    },\n`;
        hookCode += `  });\n`;
        hookCode += `};\n`;
      }
    } else {
      // For non-GET requests, use useMutation
      const hasPathParams = pathParams.length > 0;
      if (hasPathParams) {
        const paramInterfaceName = `${toPascalCase(operationId)}Params`;
        hookCode += `export const ${hookName} = () => {\n`;
        hookCode += `  const queryClient = useQueryClient();\n\n`;
        hookCode += `  return useMutation({\n`;
        hookCode += `    mutationFn: async ({ params, data }: { params: ${paramInterfaceName}; data: ${requestBodyType} }) => {\n`;
        // Format the path for use in the code (handle path parameters)
        let formattedPath = path.replace(/{(\w+)}/g, (_, param) => `\${params.${toCamelCase(param)}}`);
        const pathWithParams = `\`\${process.env.REACT_APP_API_BASE_URL || ''}${formattedPath}\``;
        hookCode += `      const response = await axios.${method.toLowerCase()}<${responseType}>(${pathWithParams}, data);\n`;
        hookCode += `      return response.data;\n`;
        hookCode += `    },\n`;
        hookCode += `    onSuccess: () => {\n`;
        hookCode += `      // Invalidate and refetch related queries\n`;
        hookCode += `      queryClient.invalidateQueries({ queryKey: ['${operationId}'] });\n`;
        hookCode += `    },\n`;
        hookCode += `  });\n`;
        hookCode += `};\n`;
      } else {
        hookCode += `export const ${hookName} = () => {\n`;
        hookCode += `  const queryClient = useQueryClient();\n\n`;
        hookCode += `  return useMutation({\n`;
        hookCode += `    mutationFn: async (data: ${requestBodyType}) => {\n`;
        hookCode += `      const response = await axios.${method.toLowerCase()}<${responseType}>(${axiosPath}, data);\n`;
        hookCode += `      return response.data;\n`;
        hookCode += `    },\n`;
        hookCode += `    onSuccess: () => {\n`;
        hookCode += `      // Invalidate and refetch related queries\n`;
        hookCode += `      queryClient.invalidateQueries({ queryKey: ['${operationId}'] });\n`;
        hookCode += `    },\n`;
        hookCode += `  });\n`;
        hookCode += `};\n`;
      }
    }

    return hookCode;
  }


  /**
   * Generate operation ID from path and method if not provided
   */
  generateOperationId(path: string, method: string): string {
    return `${method.toLowerCase()}_${path.replace(/[\/{}]/g, '_')}`;
  }

  /**
   * Formats code using Prettier - sync version with child process
   */
  private formatCode(code: string, filepath: string): string {
    // Skip formatting in test environment to avoid ESM issues
    if (process.env.NODE_ENV === 'test' || typeof jest !== 'undefined') {
      return code;
    }

    try {
      // Use execSync to run prettier as a separate process to avoid ESM issues
      const { execSync } = require('child_process');
      const { writeFileSync, readFileSync, unlinkSync } = require('fs');
      const { join, extname } = require('path');
      const { tmpdir } = require('os');

      // Determine the file extension to use for the temp file
      const fileExtension = extname(filepath) || '.txt';
      const tempPath = join(tmpdir(), `prettier-tmp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExtension}`);
      writeFileSync(tempPath, code, 'utf8');

      // Format the file using prettier CLI
      execSync(`npx prettier --write "${tempPath}" --single-quote --trailing-comma es5 --tab-width 2 --semi --print-width 80`, {
        stdio: 'pipe'
      });

      // Read the formatted content back
      const formattedCode = readFileSync(tempPath, 'utf8');

      // Clean up the temporary file
      unlinkSync(tempPath);

      return formattedCode;
    } catch (error) {
      console.warn(`Failed to format ${filepath} with Prettier:`, error);
      return code; // Return unformatted code if formatting fails
    }
  }

  /**
   * Gets the parser based on file extension
   */
  private getParserForFile(filepath: string): string {
    const ext = path.extname(filepath);
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.js':
      case '.jsx':
        return 'babel';
      case '.json':
        return 'json';
      case '.md':
        return 'markdown';
      default:
        return 'typescript';
    }
  }

  /**
   * Saves the generated documentation to a file
   */
  saveDocumentationToFile(documentation: string, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const formattedDocumentation = this.formatCode(documentation, outputPath);
    fs.writeFileSync(outputPath, formattedDocumentation, 'utf8');
  }

  /**
   * Saves the generated TypeScript types to a file
   */
  saveTypesToFile(types: string, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const formattedTypes = this.formatCode(types, outputPath);
    fs.writeFileSync(outputPath, formattedTypes, 'utf8');
  }

  /**
   * Saves the generated React hooks to files organized by tag
   */
  saveHooksByTag(hooksByTag: Map<string, { hooks: string, types: string }>, outputDir: string): void {
    const dir = outputDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    for (const [tag, { hooks, types }] of hooksByTag) {
      const tagDir = path.join(outputDir, toCamelCase(tag));
      if (!fs.existsSync(tagDir)) {
        fs.mkdirSync(tagDir, { recursive: true });
      }

      // Save hooks to hooks file
      const hooksFileName = path.join(tagDir, `${toCamelCase(tag)}.hooks.ts`);
      const formattedHooks = this.formatCode(hooks, hooksFileName);
      fs.writeFileSync(hooksFileName, formattedHooks, 'utf8');

      // Save types to types file
      if (types.trim()) { // Only save if there are types
        const typesFileName = path.join(tagDir, `${toCamelCase(tag)}.types.ts`);
        const formattedTypes = this.formatCode(types, typesFileName);
        fs.writeFileSync(typesFileName, formattedTypes, 'utf8');
      }
    }
  }
}