const Project = require('../../src/models/Project');
const fileSystem = require('../../src/utils/fileSystem');
const config = require('../../src/utils/config');

jest.mock('../../src/utils/fileSystem');
jest.mock('../../src/utils/config');

describe('Project Model', () => {
  let project;
  const testName = 'test-project';

  beforeEach(() => {
    jest.clearAllMocks();
    config.getDataPath.mockReturnValue('/data');
    config.getCachePathForType.mockReturnValue('/cache/projects');
    project = new Project(testName);
  });

  describe('constructor', () => {
    it('should create a project with valid name', () => {
      expect(project.name).toBe(testName);
      expect(project.files).toEqual([]);
      expect(project.sourceDirectories).toEqual([]);
      expect(project.directoryStructure).toBe('');
      expect(project.instructions).toBe('');
      expect(project.lastUpdated).toBeDefined();
    });

    it('should create project with provided data', () => {
      const data = {
        files: ['file1.js'],
        sourceDirectories: ['/src'],
        directoryStructure: 'test structure',
        instructions: 'test instructions'
      };
      const projectWithData = new Project(testName, data);
      
      expect(projectWithData.files).toEqual(['file1.js']);
      expect(projectWithData.sourceDirectories).toEqual(['/src']);
      expect(projectWithData.directoryStructure).toBe('test structure');
      expect(projectWithData.instructions).toBe('test instructions');
    });
  });

  describe('getProjectPath', () => {
    it('should return correct project path', () => {
      const result = project.getProjectPath();
      
      expect(result).toBe('/data/projects/test-project');
    });
  });

  describe('getAnalysisPath', () => {
    it('should return correct analysis path', () => {
      const result = project.getAnalysisPath();
      
      expect(result).toBe('/data/projects/test-project/analysis.txt');
    });
  });

  describe('getStructurePath', () => {
    it('should return correct structure path', () => {
      const result = project.getStructurePath();
      
      expect(result).toBe('/data/projects/test-project/structure.txt');
    });
  });

  describe('addFiles', () => {
    it('should add files to project', () => {
      const files = [
        { name: 'file1.js', path: '/src/file1.js' },
        { name: 'file2.js', path: '/src/file2.js' }
      ];
      
      project.addFiles(files);
      
      expect(project.files).toEqual(files);
    });

    it('should append files to existing files', () => {
      project.files = [{ name: 'existing.js', path: '/existing.js' }];
      const newFiles = [{ name: 'new.js', path: '/new.js' }];
      
      project.addFiles(newFiles);
      
      expect(project.files).toHaveLength(2);
      expect(project.files[1]).toEqual({ name: 'new.js', path: '/new.js' });
    });
  });

  describe('addSourceDirectory', () => {
    it('should add source directory', () => {
      const directory = '/src/components';
      
      project.addSourceDirectory(directory);
      
      expect(project.sourceDirectories).toContain(directory);
    });

    it('should not add duplicate directories', () => {
      const directory = '/src/components';
      
      project.addSourceDirectory(directory);
      project.addSourceDirectory(directory);
      
      expect(project.sourceDirectories).toEqual([directory]);
    });
  });

  describe('setDirectoryStructure', () => {
    it('should set directory structure', () => {
      const structure = 'src/\n  components/\n  utils/';
      
      project.setDirectoryStructure(structure);
      
      expect(project.directoryStructure).toBe(structure);
    });
  });

  describe('setInstructions', () => {
    it('should set instructions', () => {
      const instructions = 'This is a test project';
      
      project.setInstructions(instructions);
      
      expect(project.instructions).toBe(instructions);
    });
  });

  describe('saveToStorage', () => {
    it('should save project with files', async () => {
      project.files = [
        {
          fullOriginalPath: '/src/components/Button.js',
          newPath: 'src_components_Button.js'
        },
        {
          fullOriginalPath: '/src/utils/helper.js',
          newPath: 'src_utils_helper.js'
        }
      ];
      project.instructions = 'Test instructions';
      
      fileSystem.writeFile.mockResolvedValue(undefined);
      fileSystem.ensureDir.mockResolvedValue(undefined);
      fileSystem.saveToJson.mockResolvedValue(undefined);
      
      await project.saveToStorage();
      
      expect(fileSystem.writeFile).toHaveBeenCalledWith(
        '/data/projects/test-project/structure.txt',
        expect.stringContaining('Project: test-project')
      );
      expect(fileSystem.writeFile).toHaveBeenCalledWith(
        '/data/projects/test-project/analysis.txt',
        'Test instructions'
      );
    });

    it('should handle project with no files', async () => {
      project.files = [];
      
      fileSystem.writeFile.mockResolvedValue(undefined);
      fileSystem.ensureDir.mockResolvedValue(undefined);
      fileSystem.saveToJson.mockResolvedValue(undefined);
      
      await project.saveToStorage();
      
      expect(fileSystem.writeFile).toHaveBeenCalledWith(
        '/data/projects/test-project/structure.txt',
        expect.stringContaining('No files with path information available')
      );
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      project.files = ['file1.js'];
      project.sourceDirectories = ['/src'];
      project.directoryStructure = 'structure';
      project.instructions = 'instructions';
      
      const json = project.toJSON();
      
      expect(json).toEqual(expect.objectContaining({
        name: testName,
        files: ['file1.js'],
        sourceDirectories: ['/src'],
        directoryStructure: 'structure',
        instructions: 'instructions'
      }));
    });
  });

  describe('static create', () => {
    it('should create new project', async () => {
      fileSystem.ensureDir.mockResolvedValue(undefined);
      fileSystem.writeFile.mockResolvedValue(undefined);
      fileSystem.saveToJson.mockResolvedValue(undefined);
      
      const createdProject = await Project.create(testName);
      
      expect(createdProject).toBeInstanceOf(Project);
      expect(createdProject.name).toBe(testName);
      expect(fileSystem.ensureDir).toHaveBeenCalledWith('/data/projects/test-project');
    });
  });
});