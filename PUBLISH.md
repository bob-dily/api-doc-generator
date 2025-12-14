# Publish Instructions

To publish this package to npm, follow these steps:

1. Make sure you have an npm account and are logged in:
   ```bash
   npm login
   ```

2. Verify the package information in package.json is correct

3. Run the build to make sure everything compiles:
   ```bash
   pnpm run build
   ```

4. Run the tests to ensure everything works:
   ```bash
   pnpm test
   ```

5. Publish the package:
   ```bash
   npm publish
   ```

## Package Details

- Name: `swagger-doc-generator`
- Version: 1.0.0
- Description: A tool to generate frontend documentation from Swagger/OpenAPI JSON files
- Bin: `swagger-doc-generator` CLI command
- Main entry: `dist/index.js`
- Dependencies: `axios`, `yargs`
- License: MIT

## Verification

After publishing, you can verify the package works by installing it globally:

```bash
npm install -g swagger-doc-generator
swagger-doc-generator --help
```