#!/usr/bin/env node

import { SwaggerDocGenerator, SwaggerDoc } from './index';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .option('url', {
    alias: 'u',
    describe: 'URL to the Swagger JSON file',
    type: 'string'
  })
  .option('input', {
    alias: 'i',
    describe: 'Path to the local Swagger JSON file',
    type: 'string'
  })
  .option('output', {
    alias: 'o',
    describe: 'Output path for the generated documentation (default: ./docs/api-documentation.md)',
    type: 'string',
    default: './docs/api-documentation.md'
  })
  .option('generate-types', {
    describe: 'Generate TypeScript type definitions',
    type: 'boolean',
    default: false
  })
  .option('generate-hooks', {
    describe: 'Generate React hooks',
    type: 'boolean',
    default: false
  })
  .option('types-output', {
    describe: 'Output directory for TypeScript types (default: ./types)',
    type: 'string',
    default: './types'
  })
  .option('hooks-output', {
    describe: 'Output directory for React hooks (default: ./hooks)',
    type: 'string',
    default: './hooks'
  })
  .check((argv) => {
    if (!argv.url && !argv.input) {
      throw new Error('Either --url or --input must be provided');
    }
    if (argv.url && argv.input) {
      throw new Error('Only one of --url or --input can be provided');
    }
    return true;
  })
  .help()
  .parseSync();

async function run(): Promise<void> {
  try {
    const generator = new SwaggerDocGenerator();
    let swaggerDoc: SwaggerDoc | undefined;

    if (argv.url) {
      console.log(`Fetching Swagger JSON from: ${argv.url}`);
      swaggerDoc = await generator.fetchSwaggerJSON(argv.url);
    } else if (argv.input) {
      console.log(`Loading Swagger JSON from: ${argv.input}`);
      if (!fs.existsSync(argv.input)) {
        throw new Error(`Input file does not exist: ${argv.input}`);
      }
      swaggerDoc = generator.loadSwaggerFromFile(argv.input);
    }

    // This shouldn't happen due to the validation check, but TypeScript doesn't know that
    if (!swaggerDoc) {
      throw new Error('No swagger document loaded');
    }

    // Check if we need to generate types
    if (argv.generateTypes) {
      console.log('Generating TypeScript type definitions...');
      const types = generator.generateTypeDefinitions(swaggerDoc);
      const typesOutputPath = argv.typesOutput.endsWith('.ts') ? argv.typesOutput :
                              `${argv.typesOutput}/${swaggerDoc.info.title.replace(/\s+/g, '_')}_types.ts`;
      generator.saveTypesToFile(types, typesOutputPath);
      console.log(`Type definitions generated successfully at: ${typesOutputPath}`);
    }

    // Check if we need to generate hooks
    if (argv.generateHooks) {
      console.log('Generating React hooks...');
      const hooksByTag = generator.generateReactHooks(swaggerDoc);
      generator.saveHooksByTag(hooksByTag, argv.hooksOutput);
      console.log(`React hooks generated successfully in: ${argv.hooksOutput}/`);
    }

    // Generate documentation if not generating types or hooks (for backward compatibility)
    if (!argv.generateTypes && !argv.generateHooks) {
      console.log('Generating documentation...');
      const documentation = generator.generateDocumentation(swaggerDoc);
      generator.saveDocumentationToFile(documentation, argv.output);
      console.log(`Documentation generated successfully at: ${argv.output}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', String(error));
    }
    process.exit(1);
  }
}

// Run the CLI
run();