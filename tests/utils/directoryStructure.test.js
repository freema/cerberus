// Mock path module
jest.mock('path', () => ({
  basename: jest.fn((filePath) => filePath.split('/').pop()),
  extname: jest.fn((filePath) => {
    const parts = filePath.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
}));

const { generateDirectoryStructure } = require('../../src/utils/directoryStructure');

describe('DirectoryStructure Utility', () => {
  const mockFiles = [
    {
      originalPath: 'src/components/Button.jsx',
      fullOriginalPath: '/project/src/components/Button.jsx',
      newPath: 'src_components_Button.jsx',
      originalDirectory: '/project/src/components'
    },
    {
      originalPath: 'src/utils/helper.js',
      fullOriginalPath: '/project/src/utils/helper.js', 
      newPath: 'src_utils_helper.js',
      originalDirectory: '/project/src/utils'
    },
    {
      originalPath: 'package.json',
      fullOriginalPath: '/project/package.json',
      newPath: 'package.json',
      originalDirectory: '/project'
    }
  ];

  test('should generate directory structure with all sections', () => {
    const result = generateDirectoryStructure(mockFiles);
    
    expect(result).toContain('# Project Structure and File Mapping');
    expect(result).toContain('## Original Directory Structure');
    expect(result).toContain('## Project Files (Flattened Structure)');
    expect(result).toContain('## File Mapping');
    expect(result).toContain('## Path Reference for Claude AI');
    expect(result).toContain('## File Statistics');
  });

  test('should include file mappings', () => {
    const result = generateDirectoryStructure(mockFiles);
    
    expect(result).toContain('`/project/src/components/Button.jsx` → `src_components_Button.jsx`');
    expect(result).toContain('`/project/src/utils/helper.js` → `src_utils_helper.js`');
    expect(result).toContain('`/project/package.json` → `package.json`');
  });

  test('should include AI reference section', () => {
    const result = generateDirectoryStructure(mockFiles);
    
    expect(result).toContain('IMPORTANT: When referring to files in your responses');
    expect(result).toContain('src/components/Button.jsx -> src_components_Button.jsx');
    expect(result).toContain('src/utils/helper.js -> src_utils_helper.js');
  });

  test('should count file statistics correctly', () => {
    const result = generateDirectoryStructure(mockFiles);
    
    expect(result).toContain('Total files: 3');
    expect(result).toContain('.jsx: 1');
    expect(result).toContain('.js: 1');
    expect(result).toContain('.json: 1');
  });

  test('should handle empty files array', () => {
    const result = generateDirectoryStructure([]);
    
    expect(result).toContain('# Project Structure and File Mapping');
    expect(result).toContain('Total files: 0');
  });

  test('should group files by original directory', () => {
    const result = generateDirectoryStructure(mockFiles);
    
    expect(result).toContain('/project/src/components');
    expect(result).toContain('/project/src/utils');
    expect(result).toContain('/project');
  });

  test('should handle files without originalDirectory gracefully', () => {
    const filesWithoutDir = [
      {
        originalPath: 'src/test.js',
        fullOriginalPath: '/project/src/test.js',
        newPath: 'src_test.js'
        // No originalDirectory property
      }
    ];
    
    const result = generateDirectoryStructure(filesWithoutDir);
    expect(result).toContain('Total files: 1');
    expect(result).toContain('.js: 1');
  });
});