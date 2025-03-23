const { withBackOption } = require('../../src/cli/index');

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ choice: 'exit' }),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn(text => text),
}));

// Mock figlet
jest.mock('figlet', () => ({
  textSync: jest.fn(() => 'CERBERUS'),
}));

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