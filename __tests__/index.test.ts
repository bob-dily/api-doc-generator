import { SwaggerDocGenerator, SwaggerDoc } from '../src/index';
import axios from 'axios';
import * as fs from 'fs';

// Mock swagger doc for testing
const mockSwaggerDoc: SwaggerDoc = {
  swagger: "2.0",
  info: {
    title: "Test API",
    version: "1.0.0",
    description: "A test API"
  },
  paths: {
    "/test": {
      get: {
        summary: "Get test",
        description: "Returns test data",
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// Create a mock for the fs module
jest.mock('fs');

describe('SwaggerDocGenerator', () => {
  let generator: SwaggerDocGenerator;

  beforeEach(() => {
    generator = new SwaggerDocGenerator();
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('fetchSwaggerJSON', () => {
    it('should fetch swagger JSON from a URL', async () => {
      const mockUrl = 'https://api.example.com/swagger.json';

      // Mock the axios response
      jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockSwaggerDoc });

      const result = await generator.fetchSwaggerJSON(mockUrl);

      expect(result).toEqual(mockSwaggerDoc);
      expect(axios.get).toHaveBeenCalledWith(mockUrl);
    });

    it('should handle errors when fetching swagger JSON', async () => {
      const mockUrl = 'https://api.example.com/invalid.json';

      // Mock the axios response to reject
      jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Network error'));

      await expect(generator.fetchSwaggerJSON(mockUrl)).rejects.toThrow(
        `Failed to fetch Swagger JSON from ${mockUrl}: Network error`
      );
    });
  });

  describe('loadSwaggerFromFile', () => {
    it('should load swagger JSON from a local file', () => {
      const mockFilePath = 'test-swagger.json';

      // Mock the file system
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSwaggerDoc));

      const result = generator.loadSwaggerFromFile(mockFilePath);

      expect(result).toEqual(mockSwaggerDoc);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, 'utf8');
    });

    it('should handle errors when loading swagger JSON from file', () => {
      const mockFilePath = 'nonexistent.json';

      // Mock the file system to throw an error
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => generator.loadSwaggerFromFile(mockFilePath)).toThrow(
        `Failed to load Swagger JSON from ${mockFilePath}: File not found`
      );
    });
  });

  describe('generateDocumentation', () => {
    it('should generate documentation from swagger doc', () => {
      const result = generator.generateDocumentation(mockSwaggerDoc);

      expect(result).toContain('# Test API');
      expect(result).toContain('A test API v1.0.0');
      expect(result).toContain('## API Endpoints');
      expect(result).toContain('### GET /test');
      expect(result).toContain('**Summary:** Get test');
      expect(result).toContain('**Description:** Returns test data');
      expect(result).toContain('**Responses:**');
      expect(result).toContain('- **200**: Successful response');
    });
  });

  describe('saveDocumentationToFile', () => {
    it('should save documentation to a file', () => {
      const mockDocumentation = '# Test Documentation';
      const mockOutputPath = './docs/test.md';

      // Mock the file system methods
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation();
      (fs.mkdirSync as jest.Mock).mockImplementation();

      generator.saveDocumentationToFile(mockDocumentation, mockOutputPath);

      expect(fs.existsSync).toHaveBeenCalledWith('./docs');
      expect(fs.writeFileSync).toHaveBeenCalledWith(mockOutputPath, mockDocumentation, 'utf8');
      expect(fs.mkdirSync).not.toHaveBeenCalled(); // Because directory exists
    });

    it('should create directory if it does not exist', () => {
      const mockDocumentation = '# Test Documentation';
      const mockOutputPath = './newdir/test.md';

      // Mock the file system methods
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation();
      (fs.mkdirSync as jest.Mock).mockImplementation();

      generator.saveDocumentationToFile(mockDocumentation, mockOutputPath);

      expect(fs.existsSync).toHaveBeenCalledWith('./newdir');
      expect(fs.mkdirSync).toHaveBeenCalledWith('./newdir', { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(mockOutputPath, mockDocumentation, 'utf8');
    });
  });
});