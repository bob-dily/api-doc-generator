import * as fs from 'fs';
import * as Handlebars from 'handlebars';

// Register helpers when module loads
(function() {
  // Helper to convert to camelCase
  Handlebars.registerHelper('camelCase', function(str: any) {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  });

  // Helper to convert to PascalCase
  Handlebars.registerHelper('pascalCase', function(str: any) {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toUpperCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  });

  // Helper to check if array has elements
  Handlebars.registerHelper('hasElements', function(arr: any[]) {
    return arr && arr.length > 0;
  });

  // Helper for conditional rendering
  Handlebars.registerHelper('ifCond', function (this: any, v1: any, operator: string, v2: any, options: any) {
    switch (operator) {
      case '==':
        return v1 == v2 ? options.fn(this) : options.inverse(this);
      case '===':
        return v1 === v2 ? options.fn(this) : options.inverse(this);
      case '<':
        return v1 < v2 ? options.fn(this) : options.inverse(this);
      case '<=':
        return v1 <= v2 ? options.fn(this) : options.inverse(this);
      case '>':
        return v1 > v2 ? options.fn(this) : options.inverse(this);
      case '>=':
        return v1 >= v2 ? options.fn(this) : options.inverse(this);
      case '&&':
        return v1 && v2 ? options.fn(this) : options.inverse(this);
      case '||':
        return v1 || v2 ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  });
})();

/**
 * Compiles and renders a Handlebars template
 */
export function compileTemplate(templatePath: string, context: any): string {
  try {
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    return template(context);
  } catch (error) {
    console.error(`Error compiling template ${templatePath}:`, error);
    throw error;
  }
}