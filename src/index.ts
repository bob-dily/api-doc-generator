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
   * Generates React hooks from the paths in Swagger doc
   */
  generateReactHooks(swaggerDoc: SwaggerDoc): Map<string, string> {
    const hooksByTag = new Map<string, string>();
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

    // Generate hooks for each tag
    Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
      let tagContent = this.generateHeaderForTag(tag);

      // Generate all parameter interfaces for this tag first to avoid duplicates
      const allParamInterfaces: string[] = [];
      endpoints.forEach(({ path, method, endpointInfo }) => {
        const paramInterface = this.generateParamInterface(path, method, endpointInfo, schemas);
        if (paramInterface && !allParamInterfaces.includes(paramInterface)) {
          allParamInterfaces.push(paramInterface);
        }
      });

      // Add all unique parameter interfaces
      allParamInterfaces.forEach(interfaceCode => {
        tagContent += interfaceCode + '\n';
      });

      // Generate individual hooks
      endpoints.forEach(({ path, method, endpointInfo }) => {
        const hookContent = this.generateSingleHookWithUniqueName(path, method, endpointInfo, schemas);
        tagContent += hookContent + '\n';
      });

      hooksByTag.set(tag, tagContent);
    });

    return hooksByTag;
  }

  /**
   * Generates header content for a specific tag
   */
  generateHeaderForTag(tag: string): string {
    return `// ${toPascalCase(tag)} API Hooks\n\n`;
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
   * Generates a single React hook for an API endpoint with unique parameter interface
   */
  generateSingleHookWithUniqueName(path: string, method: string, endpointInfo: any, schemas: { [key: string]: any }): string {
    const operationId = endpointInfo.operationId || this.generateOperationId(path, method);
    const hookName = `use${toPascalCase(operationId)}`;

    // Use unique parameter interface name
    const pathParams = endpointInfo.parameters?.filter((p: Parameter) => p.in === 'path') || [];
    const queryParams = endpointInfo.parameters?.filter((p: Parameter) => p.in === 'query') || [];

    let paramsDeclaration = '';
    let paramsUsage = '{}';
    const hasParams = pathParams.length > 0 || queryParams.length > 0;

    if (hasParams) {
      const paramInterfaceName = `${toPascalCase(operationId)}Params`;
      paramsDeclaration = `params: ${paramInterfaceName}`;
      paramsUsage = 'params';
    }

    // Format the path for use in the code (handle path parameters)
    const pathWithParams = path.replace(/{(\w+)}/g, (_, param) => `\${params.${toCamelCase(param)}}`);

    // Determine response type
    let responseType = 'any';
    if (endpointInfo.responses && endpointInfo.responses['200']) {
      const responseSchema = endpointInfo.responses['200'].content?.['application/json']?.schema;
      if (responseSchema) {
        responseType = convertTypeToTs(responseSchema, schemas);
      }
    }

    // Generate request body parameter if needed
    let requestBodyParam = '';
    if (method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete' && endpointInfo.requestBody) {
      const bodySchema = endpointInfo.requestBody.content?.['application/json']?.schema;
      if (bodySchema) {
        const bodyType = convertTypeToTs(bodySchema, schemas);
        requestBodyParam = `, body: ${bodyType}`;
      }
    }

    // Create the hook function
    let hookCode = `export const ${hookName} = () => {\n`;
    hookCode += `  const apiCall = async (${paramsDeclaration}${requestBodyParam ? requestBodyParam : ''}) => {\n`;
    hookCode += `    const path = \`\${process.env.REACT_APP_API_BASE_URL || ''}${pathWithParams}\`;\n`;

    // Add query parameters
    if (endpointInfo.parameters && endpointInfo.parameters.some((p: Parameter) => p.in === 'query')) {
      hookCode += `    const queryParams = new URLSearchParams();\n`;
      endpointInfo.parameters.forEach((param: Parameter) => {
        if (param.in === 'query') {
          hookCode += `    if (params.${toCamelCase(param.name)}) queryParams.append('${param.name}', params.${toCamelCase(param.name)}.toString());\n`;
        }
      });
      hookCode += `    const queryString = queryParams.toString();\n`;
      hookCode += `    const url = \`\${path}\${queryString ? '?' + queryString : ''}\`;\n`;
    } else {
      hookCode += `    const url = path;\n`;
    }

    // Add fetch options
    hookCode += `    const options: RequestInit = {\n`;
    hookCode += `      method: '${method.toUpperCase()}',\n`;

    if (requestBodyParam) {
      hookCode += `      headers: {\n        'Content-Type': 'application/json',\n      },\n`;
      hookCode += `      body: JSON.stringify(body),\n`;
    }

    hookCode += `    };\n\n`;
    hookCode += `    const result = await fetch(url, options);\n`;
    hookCode += `    return result.json() as Promise<${responseType}>;\n`;
    hookCode += `  };\n\n`;
    hookCode += `  return { ${toCamelCase(operationId)}: apiCall };\n`;
    hookCode += `};\n`;

    return hookCode;
  }

  /**
   * Generates a single React hook for an API endpoint
   */
  generateSingleHook(path: string, method: string, endpointInfo: any, schemas: { [key: string]: any }): string {
    // This method is kept for backward compatibility
    return this.generateSingleHookWithUniqueName(path, method, endpointInfo, schemas);
  }

  /**
   * Generate operation ID from path and method if not provided
   */
  generateOperationId(path: string, method: string): string {
    return `${method.toLowerCase()}_${path.replace(/[\/{}]/g, '_')}`;
  }

  /**
   * Saves the generated documentation to a file
   */
  saveDocumentationToFile(documentation: string, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, documentation, 'utf8');
  }

  /**
   * Saves the generated TypeScript types to a file
   */
  saveTypesToFile(types: string, outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, types, 'utf8');
  }

  /**
   * Saves the generated React hooks to files organized by tag
   */
  saveHooksByTag(hooksByTag: Map<string, string>, outputDir: string): void {
    const dir = outputDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    for (const [tag, content] of hooksByTag) {
      const tagDir = path.join(outputDir, toCamelCase(tag));
      if (!fs.existsSync(tagDir)) {
        fs.mkdirSync(tagDir, { recursive: true });
      }

      const fileName = path.join(tagDir, `${toCamelCase(tag)}.hooks.ts`);
      fs.writeFileSync(fileName, content, 'utf8');
    }
  }
}