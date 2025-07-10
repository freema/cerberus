module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'plugin:node/recommended', 'plugin:jest/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 2022,
  },
  rules: {
    // Disable problematic rules for production
    'no-unused-vars': 'off',
    'no-case-declarations': 'off', 
    'no-process-exit': 'off',
    'no-constant-condition': 'off',
    'no-useless-escape': 'off',
    'no-inner-declarations': 'off',
    
    // Node.js rules
    'node/exports-style': ['error', 'module.exports'],
    'node/file-extension-in-import': ['error', 'always'],
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/console': ['error', 'always'],
    'node/prefer-global/process': ['error', 'always'],
    'node/prefer-global/url-search-params': ['error', 'always'],
    'node/prefer-global/url': ['error', 'always'],
    'node/prefer-promises/dns': 'error',
    'node/prefer-promises/fs': 'error',
    'node/no-unsupported-features/es-syntax': [
      'error',
      {
        version: '>=16.0.0',
        ignores: [],
      },
    ],
    'node/no-unpublished-require': 'off', // Allow unpublished requires for local files
  },
};
