import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { SwaggerDoc, Parameter, HandlebarsContext } from '../types';
import { compileTemplate } from '../helpers/template.helpers';
import { convertTypeToTs, generateSingleTypeDefinition } from '../helpers/type.helpers';

// Define helper functions locally since we removed the helpers file
function toPascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toUpperCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
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
      const context: HandlebarsContext = {
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
      endpoints.forEach(({ path, method, endpointInfo }) => {
        const hookContent = this.generateReactQueryHook(path, method, endpointInfo, schemas);
        allHooks.push(hookContent);
      });

      context.hooks = allHooks;

      // Generate resources using specified templates
      let hooksContent = '';
      if (templatePaths.hooks) {
        try {
          // Add utility functions to context for use in templates
          context['camelCase'] = (str: string) => toCamelCase(str);
          context['pascalCase'] = (str: string) => toPascalCase(str);
          
          hooksContent = compileTemplate(templatePaths.hooks, context);
        } catch (error) {
          // If template doesn't exist or fails, fall back to default generation
          console.warn(`Failed to compile hooks template: ${templatePaths.hooks}`, error);
          // Use the existing method as fallback
          hooksContent = `// ${toPascalCase(tag)} API Hooks\n`;
          hooksContent += `import { useQuery, useMutation, useQueryClient } from 'react-query';\n`;
          hooksContent += `import axios from 'axios';\n`;
          
          if (context.hasImportTypes) {
            hooksContent += `import type { ${context.usedTypeNames.join(', ')} } from './${toCamelCase(tag)}.types';\n\n`;
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
        hooksContent = `// ${toPascalCase(tag)} API Hooks\n`;
        hooksContent += `import { useQuery, useMutation, useQueryClient } from 'react-query';\n`;
        hooksContent += `import axios from 'axios';\n`;
        
        if (context.hasImportTypes) {
          hooksContent += `import type { ${context.usedTypeNames.join(', ')} } from './${toCamelCase(tag)}.types';\n\n`;
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

    // Extract action name from operationId to create cleaner hook names
    // e.g. configController_updateConfig -> useUpdateConfig instead of useConfigController_updateConfig
    let hookName = `use${toPascalCase(operationId)}`;

    // Check if operationId follows pattern controller_action and simplify to action
    if (operationId.includes('_')) {
      const parts = operationId.split('_');
      if (parts.length >= 2) {
        // Use just the action part as the hook name
        hookName = `use${toPascalCase(parts[parts.length - 1])}`;
      }
    } else {
      // For operationIds without underscores, keep the original naming
      hookName = `use${toPascalCase(operationId)}`;
    }

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
            responseType = convertTypeToTs(responseSchema, schemas);
            break; // Use the first success response found
          }
        }
      }
    }

    // Generate request body parameter if needed
    let requestBodyType = 'any';
    if (method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete' && endpointInfo.requestBody) {
      const bodySchema = endpointInfo.requestBody.content?.['application/json']?.schema;
      if (bodySchema) {
        requestBodyType = convertTypeToTs(bodySchema, schemas);
      }
    }

    // Format the path for use in the code (handle path parameters) - without base URL
    const formattedPath = path.replace(/{(\w+)}/g, (_, param) => `\${params.${toCamelCase(param)}}`);

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
    const templatePath = pathModule.join(__dirname, '..', '..', 'templates', 'hooks', 'individual-hook.hbs');

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
}