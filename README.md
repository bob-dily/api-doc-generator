# jszy-swagger-doc-generator

A tool to generate frontend documentation, TypeScript types, and React Hooks from Swagger/OpenAPI JSON files.

## Features

- Fetches Swagger JSON from a URL or loads from a local file
- Generates comprehensive Markdown documentation
- Generates TypeScript type definitions from schemas
- Generates React Hooks for API endpoints, organized by tags
- Supports both Swagger 2.0 and OpenAPI 3.x specifications
- Handles API endpoints, parameters, request/response bodies, and responses
- All generated content automatically placed in `./generated` directory to keep your project clean
- Properly handles path and query parameters
- Generates proper TypeScript interfaces and type aliases
- Organizes generated code by API tags

## Installation

You can install this package globally to use it as a CLI tool:

```bash
npm install -g jszy-swagger-doc-generator
```

Or you can use it without installing with npx:

```bash
npx jszy-swagger-doc-generator
```

## Usage Examples

### Example 1: Generate docs from a local Swagger JSON file

1. First, make sure you have a swagger.json file in your project
2. Run the command:
```bash
jszy-swagger-doc-generator --input ./swagger.json
```
3. Check the generated documentation in `./generated/docs/api-documentation.md`

### Example 2: Generate from a live API endpoint

1. If your API is running and exposes Swagger JSON at `http://localhost:3000/api-docs-json`:
```bash
jszy-swagger-doc-generator --url http://localhost:3000/api-docs-json
```
2. All content will be generated in the `./generated` directory by default

### Example 3: Generate TypeScript types and React hooks

1. To generate TypeScript types and React hooks from your Swagger file:
```bash
jszy-swagger-doc-generator --input ./swagger.json --generate-types --generate-hooks
```
2. Generated files will be in:
   - TypeScript types: `./generated/types/`
   - React hooks: `./generated/hooks/`

### Example 4: Generate everything from a URL

1. Generate all documentation, types, and hooks from a live API:
```bash
jszy-swagger-doc-generator --url http://localhost:3000/api-docs-json --generate-types --generate-hooks
```
2. This will create all outputs in the `./generated` directory

## CLI Options

- `--url, -u`: URL to the Swagger JSON file
- `--input, -i`: Path to the local Swagger JSON file
- `--output, -o`: Output path for the generated documentation (default: ./generated/docs/api-documentation.md)
- `--generate-types`: Generate TypeScript type definitions
- `--generate-hooks`: Generate React hooks
- `--types-output`: Output directory for TypeScript types (default: ./generated/types)
- `--hooks-output`: Output directory for React hooks (default: ./generated/hooks)
- `--help`: Show help information

## Generated Output Structure

By default, all generated content goes to the `./generated` directory:

```
generated/
├── docs/
│   └── api-documentation.md
├── types/
│   └── [generated TypeScript types]
└── hooks/
    ├── user/
    ├── config/
    └── [other tags as directories]/
```

## Using Generated TypeScript Types

Once generated, the TypeScript types can be imported in your project:

```typescript
import { User, UserConfig } from './generated/types/your-api-types';

const user: User = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com'
};
```

## Using Generated React Hooks

The generated React hooks can be used in your React components:

```typescript
import { useUserController_queryUserInfo } from './generated/hooks/users/users.hooks';

function MyComponent() {
  const { userController_queryUserInfo } = useUserController_queryUserInfo();
  
  const fetchUser = async () => {
    const user = await userController_queryUserInfo({ id: 1 });
    console.log(user);
  };
  
  return <button onClick={fetchUser}>Fetch User</button>;
}
```

## Programmatic Usage

You can also use this package programmatically in your JavaScript/TypeScript code:

```javascript
const { SwaggerDocGenerator } = require('jszy-swagger-doc-generator');

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

## Development

To run this project locally:

1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Run `pnpm run build` to compile TypeScript
4. Run `pnpm run test` to run tests

## License

MIT