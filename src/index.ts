import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { compileTemplate } from './helpers/template.helpers';
import { generateSingleTypeDefinition } from './helpers/type.helpers';

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

export class SwaggerDocGenerator {
  /**
   * Transforms a string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toUpperCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  /**
   * Transforms a string to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }
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
   * Generates React hooks from the paths in Swagger doc organized by tag
   */

  /**
   * Converts OpenAPI types to TypeScript types
   */
  private convertTypeToTs(typeDef: any, schemaComponents: { [key: string]: any }): string {
    if (!typeDef) return 'any';

    if (typeDef.$ref) {
      // Extract the type name from the reference
      const refTypeName = typeDef.$ref.split('/').pop();
      return refTypeName || 'any';
    }

    // Handle allOf (used for composition/references) - combine all properties
    if (typeDef.allOf && Array.isArray(typeDef.allOf)) {
      const combinedProperties: any = {};
      const refTypes: string[] = [];

      for (const item of typeDef.allOf) {
        if (item.$ref) {
          // Extract the type name from the reference
          const refTypeName = item.$ref.split('/').pop();
          if (refTypeName) {
            refTypes.push(refTypeName);
          }
        } else if (item.type === 'object' && item.properties) {
          // Combine properties from inline object definitions
          Object.assign(combinedProperties, item.properties);
        }
      }

      if (refTypes.length > 0 && Object.keys(combinedProperties).length > 0) {
        // We have both references and inline properties
        const inlineDef = {
          type: 'object',
          properties: combinedProperties,
          required: typeDef.required
        };
        const inlineType = this.convertTypeToTs(inlineDef, schemaComponents);
        return `${refTypes.join(' & ')} & ${inlineType}`;
      } else if (refTypes.length > 0) {
        // Only references
        return refTypes.join(' & ');
      } else if (Object.keys(combinedProperties).length > 0) {
        // Only inline properties
        return this.convertTypeToTs({
          type: 'object',
          properties: combinedProperties,
          required: typeDef.required
        }, schemaComponents);
      } else {
        return 'any';
      }
    }

    // Handle oneOf (union types)
    if (typeDef.oneOf && Array.isArray(typeDef.oneOf)) {
      return typeDef.oneOf.map((item: any) => {
        if (item.$ref) {
          return item.$ref.split('/').pop();
        } else if (item.type) {
          return this.convertTypeToTs(item, schemaComponents);
        }
        return 'any';
      }).filter(Boolean).join(' | ') || 'any';
    }

    // Handle anyOf (union types)
    if (typeDef.anyOf && Array.isArray(typeDef.anyOf)) {
      return typeDef.anyOf.map((item: any) => {
        if (item.$ref) {
          return item.$ref.split('/').pop();
        } else if (item.type) {
          return this.convertTypeToTs(item, schemaComponents);
        }
        return 'any';
      }).filter(Boolean).join(' | ') || 'any';
    }

    if (Array.isArray(typeDef.type)) {
      // Handle union types like ["string", "null"]
      if (typeDef.type.includes('null')) {
        const nonNullTypes = typeDef.type.filter((t: string) => t !== 'null');
        if (nonNullTypes.length === 1) {
          return `${this.convertTypeToTs({...typeDef, type: nonNullTypes[0]}, schemaComponents)} | null`;
        } else {
          // Handle complex union types with null
          const nonNullTypeStr = nonNullTypes
            .map((t: string) => this.convertTypeToTs({...typeDef, type: t}, schemaComponents))
            .join(' | ');
          return `${nonNullTypeStr} | null`;
        }
      }
      // Handle other array type unions
      return typeDef.type
        .map((t: string) => this.convertTypeToTs({...typeDef, type: t}, schemaComponents))
        .join(' | ') || 'any';
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
          return `${this.convertTypeToTs(typeDef.items, schemaComponents)}[]`;
        }
        return 'any[]';
      case 'object':
        if (typeDef.properties) {
          // Inline object definition
          const fields = Object.entries(typeDef.properties)
            .map(([propName, propSchema]: [string, any]) => {
              const required = typeDef.required && typeDef.required.includes(propName);
              const optional = !required ? '?' : '';
              const type = this.convertTypeToTs(propSchema, schemaComponents);
              // Get the description for JSDoc if available
              const propDescription = propSchema.description || propSchema.title;
              const jsDoc = propDescription ? `    /** ${propDescription} */\n` : '';
              return `${jsDoc}    ${propName}${optional}: ${type};`;
            })
            .join('\n');
          return `{\n${fields}\n  }`;
        }
        return 'Record<string, any>';
      case 'null':
        return 'null';
      default:
        return 'any';
    }
  }

  /**
   * Generates a single TypeScript type definition
   */
  generateSingleTypeDefinition(typeName: string, schema: any, allSchemas: { [key: string]: any }): string {
    if (schema.enum) {
      // Enum type
      return `export type ${typeName} = ${schema.enum.map((val: any) => `'${val}'`).join(' | ')};\n`;
    }

    if (schema.oneOf || schema.anyOf) {
      // Union type or complex type (oneOf/anyOf)
      const typeOption = schema.oneOf ? 'oneOf' : 'anyOf';
      const types = schema[typeOption].map((item: any) => {
        if (item.$ref) {
          return item.$ref.split('/').pop();
        } else if (item.type) {
          return this.convertTypeToTs(item, allSchemas);
        } else {
          return 'any';
        }
      }).filter(Boolean);
      return `export type ${typeName} = ${types.join(' | ')};\n`;
    }

    if (schema.allOf) {
      // Handle allOf - composition of multiple schemas
      const allParts: string[] = [];
      for (const part of schema.allOf) {
        if (part.$ref) {
          const refTypeName = part.$ref.split('/').pop();
          if (refTypeName) {
            allParts.push(refTypeName);
          }
        } else if (part.type === 'object' && part.properties) {
          // Create a temporary interface for inline object
          const inlineInterface = this.generateInlineObjectInterface(part, `${typeName}Inline`, allSchemas);
          allParts.push(inlineInterface);
        }
      }
      return `export type ${typeName} = ${allParts.join(' & ')};\n`;
    }

    if (schema.type === 'object') {
      // Object type
      let result = `export interface ${typeName} {\n`;

      if (schema.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
          const required = schema.required && schema.required.includes(propName);
          const optional = !required ? '?' : '';

          // Add JSDoc comment if available (using title or description)
          const jsDoc = propSchema.title || propSchema.description;
          if (jsDoc) {
            result += `  /** ${jsDoc} */\n`;
          }

          result += `  ${propName}${optional}: ${this.convertTypeToTs(propSchema, allSchemas)};\n`;
        });
      }

      result += '}\n';
      return result;
    }

    // For other types (string, number, etc.) that might have additional properties
    return `export type ${typeName} = ${this.convertTypeToTs(schema, allSchemas)};\n`;
  }

  /**
   * Generates an inline object interface for allOf composition
   */
  private generateInlineObjectInterface(schema: any, tempName: string, allSchemas: { [key: string]: any }): string {
    if (!schema.properties) return 'any';

    let result = '{\n';
    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
      const required = schema.required && schema.required.includes(propName);
      const optional = !required ? '?' : '';

      // Add JSDoc comment if available (using title or description)
      const jsDoc = propSchema.title || propSchema.description;
      if (jsDoc) {
        result += `    /** ${jsDoc} */\n`;
      }

      result += `    ${propName}${optional}: ${this.convertTypeToTs(propSchema, allSchemas)};\n`;
    });
    result += '  }';
    return result;
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

      // Generate hooks first to determine which types are actually used by hooks
      const allHookContents: string[] = [];
      const hookTypesUsed = new Set<string>(); // Track types used by hooks specifically

      for (const { path, method, endpointInfo } of endpoints) {
        // Determine response type for this specific endpoint
        let responseType = 'any';
        if (endpointInfo.responses) {
          const successCodes = ['200', '201', '204', '202', '203', '205'];
          for (const code of successCodes) {
            if (endpointInfo.responses[code]) {
              const responseSchema = endpointInfo.responses[code].content?.['application/json']?.schema;
              if (responseSchema) {
                responseType = this.convertTypeToTs(responseSchema, schemas);
                this.extractTypeNamesFromType(responseType, hookTypesUsed, schemas);
                break;
              }
            }
          }
        }

        // Determine request body type for this specific endpoint
        let requestBodyType = 'any';
        if (method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete' && endpointInfo.requestBody) {
          const bodySchema = endpointInfo.requestBody.content?.['application/json']?.schema;
          if (bodySchema) {
            requestBodyType = this.convertTypeToTs(bodySchema, schemas);
            this.extractTypeNamesFromType(requestBodyType, hookTypesUsed, schemas);
          }
        }

        // Generate the hook content
        const hookContent = this.generateReactQueryHook(path, method, endpointInfo, schemas);
        allHookContents.push(hookContent);
      }

      // Generate parameter interfaces for this tag (need this before content analysis)
      const allParamInterfaces: string[] = [];
      endpoints.forEach(({ path, method, endpointInfo }) => {
        const paramInterface = this.generateParamInterface(path, method, endpointInfo, schemas);
        if (paramInterface && !allParamInterfaces.includes(paramInterface)) {
          allParamInterfaces.push(paramInterface);
        }
      });

      // Extract type names from parameter interfaces and add to hookTypesUsed
      for (const interfaceCode of allParamInterfaces) {
        // Extract the parameter interface name from the export interface line
        const interfaceNameMatch = interfaceCode.match(/export interface (\w+)/);
        if (interfaceNameMatch && interfaceNameMatch[1]) {
          // Add the parameter interface name to the types that will be generated
          hookTypesUsed.add(interfaceNameMatch[1]);
        }

        // Also extract any custom type references within the interface
        const propertyMatches = interfaceCode.match(/[a-zA-Z_$][a-zA-Z0-9_$]*\??\s*:\s*[^;]+/g);
        if (propertyMatches) {
          for (const property of propertyMatches) {
            // Extract the type part (after the colon)
            const colonIndex = property.indexOf(':');
            if (colonIndex !== -1) {
              let typePart = property.substring(colonIndex + 1).trim();
              // Remove trailing semicolon if present
              if (typePart.endsWith(';')) {
                typePart = typePart.slice(0, -1).trim();
              }
              // Extract type names from this type string
              this.extractTypeNamesFromType(typePart, hookTypesUsed, schemas);
            }
          }
        }
      }

      // Add parameter interfaces to types content as well
      let typesContentWithParamInterfaces = typesContent;
      for (const interfaceCode of allParamInterfaces) {
        typesContentWithParamInterfaces += interfaceCode + '\n';
      }

      // Add the generated hooks to hooksContent first
      let fullHooksContent = hooksContent; // Start with the header
      fullHooksContent += `import { useQuery, useMutation, useQueryClient } from 'react-query';\n`;
      fullHooksContent += `import axios from 'axios';\n`;

      // Add type import statement with all potentially used types first
      if (hookTypesUsed.size > 0) {
        fullHooksContent += `import type { ${Array.from(hookTypesUsed).join(', ')} } from './${toCamelCase(tag)}.types';\n\n`;
      } else {
        fullHooksContent += `\n`;
      }

      // Add all hook contents to full content for analysis (parameter interfaces are not part of this for analysis)
      allHookContents.forEach(hookCode => {
        fullHooksContent += hookCode + '\n';
      });

      // Now analyze the complete generated content to determine which imports are actually used
      // Analyze react-query functions usage
      const usedReactQueryFunctions = new Set<string>();
      if (fullHooksContent.includes('useQuery(')) {
        usedReactQueryFunctions.add('useQuery');
      }
      if (fullHooksContent.includes('useMutation(')) {
        usedReactQueryFunctions.add('useMutation');
      }
      if (fullHooksContent.includes('useQueryClient()') || fullHooksContent.includes('queryClient.')) {
        usedReactQueryFunctions.add('useQueryClient');
      }

      // Analyze type imports usage by checking if each type name appears in the content
      const usedTypes = new Set<string>();
      for (const type of hookTypesUsed) {
        // Check if the type name appears in the content (not as part of another type name)
        // Use word boundary matching to avoid partial matches
        const regex = new RegExp(`\\b${type}\\b`, 'g');
        if (regex.test(fullHooksContent)) {
          usedTypes.add(type);
        }
      }

      // Rebuild hooks content with only the actually used imports
      hooksContent = `// ${toPascalCase(tag)} API Hooks\n`;

      // Add react-query import statement with only the functions that are actually used
      const reactQueryImports = Array.from(usedReactQueryFunctions).sort();
      if (reactQueryImports.length > 0) {
        hooksContent += `import { ${reactQueryImports.join(', ')} } from 'react-query';\n`;
      }
      hooksContent += `import axios from 'axios';\n`;

      // Add type import statement only if there are types to import
      if (usedTypes.size > 0) {
        hooksContent += `import type { ${Array.from(usedTypes).join(', ')} } from './${toCamelCase(tag)}.types';\n\n`;
      } else {
        hooksContent += `\n`;
      }

      // Add all hook contents (parameter interfaces are now in the types file)
      allHookContents.forEach(hookCode => {
        hooksContent += hookCode + '\n';
      });

      // Update the types content to include parameter interfaces
      typesContent = typesContentWithParamInterfaces;

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
   * Extract type names from a TypeScript type string
   */
  private extractTypeNamesFromType(typeStr: string, typeSet: Set<string>, allSchemas: { [key: string]: any }): void {
    if (!typeStr) return;

    // Remove spaces to make pattern matching easier
    let cleanType = typeStr.replace(/\s+/g, '');

    // Handle union types (A|B|C) - split and process each part
    if (cleanType.includes('|')) {
      const parts = cleanType.split('|');
      parts.forEach(part => this.extractTypeNamesFromType(part.trim(), typeSet, allSchemas));
      return;
    }

    // Handle array types (Type[] or Array<Type>)
    if (cleanType.endsWith('[]')) {
      const arrayType = cleanType.slice(0, -2);
      this.extractTypeNamesFromType(arrayType, typeSet, allSchemas);
      return;
    }

    if (cleanType.startsWith('Array<')) {
      const startIndex = 'Array<'.length;
      const endIndex = cleanType.lastIndexOf('>');
      if (endIndex > startIndex) {
        const arrayType = cleanType.substring(startIndex, endIndex);
        this.extractTypeNamesFromType(arrayType, typeSet, allSchemas);
      }
      return;
    }

    // Handle intersection types (A&B)
    if (cleanType.includes('&')) {
      const parts = cleanType.split('&');
      parts.forEach(part => this.extractTypeNamesFromType(part.trim(), typeSet, allSchemas));
      return;
    }

    // Handle generic types like Promise<Type>
    if (cleanType.includes('<') && cleanType.includes('>')) {
      const bracketIndex = cleanType.indexOf('<');
      const genericType = cleanType.substring(0, bracketIndex);
      // Add the generic type if it exists in schemas
      if (allSchemas[genericType]) {
        typeSet.add(genericType);
      }
      // Extract and process the type argument
      const contentStart = bracketIndex + 1;
      const contentEnd = cleanType.lastIndexOf('>');
      if (contentEnd > contentStart) {
        const typeArg = cleanType.substring(contentStart, contentEnd);
        this.extractTypeNamesFromType(typeArg, typeSet, allSchemas);
      }
      return;
    }

    // Check if this is a simple type name that exists in schemas
    if (allSchemas[typeStr.trim()]) {
      typeSet.add(typeStr.trim());
    } else if (allSchemas[cleanType]) {
      typeSet.add(cleanType);
    }
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

    // Extract action name from operationId to create cleaner parameter interface names
    // e.g. configController_updateConfig -> UpdateConfigParams instead of ConfigController_updateConfigParams
    let interfaceName: string;
    if (operationId.includes('_')) {
      const parts = operationId.split('_');
      if (parts.length >= 2) {
        // Use just the action part in the interface name
        interfaceName = `${toPascalCase(parts[parts.length - 1])}Params`;
      } else {
        interfaceName = `${toPascalCase(operationId)}Params`;
      }
    } else {
      interfaceName = `${toPascalCase(operationId)}Params`;
    }

    let paramsInterface = `export interface ${interfaceName} {\n`;

    // Add path parameters
    pathParams.forEach((param: Parameter) => {
      const required = param.required ? '' : '?';
      const type = this.convertTypeToTs(param.schema || {}, schemas);
      paramsInterface += `  ${this.toCamelCase(param.name)}${required}: ${type};\n`;
    });

    // Add query parameters
    queryParams.forEach((param: Parameter) => {
      const required = param.required ? '' : '?';
      const type = this.convertTypeToTs(param.schema || {}, schemas);
      paramsInterface += `  ${this.toCamelCase(param.name)}${required}: ${type};\n`;
    });

    paramsInterface += '}\n';
    return paramsInterface;
  }

  /**
   * Generates a React Query hook using axios
   */
  generateReactQueryHook(path: string, method: string, endpointInfo: any, schemas: { [key: string]: any }): string {
    const operationId = endpointInfo.operationId || this.generateOperationId(path, method);

    // Extract action name from operationId to create cleaner hook names
    // e.g. configController_updateConfig -> useUpdateConfig instead of useConfigController_updateConfig
    let hookName = `use${this.toPascalCase(operationId)}`;

    // Check if operationId follows pattern controller_action and simplify to action
    if (operationId.includes('_')) {
      const parts = operationId.split('_');
      if (parts.length >= 2) {
        // Use just the action part as the hook name
        hookName = `use${this.toPascalCase(parts[parts.length - 1])}`;
      }
    } else {
      // For operationIds without underscores, keep the original naming
      hookName = `use${this.toPascalCase(operationId)}`;
    }

    const hookType = method.toLowerCase() === 'get' ? 'useQuery' : 'useMutation';

    // Use unique parameter interface name
    const pathParams = endpointInfo.parameters?.filter((p: Parameter) => p.in === 'path') || [];
    const queryParams = endpointInfo.parameters?.filter((p: Parameter) => p.in === 'query') || [];

    // Determine response type by checking common success response codes
    let responseType = 'any';
    if (endpointInfo.responses) {
      // Check for success responses in order of preference: 200, 201, 204, etc.
      const successCodes = ['200', '201', '204', '202', '203', '205'];
      for (const code of successCodes) {
        if (endpointInfo.responses[code]) {
          const responseSchema = endpointInfo.responses[code].content?.['application/json']?.schema;
          if (responseSchema) {
            responseType = this.convertTypeToTs(responseSchema, schemas);
            break; // Use the first success response found
          }
        }
      }
    }

    // Generate request body parameter if needed
    let requestBodyType = 'any';
    let hasBody = false;
    if (method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete' && endpointInfo.requestBody) {
      const bodySchema = endpointInfo.requestBody.content?.['application/json']?.schema;
      if (bodySchema) {
        requestBodyType = this.convertTypeToTs(bodySchema, schemas);
        hasBody = true;
      }
    }

    // Format the path for use in the code (handle path parameters) - without base URL
    const formattedPath = path.replace(/{(\w+)}/g, (_, param) => `\${params.${this.toCamelCase(param)}}`);

    // Prepare data for the template
    const hookData = {
      hookName: hookName,
      operationId: operationId,
      method: method.toLowerCase(),
      responseType: responseType,
      requestBodyType: requestBodyType,
      hasParams: pathParams.length > 0 || queryParams.length > 0,
      hasPathParams: pathParams.length > 0,
      paramInterfaceName: `${hookName.replace('use', '')}Params`,
      formattedPath: formattedPath,
      isGetRequest: method.toLowerCase() === 'get'
    };

    // Load and compile the individual hook template
    const fs = require('fs');
    const pathModule = require('path');
    const templatePath = pathModule.join(__dirname, '..', 'templates', 'hooks', 'individual-hook.hbs');

    try {
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const Handlebars = require('handlebars');
      const template = Handlebars.compile(templateSource);
      return template(hookData);
    } catch (error: any) {
      console.error(`Error reading template file: ${error.message}`);
      return `// Error generating hook for ${operationId}: ${error.message}`;
    }
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

  /**
   * Generates frontend resources using Handlebars templates
   */
  generateHandlebarsResources(swaggerDoc: SwaggerDoc, templatePaths: {
    hooks?: string,
    types?: string,
    components?: string,
    pages?: string
  } = {}): Map<string, { hooks: string, types: string }> {
    const resourcesByTag = new Map<string, { hooks: string, types: string }>();
    const schemas = swaggerDoc.components?.schemas || {};

    // Group endpoints by tag
    const endpointsByTag: { [tag: string]: Array<{ path: string, method: string, endpointInfo: any }> } = {};

    Object.entries(swaggerDoc.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, endpointInfo]: [string, any]) => {
        // Determine the tag for this endpoint
        const tag = (endpointInfo.tags && endpointInfo.tags[0]) ? endpointInfo.tags[0] : 'General';

        if (!endpointsByTag[tag]) {
          endpointsByTag[tag] = [];
        }
        endpointsByTag[tag].push({ path, method, endpointInfo });
      });
    });

    // Generate resources for each tag
    Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
      // Prepare context for templates
      const context: any = {
        title: swaggerDoc.info.title,
        description: swaggerDoc.info.description || swaggerDoc.info.title,
        version: swaggerDoc.info.version,
        tag: tag,
        endpoints: endpoints.map(e => ({
          path: e.path,
          method: e.method.toUpperCase(),
          operationId: e.endpointInfo.operationId || this.generateOperationId(e.path, e.method),
          summary: e.endpointInfo.summary,
          description: e.endpointInfo.description,
          parameters: e.endpointInfo.parameters || [],
          responses: e.endpointInfo.responses,
          requestBody: e.endpointInfo.requestBody
        })),
        schemas: schemas,
        hasImportTypes: false,
        usedTypeNames: [] as string[],
        paramInterfaces: [] as string[],
        hooks: [] as string[],
        typeDefinitions: [] as string[]
      };

      // Find types used in this tag
      const directlyUsedSchemas = new Set<string>();
      if (schemas) {
        Object.entries(schemas).forEach(([typeName, schema]) => {
          if (this.isSchemaUsedInEndpoints(typeName, endpoints, schemas)) {
            directlyUsedSchemas.add(typeName);
          }
        });
      }

      const allNeededSchemas = this.findAllReferencedSchemas(directlyUsedSchemas, schemas);

      // Generate TypeScript types
      let typesContent = '';
      if (schemas) {
        for (const typeName of allNeededSchemas) {
          const schema = schemas[typeName];
          if (schema) {
            const typeDef = generateSingleTypeDefinition(typeName, schema, schemas);
            typesContent += typeDef + '\n';
            context.typeDefinitions.push(typeDef);
          }
        }
      }

      // Check if there are used types for import
      if (allNeededSchemas.size > 0) {
        context.hasImportTypes = true;
        context.usedTypeNames = Array.from(allNeededSchemas);
      }

      // Generate parameter interfaces
      const allParamInterfaces: string[] = [];
      endpoints.forEach(({ path, method, endpointInfo }) => {
        const paramInterface = this.generateParamInterface(path, method, endpointInfo, schemas);
        if (paramInterface && !allParamInterfaces.includes(paramInterface)) {
          allParamInterfaces.push(paramInterface);
        }
      });

      context.paramInterfaces = allParamInterfaces;

      // Generate individual hooks
      const allHooks: string[] = [];
      const endpointHookContents: string[] = [];
      endpoints.forEach(({ path, method, endpointInfo }) => {
        const hookContent = this.generateReactQueryHook(path, method, endpointInfo, schemas);
        allHooks.push(hookContent);
        endpointHookContents.push(hookContent); // Store for template context
      });

      context.hooks = allHooks;
      context.endpointHooks = endpointHookContents;

      // Generate resources using specified templates
      let hooksContent = '';
      if (templatePaths.hooks) {
        try {
          // Add utility functions to context for use in templates
          context['camelCase'] = (str: string) => this.toCamelCase(str);
          context['pascalCase'] = (str: string) => this.toPascalCase(str);

          hooksContent = compileTemplate(templatePaths.hooks, context);
        } catch (error) {
          // If template doesn't exist or fails, fall back to default generation
          console.warn(`Failed to compile hooks template: ${templatePaths.hooks}`, error);
          // Use the existing method as fallback
          hooksContent = `// ${this.toPascalCase(tag)} API Hooks\n`;
          hooksContent += `import { useQuery, useMutation, useQueryClient } from 'react-query';\n`;
          hooksContent += `import axios from 'axios';\n`;

          if (context.hasImportTypes) {
            hooksContent += `import type { ${context.usedTypeNames.join(', ')} } from './${this.toCamelCase(tag)}.types';\n\n`;
          } else {
            hooksContent += `\n`;
          }

          allParamInterfaces.forEach(interfaceCode => {
            hooksContent += interfaceCode + '\n';
          });

          allHooks.forEach(hookCode => {
            hooksContent += hookCode + '\n';
          });
        }
      } else {
        // Default generation if no template is provided
        hooksContent = `// ${this.toPascalCase(tag)} API Hooks\n`;
        hooksContent += `import { useQuery, useMutation, useQueryClient } from 'react-query';\n`;
        hooksContent += `import axios from 'axios';\n`;

        if (context.hasImportTypes) {
          hooksContent += `import type { ${context.usedTypeNames.join(', ')} } from './${this.toCamelCase(tag)}.types';\n\n`;
        } else {
          hooksContent += `\n`;
        }

        allParamInterfaces.forEach(interfaceCode => {
          hooksContent += interfaceCode + '\n';
        });

        allHooks.forEach(hookCode => {
          hooksContent += hookCode + '\n';
        });
      }

      resourcesByTag.set(tag, {
        hooks: hooksContent,
        types: typesContent
      });
    });

    return resourcesByTag;
  }
}