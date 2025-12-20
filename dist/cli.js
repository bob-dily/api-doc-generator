#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const fs = __importStar(require("fs"));
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
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
    describe: 'Output path for the generated documentation (default: ./generated/docs/api-documentation.md)',
    type: 'string',
    default: './generated/docs/api-documentation.md'
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
    describe: 'Output directory for TypeScript types (default: ./generated/types)',
    type: 'string',
    default: './generated/types'
})
    .option('hooks-output', {
    describe: 'Output directory for React hooks (default: ./generated/hooks)',
    type: 'string',
    default: './generated/hooks'
})
    .option('handlebars-templates', {
    describe: 'Use Handlebars templates for generation',
    type: 'boolean',
    default: false
})
    .option('hooks-template', {
    describe: 'Path to custom hooks template (default: templates/hooks/react-hook.hbs)',
    type: 'string',
    default: './templates/hooks/react-hook.hbs'
})
    .option('types-template', {
    describe: 'Path to custom types template (default: templates/types/type-definition.hbs)',
    type: 'string',
    default: './templates/types/type-definition.hbs'
})
    .check((argv) => {
    if (!argv.url && !argv.input) {
        throw new Error('Either --url or --input must be provided');
    }
    if (argv.url && argv.input) {
        throw new Error('Only one of --url or --input can be provided');
    }
    // Only set defaults if user hasn't explicitly specified either flag
    // We'll use the fact that if user explicitly sets a flag, yargs will have it as not the default
    // By default, both --generate-types and --generate-hooks are false
    if (!argv.generateHooks && !argv.generateTypes) {
        // Both are false (their default), so we'll generate both as a convenience
        argv.generateHooks = true;
        argv.generateTypes = true;
    }
    return true;
})
    .help()
    .parseSync();
async function run() {
    try {
        // Clean the entire generated directory before doing anything
        const generatedDir = './generated';
        if (fs.existsSync(generatedDir)) {
            fs.rmSync(generatedDir, { recursive: true, force: true });
            console.log(`Cleared generated directory: ${generatedDir}`);
        }
        const generator = new index_1.SwaggerDocGenerator();
        let swaggerDoc;
        if (argv.url) {
            console.log(`Fetching Swagger JSON from: ${argv.url}`);
            swaggerDoc = await generator.fetchSwaggerJSON(argv.url);
        }
        else if (argv.input) {
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
            // Create the generated directory if it doesn't exist
            if (!fs.existsSync(generatedDir)) {
                fs.mkdirSync(generatedDir, { recursive: true });
            }
            console.log('Generating TypeScript type definitions...');
            const types = generator.generateTypeDefinitions(swaggerDoc);
            const typesOutputPath = argv.typesOutput.endsWith('.ts') ? argv.typesOutput :
                `${argv.typesOutput}/${swaggerDoc.info.title.replace(/\s+/g, '_')}_types.ts`;
            generator.saveTypesToFile(types, typesOutputPath);
            console.log(`Type definitions generated successfully at: ${typesOutputPath}`);
        }
        // Check if we need to generate hooks
        if (argv.generateHooks) {
            // Create the generated directory if it doesn't exist
            if (!fs.existsSync(generatedDir)) {
                fs.mkdirSync(generatedDir, { recursive: true });
            }
            console.log('Generating React hooks...');
            let hooksByTag;
            if (argv.handlebarsTemplates) {
                console.log('Using Handlebars templates for generation...');
                hooksByTag = generator.generateHandlebarsResources(swaggerDoc, {
                    hooks: argv.hooksTemplate,
                    types: argv.typesTemplate
                });
            }
            else {
                hooksByTag = generator.generateReactHooks(swaggerDoc);
            }
            generator.saveHooksByTag(hooksByTag, argv.hooksOutput);
            console.log(`React hooks and types generated successfully in: ${argv.hooksOutput}/`);
        }
        // Generate documentation if not generating types or hooks (for backward compatibility)
        if (!argv.generateTypes && !argv.generateHooks) {
            // Create the generated directory if it doesn't exist
            if (!fs.existsSync(generatedDir)) {
                fs.mkdirSync(generatedDir, { recursive: true });
            }
            console.log('Generating documentation...');
            const documentation = generator.generateDocumentation(swaggerDoc);
            generator.saveDocumentationToFile(documentation, argv.output);
            console.log(`Documentation generated successfully at: ${argv.output}`);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error:', error.message);
        }
        else {
            console.error('Error:', String(error));
        }
        process.exit(1);
    }
}
// Run the CLI
run();
//# sourceMappingURL=cli.js.map