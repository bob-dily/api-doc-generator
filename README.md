# Swagger Documentation Generator

A tool to generate frontend documentation, TypeScript types, and React Hooks from Swagger/OpenAPI JSON files.

## Installation

You can install this package globally to use it as a CLI tool:

```bash
npm install -g swagger-doc-generator
```

Or you can use it without installing with npx:

```bash
npx swagger-doc-generator
```

## Usage

### Command Line Interface

The tool can be used from the command line to generate documentation, TypeScript types, or React Hooks from a Swagger JSON file:

#### Generate Documentation (Default)
```bash
# Generate documentation from a URL (output to ./generated/docs/api-documentation.md by default)
swagger-doc-generator --url https://petstore.swagger.io/v2/swagger.json

# Generate documentation from a local file (output to ./generated/docs/api-documentation.md by default)
swagger-doc-generator --input ./swagger.json

# Generate documentation and specify output file
swagger-doc-generator --url https://petstore.swagger.io/v2/swagger.json --output ./docs/api-documentation.md
```

#### Generate TypeScript Types
```bash
# Generate TypeScript types from a local file (output to ./generated/types/ by default)
swagger-doc-generator --input ./swagger.json --generate-types

# Generate TypeScript types with custom output directory
swagger-doc-generator --input ./swagger.json --generate-types --types-output ./src/types
```

#### Generate React Hooks
```bash
# Generate React hooks from a local file (output to ./generated/hooks/ by default)
swagger-doc-generator --input ./swagger.json --generate-hooks

# Generate React hooks with custom output directory
swagger-doc-generator --input ./swagger.json --generate-hooks --hooks-output ./src/hooks

# Generate both types and hooks (output to ./generated/ directories by default)
swagger-doc-generator --input ./swagger.json --generate-types --generate-hooks
```

#### Default Output Location
By default, all generated content is placed in the `./generated` directory to keep your project clean and separate generated content from source code:

- Documentation: `./generated/docs/api-documentation.md`
- TypeScript types: `./generated/types/`
- React hooks: `./generated/hooks/`

### Programmatic Usage

You can also use this package programmatically in your JavaScript/TypeScript code:

```javascript
const { SwaggerDocGenerator } = require('swagger-doc-generator');

async function generate() {
  const generator = new SwaggerDocGenerator();

  // Load from URL
  const swaggerDoc = await generator.fetchSwaggerJSON('https://api.example.com/swagger.json');

  // Or load from file
  // const swaggerDoc = generator.loadSwaggerFromFile('./swagger.json');

  // Generate documentation
  const documentation = generator.generateDocumentation(swaggerDoc);
  generator.saveDocumentationToFile(documentation, './docs/api-documentation.md');

  // Generate TypeScript types
  const types = generator.generateTypeDefinitions(swaggerDoc);
  generator.saveTypesToFile(types, './types/api-types.ts');

  // Generate React hooks organized by tags
  const hooksByTag = generator.generateReactHooks(swaggerDoc);
  generator.saveHooksByTag(hooksByTag, './hooks');
}

generate().catch(console.error);
```

## Options

- `--url, -u`: URL to the Swagger JSON file
- `--input, -i`: Path to the local Swagger JSON file
- `--output, -o`: Output path for the generated documentation (default: ./docs/api-documentation.md)
- `--generate-types`: Generate TypeScript type definitions
- `--generate-hooks`: Generate React hooks
- `--types-output`: Output directory for TypeScript types (default: ./types)
- `--hooks-output`: Output directory for React hooks (default: ./hooks)
- `--help`: Show help information

## Features

- Fetches Swagger JSON from a URL
- Loads Swagger JSON from a local file
- Generates comprehensive documentation in Markdown format
- Generates TypeScript type definitions from schemas
- Generates React Hooks for API endpoints, organized by tags
- Supports both Swagger 2.0 and OpenAPI 3.x specifications
- Handles API endpoints, parameters, request/response bodies, and responses
- Creates output directory if it doesn't exist
- Properly handles path and query parameters
- Generates proper TypeScript interfaces and type aliases
- Organizes generated code by API tags

## Example Output

### Generated TypeScript Types
```typescript
// Auto-generated TypeScript types from Swagger schema

export interface User {
  /** 用户ID */
  id: number;
  /** 用户名 */
  name: string;
  /** 用户邮箱 */
  email: string;
  /** 头像URL */
  avatar?: string;
}

export interface UserConfig {
  /** 用户ID */
  userId: number;
  /** 主题设置 */
  theme: "light" | "dark";
  /** 语言设置 */
  language: string;
  /** 通知设置 */
  notifications: NotificationSettings;
  /** 个性化设置 */
  preferences: Preferences;
}
```

### Generated React Hooks
```typescript
// Users API Hooks

export interface UserController_queryUserInfoParams {
  id?: number;
  name?: string;
}

export const useUserController_queryUserInfo = () => {
  const apiCall = async (params: UserController_queryUserInfoParams) => {
    const path = `${process.env.REACT_APP_API_BASE_URL || ''}/api/queryUserInfo`;
    const queryParams = new URLSearchParams();
    if (params.id) queryParams.append('id', params.id.toString());
    if (params.name) queryParams.append('name', params.name.toString());
    const queryString = queryParams.toString();
    const url = `${path}${queryString ? '?' + queryString : ''}`;
    const options: RequestInit = {
      method: 'GET',
    };

    const result = await fetch(url, options);
    return result.json() as Promise<User[]>;
  };

  return { userController_queryUserInfo: apiCall };
};
```

## Development

To run this project locally:

1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Run `pnpm run build` to compile TypeScript
4. Run `pnpm run test` to run tests

## License

MIT