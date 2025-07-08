// Mock fs-extra module first
jest.mock('fs-extra', () => ({
  ensureDirSync: jest.fn(),
  appendFileSync: jest.fn(),
  existsSync: jest.fn(() => false),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => '{}'),
}));

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ choice: 'exit' }),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn(text => text),
  green: jest.fn(text => text),
  blue: jest.fn(text => text),
  yellow: jest.fn(text => text),
  cyan: jest.fn(text => text),
  gray: jest.fn(text => text),
  white: jest.fn(text => text),
}));

// Mock figlet
jest.mock('figlet', () => ({
  textSync: jest.fn(() => 'CERBERUS'),
}));

const { withBackOption } = require('../../src/cli/index');

describe('CLI Interface', () => {
  test('withBackOption should add back option to choices', () => {
    const choices = [
      { name: 'Option 1', value: 'opt1' },
      { name: 'Option 2', value: 'opt2' },
    ];

    const withBack = withBackOption(choices);

    expect(withBack).toHaveLength(3);
    expect(withBack[2].value).toBe('back');
    expect(withBack[2].name).toBe('Go back');
    // Original choices should remain unchanged
    expect(withBack[0]).toBe(choices[0]);
    expect(withBack[1]).toBe(choices[1]);
  });
});
