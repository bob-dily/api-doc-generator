# Swagger API SDK Generator

A powerful tool to generate TypeScript React SDK from OpenAPI/Swagger specifications using Handlebars templates. This tool creates organized hooks and types organized by API tags to provide a structured way to consume APIs in frontend applications.

## Features

- ✨ **Handlebars-powered Templates**: Fully customizable using Handlebars template engine
- 🏷️ **Tag-based Organization**: Generates separate files organized by OpenAPI tags
- 🔗 **React Query Integration**: Creates ready-to-use React Query hooks with axios
- 📝 **TypeSafe**: Generates TypeScript types from OpenAPI schemas
- 🛠️ **Modular**: Clean separation between hooks and types per tag
- 📦 **Tree-shakable**: Import only the hooks and types you need
- 🎨 **Customizable**: Use your own Handlebars templates
- 🚀 **Modern**: Built for React 18+ ecosystem

## Prerequisites

This tool is designed to work with projects that use:

- **React** (v16.8+) - For React hooks functionality
- **React Query** (React Query v3 or TanStack Query v4+) - For data fetching and caching
- **Axios** - For HTTP requests
- **TypeScript** - For type safety
- **OpenAPI/Swagger** - Specification format for your API documentation

## Installation

As a development dependency:

```bash
npm install --save-dev jszy-swagger-doc-generator
# or
yarn add -D jszy-swagger-doc-generator
# or
pnpm add -D jszy-swagger-doc-generator
```

Or use without installing:

```bash
npx jszy-swagger-doc-generator [options]
```

You can also define script commands in your `package.json`:

```json
{
  "scripts": {
    "generate:auto": "api-sdk --url https://api.example.com/swagger.json",
    "generate:sdk": "api-sdk --url https://api.example.com/swagger.json --generate-hooks --generate-types --hooks-output ./src/api --types-output ./src/types",
    "generate:sdk:local": "api-sdk --input ./swagger.json --generate-hooks --generate-types --hooks-output ./src/api --types-output ./src/types",
  }
}
```

Then run:
```bash
npm run generate:sdk
# or
npm run generate:sdk:local
# or
npm run generate:auto
```

## Quick Start

### 1. Generate SDK from API Documentation

The simplest way is to use the auto-generate command that automatically creates all content from your API specification:

```bash
# Auto-generate everything from a local OpenAPI JSON file
npx jszy-swagger-doc-generator --input path/to/swagger.json

# Or auto-generate everything from a URL
npx jszy-swagger-doc-generator --url https://api.example.com/swagger.json
```

This will automatically:
- Generate TypeScript types for all schemas
- Generate React Query hooks for all API endpoints
- Organize everything by API tags in separate folders
- Place generated content in `./generated/hooks` and `./generated/types`

### 2. Advanced Generation

If you want more control, you can specify individual generation options:

```bash
# Generate only hooks from a local OpenAPI JSON file
npx jszy-swagger-doc-generator --input path/to/swagger.json --generate-hooks --hooks-output ./src/api/generated

# Generate only types from a local OpenAPI JSON file
npx jszy-swagger-doc-generator --input path/to/swagger.json --generate-types --types-output ./src/types/generated

# Generate both hooks and types from a URL
npx jszy-swagger-doc-generator --url https://api.example.com/swagger.json --generate-hooks --generate-types --hooks-output ./src/api/generated --types-output ./src/types/generated
```

### 2. Generated Structure

The tool generates a clean structure organized by tags:

```
src/api/generated/
├── user/
│   ├── user.hooks.ts
│   └── user.types.ts
├── product/
│   ├── product.hooks.ts
│   └── product.types.ts
└── order/
    ├── order.hooks.ts
    └── order.types.ts
```

### 3. Using Generated Hooks

Import and use the generated hooks in your React components:

```react
import { useGetUsers, useCreateUser } from '@/api/generated/user/user.hooks';
import { User, UserCreate } from '@/api/generated/user/user.types';

const UserList: React.FC = () => {
  const { data: users, isLoading, error } = useGetUsers({
    page: 1,
    limit: 10
  });

  const { mutate: createUser, isLoading: isCreating } = useCreateUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}

      <button
        onClick={() => createUser({ name: 'New User', email: 'new@example.com' })}
        disabled={isCreating}
      >
        {isCreating ? 'Creating...' : 'Create User'}
      </button>
    </div>
  );
};
```

## Configuration Options

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url, -u <url>` | URL to the OpenAPI JSON file | - |
| `--input, -i <path>` | Path to the local OpenAPI JSON file | - |
| `--generate-hooks` | Generate React hooks | `false` |
| `--generate-types` | Generate TypeScript types | `false` |
| `--handlebars-templates` | Use Handlebars templates for generation | `false` |
| `--hooks-output` | Output directory for hooks | `./generated/hooks` |
| `--types-output` | Output directory for types | `./generated/types` |
| `--help` | Show help information | - |

### Supported OpenAPI Features

The generator supports:
- All OpenAPI 3.0/3.1 features
- `allOf`, `anyOf`, `oneOf` compositions
- Complex nested objects
- Enums and unions
- Array types
- Parameter and response schemas
- Tag-based organization
- Operation IDs for hook names

## Template Customization

You can customize the generated code by modifying the Handlebars templates located in:
- `templates/hooks/individual-hook.hbs` - Individual hook templates
- `templates/hooks/react-hook.hbs` - Main hooks file template
- `templates/types/type-definition.hbs` - Type definitions template

Example hook template:
```handlebars
{{#if isGetRequest}}
  {{#if hasParams}}
export const {{hookName}} = (params: {{paramInterfaceName}}) => {
  return useQuery({
    queryKey: ['{{operationId}}', params],
    queryFn: async () => {
      const response = await axios.get<{{responseType}}>(`{{{formattedPath}}}`, { params });
      return response.data;
    },
  });
};
  {{else}}
export const {{hookName}} = () => {
  return useQuery({
    queryKey: ['{{operationId}}'],
    queryFn: async () => {
      const response = await axios.get<{{responseType}}>(`{{{formattedPath}}}`);
      return response.data;
    },
  });
};
  {{/if}}
{{else}}
  {{#if hasPathParams}}
export const {{hookName}} = (params: {{paramInterfaceName}}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {{requestBodyType}}) => {
      const response = await axios.{{method}}<{{responseType}}>(`{{{formattedPath}}}`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['{{operationId}}'] });
    },
  });
};
  {{else}}
export const {{hookName}} = (data: {{requestBodyType}}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {{requestBodyType}}) => {
      const response = await axios.{{method}}<{{responseType}}>(`{{{formattedPath}}}`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['{{operationId}}'] });
    },
  });
};
  {{/if}}
{{/if}}
```

## Technology Stack Integration Guide

### React + React Query + Axios Setup

Make sure your project has these dependencies:

```bash
npm install react-query axios
# For TanStack Query V4
npm install @tanstack/react-query
```

Configure React Query in your app:

```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from 'react-query'; // or @tanstack/react-query

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
    </QueryClientProvider>
  );
}
```

### Working with Generated Types

The generated types are fully typed with JSDoc comments and support nested objects:

```typescript
// user.types.ts
export interface User {
  /** 用户ID */
  id: number;
  /** 用户名 */
  name: string;
  /** 邮箱地址 */
  email?: string | null;
  profile?: null | UserProfile;
  tags?: string[];
  status?: UserStatus;
}

export type UserStatus = 'active' | 'inactive' | 'suspended';
```

### Advanced Usage

You can also programmatically generate the SDK using the API:

```typescript
import { SwaggerDocGenerator } from 'jszy-swagger-doc-generator';

const generator = new SwaggerDocGenerator();

// From URL
const swaggerDoc = await generator.fetchSwaggerJSON('https://api.example.com/swagger.json');

// Or from local file
const swaggerDoc = generator.loadSwaggerFromFile('./swagger.json');

// Generate with Handlebars templates
const hooksByTag = generator.generateHandlebarsResources(swaggerDoc, {
  hooks: './templates/hooks/react-hook.hbs',
  types: './templates/types/type-definition.hbs'
});

// Save to files
generator.saveHooksByTag(hooksByTag, './src/api/generated');
```

## Best Practices

### 1. Organize by API Tags
Use meaningful tags in your OpenAPI specification to organize endpoints logically:
```yaml
paths:
  /users/{id}:
    get:
      tags:
        - User
      # ...
  /products/{id}:
    get:
      tags:
        - Product
      # ...
```

### 2. Leverage React Query Caching
The generated hooks use React Query which provides automatic caching, deduplication, and cache invalidation:

```typescript
// Two components using the same hook will share cached data
const UsersList = () => {
  const { data } = useGetUsers(); // Cache key: ['getUsers']
  return <>{/* ... */}</>;
};

const Stats = () => {
  const { data } = useGetUsers(); // Same cache key: ['getUsers'] - shared data!
  return <>{/* ... */}</>;
};
```

### 3. Use TypeScript Strictly
Leverage the generated types for complete type safety:

```typescript
// Fully typed parameters and return values
const { mutate } = useUpdateUser();
mutate({
  id: 123,
  name: 'John',
  email: 'john@example.com'
} as UserUpdate); // Ensures correct type
```

## Troubleshooting

### Common Issues

1. **Template not found errors**: Make sure template files exist at the expected paths
2. **Missing types**: Ensure your OpenAPI spec defines all referenced schemas
3. **Parameter mapping**: Check path parameter names match between URL and parameters

### Error Handling

The generated hooks follow React Query patterns for error handling:

```typescript
const { data, isLoading, error, isError } = useGetUsers();

if (isLoading) return <Spinner />;
if (isError) return <ErrorMessage error={error} />;

return <UserList users={data} />;
```

## Contributing

Feel free to submit issues or pull requests on the GitHub repository.

## License

MIT