/**
 * Converts OpenAPI types to TypeScript types
 */
export function convertTypeToTs(typeDef: any, schemaComponents: { [key: string]: any }): string {
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
      const inlineType = convertTypeToTs(inlineDef, schemaComponents);
      return `${refTypes.join(' & ')} & ${inlineType}`;
    } else if (refTypes.length > 0) {
      // Only references
      return refTypes.join(' & ');
    } else if (Object.keys(combinedProperties).length > 0) {
      // Only inline properties
      return convertTypeToTs({
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
        return convertTypeToTs(item, schemaComponents);
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
        return convertTypeToTs(item, schemaComponents);
      }
      return 'any';
    }).filter(Boolean).join(' | ') || 'any';
  }

  if (Array.isArray(typeDef.type)) {
    // Handle union types like ["string", "null"]
    if (typeDef.type.includes('null')) {
      const nonNullTypes = typeDef.type.filter((t: string) => t !== 'null');
      if (nonNullTypes.length === 1) {
        return `${convertTypeToTs({...typeDef, type: nonNullTypes[0]}, schemaComponents)} | null`;
      } else {
        // Handle complex union types with null
        const nonNullTypeStr = nonNullTypes
          .map((t: string) => convertTypeToTs({...typeDef, type: t}, schemaComponents))
          .join(' | ');
        return `${nonNullTypeStr} | null`;
      }
    }
    // Handle other array type unions
    return typeDef.type
      .map((t: string) => convertTypeToTs({...typeDef, type: t}, schemaComponents))
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
            const type = convertTypeToTs(propSchema, schemaComponents);
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
export function generateSingleTypeDefinition(typeName: string, schema: any, allSchemas: { [key: string]: any }): string {
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
        return convertTypeToTs(item, allSchemas);
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
        const inlineInterface = generateInlineObjectInterface(part, `${typeName}Inline`, allSchemas);
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
 * Generates an inline object interface for allOf composition
 */
export function generateInlineObjectInterface(schema: any, tempName: string, allSchemas: { [key: string]: any }): string {
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

    result += `    ${propName}${optional}: ${convertTypeToTs(propSchema, allSchemas)};\n`;
  });
  result += '  }';
  return result;
}