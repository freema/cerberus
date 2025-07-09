// Mock all the utility modules
jest.mock('../../src/utils/logger', () => ({ mock: 'logger' }));
jest.mock('../../src/utils/config', () => ({ mock: 'config' }));
jest.mock('../../src/utils/uiHelper', () => ({ mock: 'uiHelper' }));
jest.mock('../../src/utils/pathHelper', () => ({ mock: 'pathHelper' }));
jest.mock('../../src/utils/projectHelper', () => ({ mock: 'projectHelper' }));
jest.mock('../../src/utils/clipboard', () => ({ mock: 'clipboard' }));
jest.mock('../../src/utils/validationHelper', () => ({ mock: 'validationHelper' }));
jest.mock('../../src/utils/fileSystem', () => ({ mock: 'fileSystem' }));
jest.mock('../../src/utils/directoryStructure', () => ({ mock: 'directoryStructure' }));
jest.mock('../../src/utils/terminal', () => ({ mock: 'terminal' }));
jest.mock('../../src/utils/i18n', () => ({ mock: 'i18n' }));
jest.mock('../../src/utils/encryption', () => ({ mock: 'encryption' }));
jest.mock('../../src/utils/bundleCreator', () => ({ mock: 'bundleCreator' }));
jest.mock('../../src/utils/ApiConfigService', () => ({ mock: 'ApiConfigService' }));
jest.mock('../../src/utils/simpleConfig', () => ({ mock: 'simpleConfig' }));

const utils = require('../../src/utils/index');

describe('Utils Index', () => {
  test('should export all utility modules', () => {
    expect(utils).toHaveProperty('logger');
    expect(utils).toHaveProperty('config');
    expect(utils).toHaveProperty('ui');
    expect(utils).toHaveProperty('paths');
    expect(utils).toHaveProperty('projectHelper');
    expect(utils).toHaveProperty('clipboard');
    expect(utils).toHaveProperty('validation');
    expect(utils).toHaveProperty('fileSystem');
    expect(utils).toHaveProperty('directoryStructure');
    expect(utils).toHaveProperty('terminal');
    expect(utils).toHaveProperty('i18n');
    expect(utils).toHaveProperty('encryption');
    expect(utils).toHaveProperty('bundleCreator');
    expect(utils).toHaveProperty('ApiConfigService');
    expect(utils).toHaveProperty('simpleConfig');
  });

  test('should have correct module mappings', () => {
    expect(utils.logger).toEqual({ mock: 'logger' });
    expect(utils.config).toEqual({ mock: 'config' });
    expect(utils.ui).toEqual({ mock: 'uiHelper' });
    expect(utils.paths).toEqual({ mock: 'pathHelper' });
    expect(utils.projectHelper).toEqual({ mock: 'projectHelper' });
    expect(utils.clipboard).toEqual({ mock: 'clipboard' });
    expect(utils.validation).toEqual({ mock: 'validationHelper' });
    expect(utils.fileSystem).toEqual({ mock: 'fileSystem' });
    expect(utils.directoryStructure).toEqual({ mock: 'directoryStructure' });
    expect(utils.terminal).toEqual({ mock: 'terminal' });
    expect(utils.i18n).toEqual({ mock: 'i18n' });
    expect(utils.encryption).toEqual({ mock: 'encryption' });
    expect(utils.bundleCreator).toEqual({ mock: 'bundleCreator' });
    expect(utils.ApiConfigService).toEqual({ mock: 'ApiConfigService' });
    expect(utils.simpleConfig).toEqual({ mock: 'simpleConfig' });
  });

  test('should export exactly 15 modules', () => {
    const exportedKeys = Object.keys(utils);
    expect(exportedKeys).toHaveLength(15);
  });
});