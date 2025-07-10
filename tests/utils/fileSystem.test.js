const fileSystem = require('../../src/utils/fileSystem');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

jest.mock('fs-extra');
jest.mock('glob');

describe('FileSystem Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      const dirPath = '/path/to/directory';
      fs.ensureDir.mockResolvedValue(undefined);
      
      const result = await fileSystem.ensureDir(dirPath);
      
      expect(result).toBe(dirPath);
      expect(fs.ensureDir).toHaveBeenCalledWith(dirPath);
    });

    it('should handle creation errors', async () => {
      const dirPath = '/path/to/directory';
      const error = new Error('Permission denied');
      fs.ensureDir.mockRejectedValue(error);
      
      await expect(fileSystem.ensureDir(dirPath)).rejects.toThrow('Permission denied');
    });
  });

  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      const filePath = '/path/to/file.json';
      const mockData = { key: 'value', number: 42 };
      fs.readJson.mockResolvedValue(mockData);
      
      const result = await fileSystem.readJson(filePath);
      
      expect(result).toEqual(mockData);
      expect(fs.readJson).toHaveBeenCalledWith(filePath);
    });

    it('should handle file not found', async () => {
      const filePath = '/path/to/nonexistent.json';
      fs.readJson.mockRejectedValue(new Error('ENOENT: no such file'));
      
      await expect(fileSystem.readJson(filePath)).rejects.toThrow('ENOENT: no such file');
    });
  });

  describe('saveToJson', () => {
    it('should write JSON data to file', async () => {
      const filePath = '/path/to/file.json';
      const data = { key: 'value', array: [1, 2, 3] };
      fs.ensureDir.mockResolvedValue(undefined);
      fs.writeJson.mockResolvedValue(undefined);
      
      const result = await fileSystem.saveToJson(filePath, data);
      
      expect(result).toBe(filePath);
      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(filePath));
      expect(fs.writeJson).toHaveBeenCalledWith(filePath, data, { spaces: 2 });
    });

    it('should handle write errors', async () => {
      const filePath = '/path/to/file.json';
      const data = { key: 'value' };
      const error = new Error('Permission denied');
      fs.ensureDir.mockResolvedValue(undefined);
      fs.writeJson.mockRejectedValue(error);
      
      await expect(fileSystem.saveToJson(filePath, data)).rejects.toThrow('Permission denied');
    });
  });

  describe('copyFile', () => {
    it('should copy file from source to destination', async () => {
      const sourcePath = '/source/file.js';
      const destPath = '/dest/file.js';
      fs.ensureDir.mockResolvedValue(undefined);
      fs.copy.mockResolvedValue(undefined);
      
      await fileSystem.copyFile(sourcePath, destPath);
      
      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(destPath));
      expect(fs.copy).toHaveBeenCalledWith(sourcePath, destPath);
    });

    it('should handle copy errors', async () => {
      const sourcePath = '/source/file.js';
      const destPath = '/dest/file.js';
      const error = new Error('Source file not found');
      fs.ensureDir.mockResolvedValue(undefined);
      fs.copy.mockRejectedValue(error);
      
      await expect(fileSystem.copyFile(sourcePath, destPath)).rejects.toThrow('Source file not found');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const filePath = '/path/to/file.js';
      fs.access.mockResolvedValue(undefined);
      
      const result = await fileSystem.fileExists(filePath);
      
      expect(result).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(filePath);
    });

    it('should return false when file does not exist', async () => {
      const filePath = '/path/to/nonexistent.js';
      fs.access.mockRejectedValue(new Error('ENOENT'));
      
      const result = await fileSystem.fileExists(filePath);
      
      expect(result).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read text file content', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'Hello, World!';
      fs.readFile.mockResolvedValue(content);
      
      const result = await fileSystem.readFile(filePath);
      
      expect(result).toBe(content);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
    });

    it('should handle read errors', async () => {
      const filePath = '/path/to/nonexistent.txt';
      const error = new Error('ENOENT: no such file');
      fs.readFile.mockRejectedValue(error);
      
      await expect(fileSystem.readFile(filePath)).rejects.toThrow('ENOENT: no such file');
    });
  });

  describe('writeFile', () => {
    it('should write text content to file', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'Hello, World!';
      fs.ensureDir.mockResolvedValue(undefined);
      fs.writeFile.mockResolvedValue(undefined);
      
      const result = await fileSystem.writeFile(filePath, content);
      
      expect(result).toBe(filePath);
      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(filePath));
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content, 'utf8');
    });

    it('should handle write errors', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'Hello, World!';
      const error = new Error('Permission denied');
      fs.ensureDir.mockResolvedValue(undefined);
      fs.writeFile.mockRejectedValue(error);
      
      await expect(fileSystem.writeFile(filePath, content)).rejects.toThrow('Permission denied');
    });
  });

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      const dirPath = '/path/to/directory';
      const fileList = ['file1.js', 'file2.js', 'file3.txt'];
      fs.ensureDir.mockResolvedValue(undefined);
      fs.readdir.mockResolvedValue(fileList);
      
      const result = await fileSystem.listFiles(dirPath);
      
      expect(result).toEqual(fileList);
      expect(fs.ensureDir).toHaveBeenCalledWith(dirPath);
      expect(fs.readdir).toHaveBeenCalledWith(dirPath);
    });

    it('should return empty array on error', async () => {
      const dirPath = '/path/to/directory';
      fs.ensureDir.mockResolvedValue(undefined);
      fs.readdir.mockRejectedValue(new Error('Permission denied'));
      
      const result = await fileSystem.listFiles(dirPath);
      
      expect(result).toEqual([]);
    });
  });

  describe('findFiles', () => {
    it('should find files matching pattern', async () => {
      const pattern = '**/*.js';
      const matchingFiles = ['src/file1.js', 'test/file2.js'];
      const options = { ignore: 'node_modules/**' };
      glob.glob.mockResolvedValue(matchingFiles);
      
      const result = await fileSystem.findFiles(pattern, options);
      
      expect(result).toEqual(matchingFiles);
      expect(glob.glob).toHaveBeenCalledWith(pattern, options);
    });

    it('should return empty array on error', async () => {
      const pattern = '**/*.js';
      glob.glob.mockRejectedValue(new Error('Pattern error'));
      
      const result = await fileSystem.findFiles(pattern);
      
      expect(result).toEqual([]);
    });
  });
});