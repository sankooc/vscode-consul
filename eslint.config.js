const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = {
  files: ['src/**/*.ts'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 6,
      sourceType: 'module'
    }
  },
  plugins: {
    '@typescript-eslint': tsPlugin
  },
  rules: {
    'semi': 'warn',
    'curly': 'warn',
    'eqeqeq': 'warn'
  }
};
