const validationHelper = require('../../src/utils/validationHelper');
const fs = require('fs-extra');
const path = require('path');

jest.mock('fs-extra');

describe('Validation Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProjectName', () => {
    it('should return true for valid project names', () => {
      expect(validationHelper.validateProjectName('my-project')).toBe(true);
      expect(validationHelper.validateProjectName('project123')).toBe(true);
      expect(validationHelper.validateProjectName('my_project')).toBe(true);
      expect(validationHelper.validateProjectName('PROJECT')).toBe(true);
      expect(validationHelper.validateProjectName('project with spaces')).toBe(true);
    });

    it('should return error message for invalid project names', () => {
      expect(validationHelper.validateProjectName('')).toBe('Project name cannot be empty');
      expect(validationHelper.validateProjectName(null)).toBe('Project name cannot be empty');
      expect(validationHelper.validateProjectName(undefined)).toBe('Project name cannot be empty');
      expect(validationHelper.validateProjectName('project/with/slashes')).toBe('Project name contains invalid characters');
      expect(validationHelper.validateProjectName('project\\with\\backslashes')).toBe('Project name contains invalid characters');
      expect(validationHelper.validateProjectName('project:with:colons')).toBe('Project name contains invalid characters');
      expect(validationHelper.validateProjectName('project*with*asterisks')).toBe('Project name contains invalid characters');
      expect(validationHelper.validateProjectName('project?with?questions')).toBe('Project name contains invalid characters');
      expect(validationHelper.validateProjectName('project"with"quotes')).toBe('Project name contains invalid characters');
      expect(validationHelper.validateProjectName('project<with>brackets')).toBe('Project name contains invalid characters');
      expect(validationHelper.validateProjectName('project|with|pipes')).toBe('Project name contains invalid characters');
    });
  });

  describe('validatePath', () => {
    it('should return true for valid file paths', async () => {
      const validPath = '/path/to/file.js';
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      
      const result = await validationHelper.validatePath(validPath);
      
      expect(result).toBe(true);
      expect(fs.stat).toHaveBeenCalledWith(validPath);
    });

    it('should return error message for non-existent paths', async () => {
      const invalidPath = '/path/to/nonexistent.js';
      fs.stat.mockRejectedValue(new Error('ENOENT: no such file'));
      
      const result = await validationHelper.validatePath(invalidPath);
      
      expect(result).toBe('Path does not exist or is not accessible');
    });

    it('should return true for directories when not requiring directory', async () => {
      const dirPath = '/path/to/directory';
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      
      const result = await validationHelper.validatePath(dirPath);
      
      expect(result).toBe(true);
    });

    it('should return error message when requiring directory but path is file', async () => {
      const filePath = '/path/to/file.js';
      fs.stat.mockResolvedValue({ isDirectory: () => false });
      
      const result = await validationHelper.validatePath(filePath, true);
      
      expect(result).toBe('Path must be a directory');
    });

    it('should return error message for empty path', async () => {
      const result = await validationHelper.validatePath('');
      
      expect(result).toBe('Path cannot be empty');
    });
  });

  describe('validateNotEmpty', () => {
    it('should return true for non-empty strings', () => {
      expect(validationHelper.validateNotEmpty('hello')).toBe(true);
      expect(validationHelper.validateNotEmpty('123')).toBe(true);
      expect(validationHelper.validateNotEmpty('   text   ')).toBe(true);
    });

    it('should return default error message for empty strings', () => {
      expect(validationHelper.validateNotEmpty('')).toBe('Input cannot be empty');
      expect(validationHelper.validateNotEmpty('   ')).toBe('Input cannot be empty');
      expect(validationHelper.validateNotEmpty(null)).toBe('Input cannot be empty');
      expect(validationHelper.validateNotEmpty(undefined)).toBe('Input cannot be empty');
    });

    it('should return custom error message when provided', () => {
      expect(validationHelper.validateNotEmpty('', 'Custom error')).toBe('Custom error');
    });
  });

  describe('validateFileExtensions', () => {
    it('should return true for valid extension lists', () => {
      expect(validationHelper.validateFileExtensions('.js')).toBe(true);
      expect(validationHelper.validateFileExtensions('.js,.ts,.jsx')).toBe(true);
      expect(validationHelper.validateFileExtensions('.py, .java, .cpp')).toBe(true);
    });

    it('should return error message for invalid extensions', () => {
      expect(validationHelper.validateFileExtensions('')).toBe('Please enter at least one extension');
      expect(validationHelper.validateFileExtensions('js,ts')).toBe('Each extension must start with a dot (.)');
      expect(validationHelper.validateFileExtensions('.js,ts')).toBe('Each extension must start with a dot (.)');
    });
  });

  describe('validateNumber', () => {
    it('should return true for valid numbers', () => {
      expect(validationHelper.validateNumber('123')).toBe(true);
      expect(validationHelper.validateNumber(456)).toBe(true);
      expect(validationHelper.validateNumber('3.14')).toBe(true);
      expect(validationHelper.validateNumber('-5')).toBe(true);
    });

    it('should return error message for invalid numbers', () => {
      expect(validationHelper.validateNumber('abc')).toBe('Input must be a valid number');
      expect(validationHelper.validateNumber('123abc')).toBe('Input must be a valid number');
    });

    it('should handle empty string as zero', () => {
      expect(validationHelper.validateNumber('')).toBe(true);
    });

    it('should validate minimum constraints', () => {
      expect(validationHelper.validateNumber('10', 5)).toBe(true);
      expect(validationHelper.validateNumber('3', 5)).toBe('Number must be at least 5');
    });

    it('should validate maximum constraints', () => {
      expect(validationHelper.validateNumber('8', null, 10)).toBe(true);
      expect(validationHelper.validateNumber('15', null, 10)).toBe('Number must be at most 10');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      fs.access.mockResolvedValue(undefined);
      
      const result = await validationHelper.fileExists('/path/to/file.js');
      
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith('/path/to/file.js', fs.constants.F_OK);
    });

    it('should return false when file does not exist', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));
      
      const result = await validationHelper.fileExists('/path/to/nonexistent.js');
      
      expect(result).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should return true for valid URLs', () => {
      expect(validationHelper.validateUrl('https://example.com')).toBe(true);
      expect(validationHelper.validateUrl('http://example.com')).toBe(true);
      expect(validationHelper.validateUrl('https://example.com/path')).toBe(true);
      expect(validationHelper.validateUrl('https://example.com:8080/path?query=value')).toBe(true);
    });

    it('should return error message for invalid URLs', () => {
      expect(validationHelper.validateUrl('invalid-url')).toBe('Invalid URL format');
      expect(validationHelper.validateUrl('example.com')).toBe('Invalid URL format');
      expect(validationHelper.validateUrl('')).toBe('URL cannot be empty');
      expect(validationHelper.validateUrl(null)).toBe('URL cannot be empty');
      expect(validationHelper.validateUrl(undefined)).toBe('URL cannot be empty');
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API keys', () => {
      expect(validationHelper.validateApiKey('sk-1234567890abcdef')).toBe(true);
      expect(validationHelper.validateApiKey('api_key_123456789')).toBe(true);
      expect(validationHelper.validateApiKey('0123456789abcdef0123456789abcdef')).toBe(true);
    });

    it('should return error message for invalid API keys', () => {
      expect(validationHelper.validateApiKey('')).toBe('API key cannot be empty');
      expect(validationHelper.validateApiKey(null)).toBe('API key cannot be empty');
      expect(validationHelper.validateApiKey(undefined)).toBe('API key cannot be empty');
    });
  });

  describe('validateMergeRequestUrl', () => {
    it('should return true for valid merge request URLs', () => {
      expect(validationHelper.validateMergeRequestUrl('https://gitlab.com/project/-/merge_requests/123')).toBe(true);
      expect(validationHelper.validateMergeRequestUrl('https://gitlab.example.com/group/project/-/merge_requests/456')).toBe(true);
    });

    it('should return error message for invalid merge request URLs', () => {
      expect(validationHelper.validateMergeRequestUrl('https://gitlab.com/project')).toBe('Invalid GitLab merge request URL. Format: https://gitlab.com/path/to/project/-/merge_requests/ID');
      expect(validationHelper.validateMergeRequestUrl('invalid-url')).toBe('Invalid URL format');
      expect(validationHelper.validateMergeRequestUrl('')).toBe('URL cannot be empty');
    });
  });

  describe('validateWritablePath', () => {
    it('should return true for writable existing paths', async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.access.mockResolvedValue(undefined);
      
      const result = await validationHelper.validateWritablePath('/path/to/directory');
      
      expect(result).toBe(true);
    });

    it('should attempt to create directory for non-existent paths', async () => {
      fs.stat.mockRejectedValue(new Error('ENOENT'));
      fs.ensureDir.mockResolvedValue(undefined);
      
      const result = await validationHelper.validateWritablePath('/path/to/new/directory');
      
      expect(result).toBe(true);
      expect(fs.ensureDir).toHaveBeenCalledWith('/path/to/new');
    });

    it('should return error message when cannot create directory', async () => {
      fs.stat.mockRejectedValue(new Error('ENOENT'));
      fs.ensureDir.mockRejectedValue(new Error('Permission denied'));
      
      const result = await validationHelper.validateWritablePath('/path/to/directory');
      
      expect(result).toBe('Cannot create directory: Permission denied');
    });
  });
});